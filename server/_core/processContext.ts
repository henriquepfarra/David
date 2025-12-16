import { getDb } from "../db";
import { processDocumentChunks, userSettings } from "../../drizzle/schema";
import { eq, sql, desc, asc } from "drizzle-orm";
import { generateEmbedding, cosineSimilarity as calculateCosineSimilarity } from "./embeddings";

/**
 * Recupera o contexto do processo com base no modo de operação (RAG ou Auditoria)
 */
export async function getProcessContext(
    processId: number,
    userId: number,
    query: string,
    mode: "rag" | "audit"
): Promise<string> {
    // 1. Obter configurações do usuário (para chave de API)
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
    });

    const embeddingKey = settings?.openaiEmbeddingsKey || undefined;

    if (mode === "audit") {
        // Modo Auditoria ou Analise1: Recuperar TODO o contexto ordenado
        return await getFullProcessContext(processId);
    } else {
        // Modo RAG: Recuperar chunks relevantes via busca vetorial
        return await getRelevantChunks(processId, query, embeddingKey);
    }
}

/**
 * MODO AUDITORIA: Recupera texto integral do processo ordenado por página
 */
async function getFullProcessContext(processId: number): Promise<string> {
    const db = await getDb();
    if (!db) return "";

    const chunks = await db.query.processDocumentChunks.findMany({
        where: eq(processDocumentChunks.processId, processId),
        orderBy: [asc(processDocumentChunks.documentId), asc(processDocumentChunks.pageNumber), asc(processDocumentChunks.chunkIndex)],
    });

    if (!chunks || chunks.length === 0) {
        return "";
    }

    // Concatenar texto com marcadores de página
    return chunks
        .map((chunk) => {
            return `[DOCUMENTO ${chunk.documentId} - PÁGINA ${chunk.pageNumber}]\n${chunk.content}`;
        })
        .join("\n\n");
}

/**
 * MODO RAG: Recupera apenas trechos relevantes via Cosine Similarity
 */
async function getRelevantChunks(
    processId: number,
    query: string,
    apiKey?: string
): Promise<string> {
    // 1. Gerar embedding da query
    let queryEmbedding: number[];
    try {
        queryEmbedding = await generateEmbedding(query, apiKey);
    } catch (error) {
        console.error("Erro ao gerar embedding da query:", error);
        return ""; // Fallback: sem contexto semântico
    }

    // 2. Buscar todos os chunks do processo (limitado para otimização - ideal seria vector store nativo)
    // Como estamos usando MySQL sem extensão vetorial, carregamos os chunks do processo para memória
    // Isso funciona bem para processos de até ~2-3 mil páginas. Para maiores, precisaria de filtro prévio.
    const db = await getDb();
    if (!db) return "";

    const processChunks = await db.query.processDocumentChunks.findMany({
        where: eq(processDocumentChunks.processId, processId),
    });

    if (!processChunks || processChunks.length === 0) {
        return "";
    }

    // 3. Calcular similaridade em memória
    const scoredChunks = processChunks
        .filter(chunk => chunk.embedding) // Ter certeza que tem vetor
        .map((chunk) => {
            let embedding: number[] = [];
            if (typeof chunk.embedding === 'string') {
                try {
                    embedding = JSON.parse(chunk.embedding);
                } catch (e) { return { ...chunk, score: -1 }; }
            } else if (Array.isArray(chunk.embedding)) {
                embedding = chunk.embedding;
            }

            const score = calculateCosineSimilarity(queryEmbedding, embedding);
            return { ...chunk, score };
        })
        .sort((a, b) => b.score - a.score) // Maior score primeiro
        .slice(0, 8); // Top 8 chunks

    // 4. Formatar
    return scoredChunks
        .map((chunk) => `[RECUPERADO - PÁGINA ${chunk.pageNumber}]: ${chunk.content}`)
        .join("\n\n");
}
