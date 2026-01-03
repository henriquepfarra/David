import { ENV } from "./env";

/**
 * Gera embedding usando OpenAI (text-embedding-3-small)
 * Melhor custo-benefício do mercado para embeddings.
 * 
 * Esta função usa a chave OPENAI_API_KEY do servidor (não do usuário)
 * para garantir consistência nos vetores de busca.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = ENV.openaiApiKey;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não configurada no servidor. Configure no .env ou variáveis de ambiente."
    );
  }

  try {
    // Limpar texto para economizar tokens
    const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: cleanText,
        dimensions: 1536, // Padrão robusto
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro OpenAI Embeddings: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error("Resposta inválida da API de embeddings OpenAI");
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error("[Embeddings] Erro ao gerar vetor:", error);
    throw error;
  }
}

/**
 * Calcula similaridade de cosseno entre dois vetores
 * Retorna valor entre -1 e 1 (quanto maior, mais similar)
 * 1.0 = Idêntico, 0.0 = Nada a ver
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    // Proteção contra vetores de tamanhos diferentes (ex: troca de provedor)
    console.warn(`[Similaridade] Vetores com tamanhos diferentes! A: ${vecA.length}, B: ${vecB.length}`);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Busca documentos similares a uma query
 * Retorna documentos ordenados por similaridade (mais similar primeiro)
 */
export async function searchSimilarDocuments(
  documents: Array<{ id: number; title: string; content: string; embedding: unknown }>,
  query: string,
  limit: number = 5
): Promise<Array<{ id: number; title: string; content: string; similarity: number }>> {
  // Gerar embedding da query usando OpenAI
  const queryEmbedding = await generateEmbedding(query);

  // Calcular similaridade com cada documento
  const results = documents
    .filter((doc) => doc.embedding) // Apenas documentos com embedding
    .map((doc) => {
      // O Drizzle retorna JSON, garantir que seja array de números
      const docEmbedding = Array.isArray(doc.embedding)
        ? doc.embedding
        : (doc.embedding as number[]);

      const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
      return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        similarity,
      };
    })
    .sort((a, b) => b.similarity - a.similarity) // Ordenar por similaridade (maior primeiro)
    .slice(0, limit); // Limitar resultados

  return results;
}
