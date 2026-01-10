/**
 * RagService - Serviço de Busca Híbrida para RAG Jurídico
 * 
 * Encapsula:
 * - hybridSearch (busca exata + semântica)
 * - Hierarquia de autoridade (Vinculante > STF > STJ > FONAJE)
 * - Cache LRU para queries frequentes
 */

import { hybridSearch, hasExactReference } from "../_core/hybridSearch";
import { getDb } from "../db";
import { knowledgeBase, learnedTheses } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

// ============================================
// TIPOS
// ============================================

export interface SearchDocument {
    id: number;
    title: string;
    content: string;
    documentType?: string;
    embedding?: unknown;
}

export interface RagResult {
    id: number;
    title: string;
    content: string;
    similarity: number;
    documentType?: string;
    searchMethod: "exact" | "semantic" | "hybrid";
    authorityLevel: number; // 1 = mais alto (vinculante), 5 = mais baixo
}

export interface SearchOptions {
    limit?: number;
    minSimilarity?: number;
    filterTypes?: string[];
    userId?: number;
}

// ============================================
// HIERARQUIA DE AUTORIDADE
// ============================================

/**
 * Define a hierarquia de autoridade jurídica
 * Menor número = maior autoridade
 */
const AUTHORITY_HIERARCHY: Record<string, number> = {
    "sumula_vinculante": 1,    // STF Vinculante - máxima autoridade
    "sumula_stf": 2,           // STF comum
    "tema_repetitivo": 2,      // Recursos Repetitivos STJ
    "sumula_stj": 3,           // STJ
    "enunciado": 4,            // FONAJE/FOJESP
    "tese": 5,                 // Teses do gabinete
    "decisao_referencia": 5,   // Decisões de referência
    "minuta_modelo": 6,        // Minutas modelo
    "outro": 7,                // Outros documentos
};

function getAuthorityLevel(documentType?: string): number {
    if (!documentType) return 7;
    return AUTHORITY_HIERARCHY[documentType] ?? 7;
}

// ============================================
// CACHE LRU SIMPLES
// ============================================

interface CacheEntry {
    results: RagResult[];
    timestamp: number;
}

class LRUCache {
    private cache = new Map<string, CacheEntry>();
    private maxSize: number;
    private ttlMs: number;

    constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) { // 5 minutos TTL
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }

    get(key: string): RagResult[] | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Verificar TTL
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }

        // Move para o final (mais recente)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.results;
    }

    set(key: string, results: RagResult[]): void {
        // Remover entrada mais antiga se atingir limite
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }

        this.cache.set(key, { results, timestamp: Date.now() });
    }

    invalidate(): void {
        this.cache.clear();
        console.log("[RagService] Cache invalidado");
    }
}

// Instância global do cache
const queryCache = new LRUCache();

// ============================================
// RAG SERVICE
// ============================================

export class RagService {
    /**
     * Busca híbrida simples (exata + semântica)
     */
    async search(
        query: string,
        options: SearchOptions = {}
    ): Promise<RagResult[]> {
        const { limit = 5, filterTypes, userId } = options;

        // Verificar cache
        const cacheKey = `${query}:${limit}:${filterTypes?.join(",") ?? ""}:${userId ?? ""}`;
        const cached = queryCache.get(cacheKey);
        if (cached) {
            console.log(`[RagService] Cache hit para: "${query.substring(0, 30)}..."`);
            return cached;
        }

        // Buscar documentos do banco
        const documents = await this.loadDocuments(userId, filterTypes);

        if (documents.length === 0) {
            console.log("[RagService] Nenhum documento encontrado");
            return [];
        }

        // Executar busca híbrida
        const searchResults = await hybridSearch(documents, query, { limit });

        // Adicionar nível de autoridade
        const results: RagResult[] = searchResults.map(r => ({
            ...r,
            authorityLevel: getAuthorityLevel(r.documentType),
        }));

        // Cachear resultado
        queryCache.set(cacheKey, results);

        return results;
    }

