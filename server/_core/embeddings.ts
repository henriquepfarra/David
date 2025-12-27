import { ENV } from "./env";

/**
 * Gera embedding de um texto usando a API da OpenAI
 * Retorna um vetor numérico que representa semanticamente o texto
 * 
 * NOTA: Embeddings requerem uma chave da OpenAI (text-embedding-3-small)
 * Pode ser a mesma chave usada para LLM ou uma chave separada
 */
export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const key = apiKey || ENV.geminiApiKey;

  if (!key) {
    throw new Error(
      "API key não configurada para embeddings. Configure GEMINI_API_KEY ou forneça uma chave."
    );
  }

  try {
    // Usar Google Gemini embedding API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=" + key,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: {
            parts: [{ text: text.replace(/\n/g, " ") }]
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erro na API Gemini (Embeddings): ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.embedding || !data.embedding.values) {
      throw new Error("Resposta inválida da API de embeddings Gemini");
    }

    return data.embedding.values;
  } catch (error) {
    console.error("[Embeddings] Erro ao gerar embedding:", error);
    throw error;
  }
}

/**
 * Calcula similaridade de cosseno entre dois vetores
 * Retorna valor entre -1 e 1 (quanto maior, mais similar)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vetores devem ter o mesmo tamanho");
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
  documents: Array<{ id: number; title: string; content: string; embedding: string | null }>,
  query: string,
  limit: number = 5
): Promise<Array<{ id: number; title: string; content: string; similarity: number }>> {
  // Gerar embedding da query
  const queryEmbedding = await generateEmbedding(query);

  // Calcular similaridade com cada documento
  const results = documents
    .filter((doc) => doc.embedding) // Apenas documentos com embedding
    .map((doc) => {
      const docEmbedding = JSON.parse(doc.embedding!);
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
