import { describe, it, expect } from "vitest";

/**
 * Testes para funções auxiliares de embeddings
 * Focando em cosineSimilarity que é pura e não depende de API
 */

// Função extraída para testar (copiada do módulo)
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
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

// Função auxiliar para limpar texto (extraída da lógica)
function cleanTextForEmbedding(text: string): string {
  return text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

describe("embeddings.ts - Cosine Similarity", () => {
  describe("cosineSimilarity", () => {
    it("deve retornar 1.0 para vetores idênticos", () => {
      const vec = [1, 2, 3, 4, 5];
      const similarity = cosineSimilarity(vec, vec);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("deve retornar ~1.0 para vetores proporcionais", () => {
      const vecA = [1, 2, 3];
      const vecB = [2, 4, 6]; // 2x vecA

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("deve retornar 0.0 para vetores ortogonais", () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it("deve retornar -1.0 para vetores opostos", () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it("deve retornar 0 para vetores de tamanhos diferentes", () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3, 4, 5];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBe(0);
    });

    it("deve retornar 0 se normA for 0", () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBe(0);
    });

    it("deve retornar 0 se normB for 0", () => {
      const vecA = [1, 2, 3];
      const vecB = [0, 0, 0];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBe(0);
    });

    it("deve lidar com vetores com valores negativos", () => {
      const vecA = [1, -2, 3];
      const vecB = [1, -2, 3];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("deve calcular similaridade para vetores grandes (1536 dims)", () => {
      const vecA = Array(1536).fill(0.1);
      const vecB = Array(1536).fill(0.1);

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("deve calcular similaridade para vetores com decimais", () => {
      const vecA = [0.123, 0.456, 0.789];
      const vecB = [0.123, 0.456, 0.789];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });
  });

  describe("cleanTextForEmbedding", () => {
    it("deve substituir newlines por espaços", () => {
      const text = "Line 1\nLine 2\nLine 3";
      const cleaned = cleanTextForEmbedding(text);

      expect(cleaned).toBe("Line 1 Line 2 Line 3");
      expect(cleaned).not.toContain("\n");
    });

    it("deve reduzir múltiplos espaços para um único espaço", () => {
      const text = "Too    many     spaces";
      const cleaned = cleanTextForEmbedding(text);

      expect(cleaned).toBe("Too many spaces");
    });

    it("deve fazer trim de espaços nas extremidades", () => {
      const text = "   Text with spaces   ";
      const cleaned = cleanTextForEmbedding(text);

      expect(cleaned).toBe("Text with spaces");
    });

    it("deve lidar com combinação de newlines e espaços", () => {
      const text = "Line 1  \n\n  Line 2   \n   Line 3";
      const cleaned = cleanTextForEmbedding(text);

      expect(cleaned).toBe("Line 1 Line 2 Line 3");
    });

    it("deve manter texto limpo intacto", () => {
      const text = "Already clean text";
      const cleaned = cleanTextForEmbedding(text);

      expect(cleaned).toBe(text);
    });

    it("deve lidar com strings vazias", () => {
      expect(cleanTextForEmbedding("")).toBe("");
    });

    it("deve lidar com apenas espaços e newlines", () => {
      const text = "   \n\n   \n   ";
      const cleaned = cleanTextForEmbedding(text);

      expect(cleaned).toBe("");
    });

    it("deve preservar caracteres especiais", () => {
      const text = "Text\nwith special!@#$%\nchars";
      const cleaned = cleanTextForEmbedding(text);

      expect(cleaned).toBe("Text with special!@#$% chars");
    });
  });

  describe("Similarity Real-World Scenarios", () => {
    it("deve calcular alta similaridade para textos similares", () => {
      // Simulando embeddings similares
      const embedding1 = [0.5, 0.3, 0.8, 0.1, 0.9];
      const embedding2 = [0.52, 0.31, 0.79, 0.11, 0.88];

      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBeGreaterThan(0.99);
    });

    it("deve calcular média similaridade para textos relacionados", () => {
      const embedding1 = [0.5, 0.3, 0.8, 0.1, 0.9];
      const embedding2 = [0.3, 0.5, 0.7, 0.2, 0.6];

      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBeGreaterThan(0.7);
      expect(similarity).toBeLessThan(1.0);
    });

    it("deve calcular baixa similaridade para textos não relacionados", () => {
      const embedding1 = [1, 0, 0, 0, 0];
      const embedding2 = [0, 0, 0, 0, 1];

      const similarity = cosineSimilarity(embedding1, embedding2);

      expect(similarity).toBeCloseTo(0, 1);
    });
  });

  describe("Mathematical Properties", () => {
    it("deve ser comutativo (A·B = B·A)", () => {
      const vecA = [1, 2, 3, 4];
      const vecB = [5, 6, 7, 8];

      const simAB = cosineSimilarity(vecA, vecB);
      const simBA = cosineSimilarity(vecB, vecA);

      expect(simAB).toBeCloseTo(simBA, 10);
    });

    it("deve retornar valores entre -1 e 1", () => {
      const testVectors = [
        [[1, 2, 3], [4, 5, 6]],
        [[1, -1, 1], [-1, 1, -1]],
        [[0.5, 0.5], [0.5, 0.5]],
        [[-1, -2, -3], [1, 2, 3]],
      ];

      testVectors.forEach(([vecA, vecB]) => {
        const sim = cosineSimilarity(vecA, vecB);
        // Use toBeCloseTo para lidar com imprecisão de ponto flutuante
        expect(sim).toBeGreaterThanOrEqual(-1.00001);
        expect(sim).toBeLessThanOrEqual(1.00001);
      });
    });

    it("deve ser invariante à escala (magnitude não importa)", () => {
      const vecA = [1, 2, 3];
      const vecB = [2, 4, 6]; // 2x vecA
      const vecC = [10, 20, 30]; // 10x vecA

      const simAB = cosineSimilarity(vecA, vecB);
      const simAC = cosineSimilarity(vecA, vecC);

      expect(simAB).toBeCloseTo(simAC, 10);
      expect(simAB).toBeCloseTo(1.0, 5);
    });
  });

  describe("Edge Cases & Error Handling", () => {
    it("deve lidar com vetores unitários", () => {
      const vecA = [1];
      const vecB = [1];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("deve lidar com valores muito pequenos (precisão)", () => {
      const vecA = [0.0001, 0.0002, 0.0003];
      const vecB = [0.0001, 0.0002, 0.0003];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("deve lidar com valores muito grandes", () => {
      const vecA = [1e10, 2e10, 3e10];
      const vecB = [1e10, 2e10, 3e10];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("deve lidar com mistura de positivos e negativos", () => {
      const vecA = [1, -1, 1, -1, 1];
      const vecB = [1, -1, 1, -1, 1];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it("deve retornar valor numérico válido (não NaN)", () => {
      const vecA = [1, 2, 3];
      const vecB = [4, 5, 6];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(isNaN(similarity)).toBe(false);
      expect(isFinite(similarity)).toBe(true);
    });
  });

  describe("OpenAI Embedding Dimensions", () => {
    it("deve funcionar com text-embedding-3-small (1536 dims)", () => {
      const vec1 = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const vec2 = Array(1536)
        .fill(0)
        .map(() => Math.random());

      const similarity = cosineSimilarity(vec1, vec2);

      expect(isFinite(similarity)).toBe(true);
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it("deve detectar incompatibilidade de dimensões (troca de modelo)", () => {
      const vec1 = Array(1536).fill(0.1); // text-embedding-3-small
      const vec2 = Array(768).fill(0.1); // outro modelo

      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBe(0);
    });
  });
});
