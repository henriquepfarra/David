/**
 * Busca Híbrida para RAG Jurídico
 * 
 * Estratégia:
 * 1. Se a query contém número de súmula/artigo → Busca exata (TF-IDF com boost)
 * 2. Se a query é semântica → Busca por embeddings vetoriais
 * 
 * Combina o melhor dos dois mundos:
 * - Precisão para "Súmula 100 do STJ"
 * - Inteligência para "Súmula sobre juros de mora"
 */

import { generateEmbedding, cosineSimilarity } from "./embeddings";
import { searchSimilarDocuments as searchTFIDF } from "./textSearch";

interface Document {
    id: number;
    title: string;
    content: string;
    documentType?: string;
    embedding?: unknown;
}

interface SearchResult {
    id: number;
    title: string;
    content: string;
    similarity: number;
    documentType?: string;
    searchMethod: "exact" | "semantic" | "hybrid";
}

/**
 * Detecta se a query contém referência específica a número (súmula, artigo, etc.)
 */
function hasExactReference(query: string): boolean {
    // Patterns que indicam busca exata
    const exactPatterns = [
        /s[uú]mula\s+\d+/i,           // Súmula 100
        /art\.?\s*\d+/i,              // Art. 50 / Artigo 50
        /artigo\s+\d+/i,              // Artigo 50
        /lei\s+\d+/i,                 // Lei 8078
        /tema\s+\d+/i,                // Tema 1000
        /enunciado\s+\d+/i,           // Enunciado 37
    ];

    return exactPatterns.some(pattern => pattern.test(query));
}

/**
 * Busca Híbrida: combina busca exata e semântica
 */
export async function hybridSearch(
    documents: Document[],
    query: string,
    options: {
        limit?: number;
        minSimilarity?: number;
    } = {}
): Promise<SearchResult[]> {
    const { limit = 5, minSimilarity = 0.1 } = options;

    const hasExact = hasExactReference(query);
    console.log(`[Hybrid-RAG] Query: "${query.substring(0, 50)}..." | Modo: ${hasExact ? "EXATO + SEMÂNTICO" : "SEMÂNTICO"}`);

    // === BUSCA EXATA (TF-IDF com boost) ===
    // Sempre executar para pegar matches exatos
    const exactResults = searchTFIDF(
        documents.map(d => ({
            id: d.id,
            title: d.title,
            content: d.content,
            documentType: d.documentType,
        })),
        query,
        { limit: limit, minSimilarity: 0.01 }
    );

    // Filtrar apenas resultados com boost alto (match exato de número)
    const exactMatches = exactResults
        .filter(r => r.similarity >= 5) // Boost de título = 5 ou 10
        .map(r => ({
            ...r,
            searchMethod: "exact" as const,
        }));

    console.log(`[Hybrid-RAG] Matches exatos: ${exactMatches.length}`);

    // Se tiver match exato forte, retornar ele primeiro
    if (exactMatches.length > 0 && hasExact) {
        // Completar com busca semântica para contexto adicional
        const remainingSlots = limit - exactMatches.length;
        if (remainingSlots > 0) {
            try {
                const semanticResults = await semanticSearch(documents, query, remainingSlots * 2);
                // Filtrar duplicatas
                const exactIds = new Set(exactMatches.map(m => m.id));
                const additionalResults = semanticResults
                    .filter(r => !exactIds.has(r.id))
                    .slice(0, remainingSlots);

                return [...exactMatches, ...additionalResults];
            } catch (error) {
                console.error("[Hybrid-RAG] Erro na busca semântica, usando apenas exata:", error);
                return exactMatches;
            }
        }
        return exactMatches;
    }

    // === BUSCA SEMÂNTICA (Embeddings) ===
    try {
        const semanticResults = await semanticSearch(documents, query, limit);
        console.log(`[Hybrid-RAG] Resultados semânticos: ${semanticResults.length}`);

        // Combinar com eventuais matches exatos
        if (exactMatches.length > 0) {
            const exactIds = new Set(exactMatches.map(m => m.id));
            const filteredSemantic = semanticResults.filter(r => !exactIds.has(r.id));
            return [...exactMatches, ...filteredSemantic].slice(0, limit);
        }

        return semanticResults;
    } catch (error) {
        console.error("[Hybrid-RAG] Erro na busca semântica, fallback para TF-IDF:", error);
        // Fallback para TF-IDF puro
        return exactResults.slice(0, limit).map(r => ({
            ...r,
            searchMethod: "exact" as const,
        }));
    }
}

/**
 * Busca semântica usando embeddings vetoriais
 */
async function semanticSearch(
    documents: Document[],
    query: string,
    limit: number
): Promise<SearchResult[]> {
    // Filtrar apenas documentos que têm embedding
    const docsWithEmbedding = documents.filter(d => d.embedding);

    if (docsWithEmbedding.length === 0) {
        console.warn("[Hybrid-RAG] Nenhum documento com embedding encontrado");
        return [];
    }

    // Gerar embedding da query
    const queryEmbedding = await generateEmbedding(query);

    // Calcular similaridade com cada documento
    const results: SearchResult[] = [];

    for (const doc of docsWithEmbedding) {
        const docEmbedding = Array.isArray(doc.embedding)
            ? doc.embedding as number[]
            : [];

        if (docEmbedding.length === 0) continue;

        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        results.push({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            documentType: doc.documentType,
            similarity,
            searchMethod: "semantic" as const,
        });
    }

    return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
}

export { hasExactReference };