    /**
     * Busca com hierarquia de autoridade aplicada
     * IMPORTANTE: Ordena por SIMILARIDADE primeiro.
     * Hierarquia só é usada para resolver conflitos (mesmo número de súmula).
     */
    async searchWithHierarchy(
        query: string,
        options: SearchOptions = {}
    ): Promise<RagResult[]> {
        const { limit = 5 } = options;

        // Buscar mais resultados para poder filtrar por hierarquia
        const rawResults = await this.search(query, { ...options, limit: limit * 3 });

        if (rawResults.length === 0) return [];

        // Ordenar APENAS por similaridade (maior = melhor)
        // Hierarquia só é usada em resolveConflicts para súmulas de mesmo número
        const sorted = rawResults.sort((a, b) => b.similarity - a.similarity);

        // Regra de conflito: Se tiver Vinculante, remove STF/STJ comuns sobre o mesmo tema
        const filtered = this.resolveConflicts(sorted);

        console.log(`[RagService] Hierarquia aplicada: ${filtered.length} resultados finais`);

        return filtered.slice(0, limit);
    }

    /**
     * Busca TESES JURÍDICAS do gabinete (Motor C - Argumentação)
     * Usa embedding de legalThesis para busca semântica
     */
    async searchLegalTheses(
        query: string,
        userId: number,
        options: { limit?: number; threshold?: number } = {}
    ): Promise<Array<{
        id: number;
        legalThesis: string;
        legalFoundations: string | null;
        keywords: string | null;
        similarity: number;
    }>> {
        const db = await getDb();
        if (!db) return [];

        const { limit = 5, threshold = 0.6 } = options;

        // Buscar teses ativas do usuário
        const theses = await db.select()
            .from(learnedTheses)
            .where(and(
                eq(learnedTheses.userId, userId),
                eq(learnedTheses.status, "ACTIVE" as any),
                eq(learnedTheses.isObsolete, 0)
            ));

        if (theses.length === 0) return [];

        // Gerar embedding da query
        const { generateEmbedding, cosineSimilarity } = await import("../_core/embeddings");
        const queryEmbedding = await generateEmbedding(query);

        // Calcular similaridade com embeddings de teses
        const results = theses
            .map(t => ({
                id: t.id,
                legalThesis: t.legalThesis,
                legalFoundations: t.legalFoundations,
                keywords: t.keywords,
                similarity: t.thesisEmbedding
                    ? cosineSimilarity(queryEmbedding, t.thesisEmbedding as number[])
                    : 0,
            }))
            .filter(r => r.similarity > threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        console.log(`[RagService] Teses Jurídicas: ${results.length} encontradas (threshold: ${threshold})`);
        return results;
    }

    /**
     * Busca AMOSTRAS DE ESTILO do gabinete (Motor B - Redação)
     * Usa embedding de writingStyleSample para busca semântica
     */
    async searchWritingStyle(
        query: string,
        userId: number,
        options: { limit?: number; threshold?: number } = {}
    ): Promise<Array<{
        id: number;
        writingStyleSample: string;
        writingCharacteristics: any;
        similarity: number;
    }>> {
        const db = await getDb();
        if (!db) return [];

        const { limit = 3, threshold = 0.6 } = options;

        // Buscar teses ativas com estilo
        const theses = await db.select()
            .from(learnedTheses)
            .where(and(
                eq(learnedTheses.userId, userId),
                eq(learnedTheses.status, "ACTIVE" as any),
                eq(learnedTheses.isObsolete, 0)
            ));

        if (theses.length === 0) return [];

        // Gerar embedding da query
        const { generateEmbedding, cosineSimilarity } = await import("../_core/embeddings");
        const queryEmbedding = await generateEmbedding(query);

        // Calcular similaridade com embeddings de estilo
        const results = theses
            .filter(t => t.writingStyleSample != null) // Apenas teses com amostra de estilo
            .map(t => ({
                id: t.id,
                writingStyleSample: t.writingStyleSample!,
                writingCharacteristics: t.writingCharacteristics,
                similarity: t.styleEmbedding
                    ? cosineSimilarity(queryEmbedding, t.styleEmbedding as number[])
                    : 0,
            }))
            .filter(r => r.similarity > threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        console.log(`[RagService] Amostras de Estilo: ${results.length} encontradas (threshold: ${threshold})`);
        return results;
    }

    /**
     * DEPRECATED: searchPrecedents - Usar searchLegalTheses() + searchWritingStyle()
     * Busca precedentes do gabinete (learnedTheses)
     */
    async searchPrecedents(
        query: string,
        userId: number,
        limit = 5
    ): Promise<RagResult[]> {
        const db = await getDb();
        if (!db) return [];

        // Buscar teses do usuário
        const theses = await db.select()
            .from(learnedTheses)
            .where(and(
                eq(learnedTheses.userId, userId),
                eq(learnedTheses.isObsolete, 0)
            ));

        if (theses.length === 0) return [];

        // Converter para formato de documento
        const documents: SearchDocument[] = theses.map((t: typeof theses[number]) => ({
            id: t.id,
            title: `Precedente ${t.id}`,
            content: `${t.thesis}\n${t.legalFoundations ?? ""}`,
            documentType: "tese",
        }));

        // Buscar
        const results = await hybridSearch(documents, query, { limit });

        return results.map(r => ({
            ...r,
            authorityLevel: 5, // Teses do gabinete
        }));
    }

    /**
     * Invalida o cache (usar após inserir/atualizar documentos)
     */
    invalidateCache(): void {
        queryCache.invalidate();
    }

    // ============================================
    // MÉTODOS PRIVADOS
    // ============================================

    private async loadDocuments(
        userId?: number,
        filterTypes?: string[]
    ): Promise<SearchDocument[]> {
        const db = await getDb();
        if (!db) return [];

        // Buscar documentos da knowledgeBase
        // Incluir documentos do sistema (userId = 0) e do usuário
        let query = db.select({
            id: knowledgeBase.id,
            title: knowledgeBase.title,
            content: knowledgeBase.content,
            documentType: knowledgeBase.documentType,
            embedding: knowledgeBase.embedding,
        }).from(knowledgeBase);

        // Se tiver tipos específicos, filtrar
        if (filterTypes && filterTypes.length > 0) {
            // Usar any para evitar problemas de tipo com mysqlEnum
            query = query.where(
                inArray(knowledgeBase.documentType, filterTypes as (typeof knowledgeBase.documentType.enumValues)[number][])
            ) as typeof query;
        }

        const docs = await query;

        return docs.map((d: typeof docs[number]) => ({
            id: d.id,
            title: d.title,
            content: d.content,
            documentType: d.documentType ?? undefined,
            embedding: d.embedding,
        }));
    }

    /**
     * Resolve conflitos de hierarquia
     * Ex: Se tem Súmula Vinculante 10, ignora Súmula STJ sobre mesmo tema
     */
    private resolveConflicts(results: RagResult[]): RagResult[] {
        // Por enquanto, apenas retorna ordenado
        // TODO: Implementar detecção de conflitos por tema/número
        // Ex: "Súmula 10" do STJ vs "Súmula Vinculante 10"

        const seen = new Set<string>();
        const filtered: RagResult[] = [];

        for (const result of results) {
            // Extrair número da súmula/tema se houver
            const numberMatch = result.title.match(/\d+/);
            const key = numberMatch
                ? `${result.documentType}:${numberMatch[0]}`
                : `${result.id}`;

            if (!seen.has(key)) {
                seen.add(key);
                filtered.push(result);
            }
        }

        return filtered;
    }
}

// ============================================
// INSTÂNCIA SINGLETON
// ============================================

let _instance: RagService | null = null;

export function getRagService(): RagService {
    if (!_instance) {
        _instance = new RagService();
    }
    return _instance;
}

// Re-exportar para conveniência
export { hasExactReference };
