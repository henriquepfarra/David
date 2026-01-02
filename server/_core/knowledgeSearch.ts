/**
 * Busca Híbrida na Base de Conhecimento
 * 
 * Combina busca exata (SQL) com busca semântica (Embeddings)
 * - Se query contém número específico → Busca exata
 * - Se query é conceitual → Busca semântica
 */

import { getDb } from "../db";
import { knowledgeBase, learnedTheses } from "../../drizzle/schema";
import { like, or, eq, and } from "drizzle-orm";
import { generateEmbedding, cosineSimilarity } from "./embeddings";

// Tipos de retorno
export interface SearchResult {
    id: number;
    systemId: string | null;
    title: string;
    content: string;
    documentType: string;
    source: string;
    similarity?: number;
}

/**
 * Detecta se a query contém um número específico (ex: "Súmula 54")
 * Retorna o número encontrado ou null
 */
export function detectNumber(query: string): string | null {
    // Padrões comuns: "Súmula 54", "Enunciado 13", "54 STJ", etc.
    const patterns = [
        /s[uú]mula\s*(\d+)/i,           // Súmula 54
        /enunciado\s*(\d+)/i,            // Enunciado 13
        /tema\s*(\d+)/i,                 // Tema 973
        /\b(\d{1,4})\b/,                 // Qualquer número de 1-4 dígitos
    ];

    for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Busca exata por número no título ou systemId
 */
export async function exactSearch(
    number: string,
    userId?: number,
    limit: number = 10
): Promise<SearchResult[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        const results = await db.query.knowledgeBase.findMany({
            where: or(
                like(knowledgeBase.title, `%${number}%`),
                like(knowledgeBase.systemId, `%${number}%`)
            ),
            limit,
        });

        return results.map((r) => ({
            id: r.id,
            systemId: r.systemId,
            title: r.title,
            content: r.content,
            documentType: r.documentType,
            source: r.source,
        }));
    } catch (error) {
        console.error("[KnowledgeSearch] Erro na busca exata:", error);
        return [];
    }
}

/**
 * Busca semântica por similaridade de embeddings
 */
export async function semanticSearch(
    query: string,
    userId?: number,
    limit: number = 5
): Promise<SearchResult[]> {
    const db = await getDb();
    if (!db) return [];

    try {
        // 1. Gerar embedding da query
        const queryEmbedding = await generateEmbedding(query);

        // 2. Buscar todos os documentos com embedding
        const documents = await db.query.knowledgeBase.findMany({
            where: and(
                // Filtrar por documentos que têm embedding
            ),
        });

        // 3. Calcular similaridade e ordenar
        const results = documents
            .filter((doc) => doc.embedding) // Apenas com embedding
            .map((doc) => {
                const docEmbedding = doc.embedding as number[];
                const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
                return {
                    id: doc.id,
                    systemId: doc.systemId,
                    title: doc.title,
                    content: doc.content,
                    documentType: doc.documentType,
                    source: doc.source,
                    similarity,
                };
            })
            .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
            .slice(0, limit);

        return results;
    } catch (error) {
        console.error("[KnowledgeSearch] Erro na busca semântica:", error);
        return [];
    }
}

/**
 * Busca híbrida: combina exata e semântica
 * 
 * Lógica:
 * 1. Se detectar número específico → Busca exata primeiro
 * 2. Se busca exata encontrar resultados → Retorna
 * 3. Se não encontrar ou não tiver número → Busca semântica
 */
export async function hybridSearch(
    query: string,
    userId?: number,
    limit: number = 5
): Promise<SearchResult[]> {
    console.log(`[KnowledgeSearch] Buscando: "${query}"`);

    // 1. Detectar se tem número
    const number = detectNumber(query);

    if (number) {
        console.log(`[KnowledgeSearch] Número detectado: ${number} → Busca exata`);

        // 2. Tentar busca exata primeiro
        const exactResults = await exactSearch(number, userId, limit);

        if (exactResults.length > 0) {
            console.log(`[KnowledgeSearch] Encontrados ${exactResults.length} resultados exatos`);
            return exactResults;
        }

        console.log("[KnowledgeSearch] Nenhum resultado exato, tentando semântica...");
    }

    // 3. Busca semântica (fallback ou query conceitual)
    console.log("[KnowledgeSearch] Usando busca semântica");
    return semanticSearch(query, userId, limit);
}

/**
 * Busca teses aprendidas do gabinete (para Motor B)
 */
export async function searchUserTheses(
    query: string,
    userId: number,
    limit: number = 3
): Promise<Array<{ id: number; thesis: string; keywords: string | null; similarity?: number }>> {
    const db = await getDb();
    if (!db) return [];

    try {
        // Buscar teses do usuário
        const theses = await db.query.learnedTheses.findMany({
            where: eq(learnedTheses.userId, userId),
        });

        if (theses.length === 0) return [];

        // Gerar embedding da query
        const queryEmbedding = await generateEmbedding(query);

        // Como learnedTheses não tem embedding, faremos match por keywords
        // TODO: Adicionar campo embedding em learnedTheses para busca semântica

        // Por agora, retorna as teses mais recentes
        return theses
            .slice(0, limit)
            .map((t) => ({
                id: t.id,
                thesis: t.thesis,
                keywords: t.keywords,
            }));
    } catch (error) {
        console.error("[KnowledgeSearch] Erro ao buscar teses:", error);
        return [];
    }
}

/**
 * Formata resultados para injeção no contexto da LLM
 */
export function formatForContext(results: SearchResult[], maxTokens: number = 1000): string {
    if (results.length === 0) {
        return "Nenhum documento relevante encontrado na base de conhecimento.";
    }

    let output = "📚 DOCUMENTOS RELEVANTES DA BASE DE CONHECIMENTO:\n\n";
    let tokenCount = 0;
    const avgTokensPerChar = 0.25; // Estimativa

    for (const doc of results) {
        const docText = `### ${doc.title}\n${doc.content}\n\n`;
        const estimatedTokens = docText.length * avgTokensPerChar;

        if (tokenCount + estimatedTokens > maxTokens) break;

        output += docText;
        tokenCount += estimatedTokens;
    }

    return output;
}
