import { ENV } from "./env";

/**
 * Gera embedding de um texto usando a API do Manus
 * Retorna um vetor numérico que representa semanticamente o texto
 */
export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  try {
    // Se uma chave específica de embedding for fornecida, usar endpoint da OpenAI diretamente
    if (apiKey) {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: text.replace(/\n/g, " "), // Sanitização simples
          model: "text-embedding-3-small",
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API OpenAI (Embeddings): ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    }

    // Fallback para a API interna (Forge/Manus) se não houver chave específica
    const apiUrl = ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/embeddings`
      : "https://forge.manus.im/v1/embeddings";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao gerar embedding (Forge): ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error("Resposta inválida da API de embeddings");
    }

    return data.data[0].embedding;
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
