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
import { eq, and, inArray, sql } from "drizzle-orm";

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

        // Rastrear uso das teses retornadas (fire-and-forget)
        if (results.length > 0) {
            const matchedIds = results.map(r => r.id);
            this.trackThesisUsage(matchedIds).catch(err =>
                console.error("[RagService] Erro ao rastrear uso de teses:", err)
            );
        }

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

        // Rastrear uso (compartilha a mesma tese)
        if (results.length > 0) {
            const matchedIds = results.map(r => r.id);
            this.trackThesisUsage(matchedIds).catch(err =>
                console.error("[RagService] Erro ao rastrear uso de estilo:", err)
            );
        }

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
     * Busca teses similares a um embedding dado (para deduplicação)
     * Usado ao aprovar/criar teses para detectar duplicatas
     */
    async findSimilarTheses(
        embedding: number[],
        userId: number,
        options: { threshold?: number; excludeId?: number } = {}
    ): Promise<Array<{
        id: number;
        legalThesis: string;
        legalFoundations: string | null;
        keywords: string | null;
        similarity: number;
    }>> {
        const db = await getDb();
        if (!db) return [];

        const { threshold = 0.85, excludeId } = options;

        // Buscar teses ativas do usuário
        const theses = await db.select()
            .from(learnedTheses)
            .where(and(
                eq(learnedTheses.userId, userId),
                eq(learnedTheses.status, "ACTIVE" as any),
                eq(learnedTheses.isObsolete, 0)
            ));

        if (theses.length === 0) return [];

        const { cosineSimilarity } = await import("../_core/embeddings");

        const results = theses
            .filter(t => t.thesisEmbedding && (!excludeId || t.id !== excludeId))
            .map(t => ({
                id: t.id,
                legalThesis: t.legalThesis,
                legalFoundations: t.legalFoundations,
                keywords: t.keywords,
                similarity: cosineSimilarity(embedding, t.thesisEmbedding as number[]),
            }))
            .filter(r => r.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity);

        if (results.length > 0) {
            console.log(`[RagService] Encontradas ${results.length} teses similares (threshold: ${threshold})`);
        }

        return results;
    }

    /**
     * Encontra clusters de teses similares entre si (para curadoria)
     * Retorna grupos de 2+ teses com similaridade > threshold
     */
    async findThesisClusters(
        userId: number,
        options: { threshold?: number } = {}
    ): Promise<Array<{
        theses: Array<{ id: number; legalThesis: string; keywords: string | null }>;
        avgSimilarity: number;
    }>> {
        const db = await getDb();
        if (!db) return [];

        const { threshold = 0.80 } = options;

        const allTheses = await db.select()
            .from(learnedTheses)
            .where(and(
                eq(learnedTheses.userId, userId),
                eq(learnedTheses.status, "ACTIVE" as any),
                eq(learnedTheses.isObsolete, 0)
            ));

        const withEmbeddings = allTheses.filter(t => t.thesisEmbedding);
        if (withEmbeddings.length < 2) return [];

        const { cosineSimilarity } = await import("../_core/embeddings");

        // Union-Find para agrupar teses similares
        const parent = new Map<number, number>();
        const find = (id: number): number => {
            if (!parent.has(id)) parent.set(id, id);
            if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!));
            return parent.get(id)!;
        };
        const union = (a: number, b: number) => {
            parent.set(find(a), find(b));
        };

        // Pairwise similarity — O(n²), ok para < 1000 teses
        const similarities = new Map<string, number>();
        for (let i = 0; i < withEmbeddings.length; i++) {
            for (let j = i + 1; j < withEmbeddings.length; j++) {
                const sim = cosineSimilarity(
                    withEmbeddings[i].thesisEmbedding as number[],
                    withEmbeddings[j].thesisEmbedding as number[]
                );
                if (sim >= threshold) {
                    union(withEmbeddings[i].id, withEmbeddings[j].id);
                    const key = `${withEmbeddings[i].id}-${withEmbeddings[j].id}`;
                    similarities.set(key, sim);
                }
            }
        }

        // Agrupar por raiz do union-find
        const groups = new Map<number, typeof withEmbeddings>();
        for (const t of withEmbeddings) {
            const root = find(t.id);
            if (!groups.has(root)) groups.set(root, []);
            groups.get(root)!.push(t);
        }

        // Filtrar clusters com 2+ teses e calcular similaridade média
        const clusters: Array<{
            theses: Array<{ id: number; legalThesis: string; keywords: string | null }>;
            avgSimilarity: number;
        }> = [];

        const groupEntries = Array.from(groups.values());
        for (const group of groupEntries) {
            if (group.length < 2) continue;

            let totalSim = 0;
            let pairCount = 0;
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const key1 = `${group[i].id}-${group[j].id}`;
                    const key2 = `${group[j].id}-${group[i].id}`;
                    const sim = similarities.get(key1) ?? similarities.get(key2) ?? 0;
                    if (sim > 0) {
                        totalSim += sim;
                        pairCount++;
                    }
                }
            }

            clusters.push({
                theses: group.map((t: typeof group[number]) => ({
                    id: t.id,
                    legalThesis: t.legalThesis,
                    keywords: t.keywords,
                })),
                avgSimilarity: pairCount > 0 ? totalSim / pairCount : 0,
            });
        }

        return clusters.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
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

    /**
     * Incrementa useCount e atualiza lastUsedAt para teses retornadas pelo RAG
     */
    private async trackThesisUsage(thesisIds: number[]): Promise<void> {
        const db = await getDb();
        if (!db || thesisIds.length === 0) return;

        await db
            .update(learnedTheses)
            .set({
                useCount: sql`${learnedTheses.useCount} + 1`,
                lastUsedAt: new Date(),
            })
            .where(inArray(learnedTheses.id, thesisIds));
    }

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

    /**
     * Busca e formata o contexto completo da base de conhecimento para incluir em prompts
     * Separa documentos citáveis (enunciados/súmulas) de não-citáveis (minutas/teses)
     *
     * @param userId - ID do usuário
     * @param query - Conteúdo da mensagem/query do usuário
     * @returns Contexto formatado para prompt ou string vazia se não houver documentos
     */
    async buildKnowledgeBaseContext(userId: number, query: string): Promise<string> {
        let context = "";

        try {
            // Buscar documentos com o método de busca
            const results = await this.search(query, {
                userId,
                limit: 12,
                minSimilarity: 0.1,
            });

            if (results.length === 0) {
                return context;
            }

            // Separar documentos citáveis (enunciados e súmulas) de não-citáveis
            const citableDocs = results.filter(d =>
                d.documentType === 'enunciado' ||
                d.documentType === 'sumula' ||
                d.documentType === 'sumula_stj' ||
                d.documentType === 'sumula_stf' ||
                d.documentType === 'sumula_vinculante'
            );
            const referenceDocs = results.filter(d => !citableDocs.includes(d));

            context = `\n\n## BASE DE CONHECIMENTO\n\n`;

            // Enunciados e Súmulas (CITÁVEIS)
            if (citableDocs.length > 0) {
                context += `### Enunciados e Súmulas Aplicáveis\n\n`;
                citableDocs.forEach((doc) => {
                    const contentPreview = doc.content.length > 3000
                        ? doc.content.substring(0, 3000) + "..."
                        : doc.content;
                    context += `**${doc.title}** (similaridade: ${(doc.similarity * 100).toFixed(1)}%)\n${contentPreview}\n\n`;
                });
                context += `**INSTRUÇÃO:** Cite esses enunciados/súmulas EXPLICITAMENTE quando aplicável (ex: "Conforme Enunciado X do FONAJE..."). Eles são fontes oficiais e devem ser mencionados.\n\n`;
            }

            // Minutas/Teses/Decisões (NÃO-CITÁVEIS - apenas referência interna)
            if (referenceDocs.length > 0) {
                context += `### Referências Internas (Uso Implícito)\n\n`;
                referenceDocs.forEach((doc) => {
                    const contentPreview = doc.content.length > 2000
                        ? doc.content.substring(0, 2000) + "..."
                        : doc.content;
                    context += `${contentPreview}\n\n`;
                });
                context += `**INSTRUÇÃO:** Use o conhecimento acima para enriquecer sua resposta, MAS NÃO cite a fonte (minutas/teses/decisões são repositórios internos). Apresente como seu próprio conhecimento jurídico.\n`;
            }

            console.log(`[RagService] Contexto RAG construído: ${citableDocs.length} citáveis + ${referenceDocs.length} referências`);

        } catch (error) {
            console.error("[RagService] Erro ao construir contexto:", error);
        }

        return context;
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
