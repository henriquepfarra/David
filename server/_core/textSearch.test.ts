import { describe, it, expect } from "vitest";
import { normalizeText, searchSimilarDocuments } from "./textSearch";

describe("textSearch.ts - TF-IDF Search", () => {
  describe("normalizeText", () => {
    it("deve converter para minúsculas", () => {
      const result = normalizeText("TEXTO EM MAIÚSCULAS");
      expect(result.every(word => word === word.toLowerCase())).toBe(true);
    });

    it("deve remover acentos", () => {
      const result = normalizeText("João José Maria ação não será");
      const hasAccents = result.some(word => /[áàãâéêíóõôúç]/i.test(word));
      expect(hasAccents).toBe(false);
    });

    it("deve remover pontuação", () => {
      const result = normalizeText("Olá, mundo! Como vai? Tudo bem.");
      const hasPunctuation = result.some(word => /[.,!?;:]/.test(word));
      expect(hasPunctuation).toBe(false);
    });

    it("deve remover stopwords comuns", () => {
      const result = normalizeText("o rato roeu a roupa do rei de roma");

      // Stopwords: o, a, do, de
      expect(result).not.toContain("o");
      expect(result).not.toContain("a");
      expect(result).not.toContain("do");
      expect(result).not.toContain("de");

      // Palavras importantes devem permanecer
      expect(result).toContain("rato");
      expect(result).toContain("roeu");
      expect(result).toContain("roupa");
      expect(result).toContain("rei");
      expect(result).toContain("roma");
    });

    it("deve remover palavras muito curtas (≤2 chars)", () => {
      const result = normalizeText("eu vi um xx oi aa teste");

      expect(result).not.toContain("eu");
      expect(result).not.toContain("vi");
      expect(result).not.toContain("um");
      expect(result).not.toContain("xx");
      expect(result).not.toContain("oi");
      expect(result).not.toContain("aa");
      expect(result).toContain("teste");
    });

    it("deve dividir por espaços em branco", () => {
      const result = normalizeText("palavra1    palavra2\n\npalavra3\tpalavra4");
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it("deve lidar com texto vazio", () => {
      const result = normalizeText("");
      expect(result).toEqual([]);
    });

    it("deve lidar com apenas stopwords", () => {
      const result = normalizeText("o a os as um uma de da");
      expect(result).toEqual([]);
    });

    it("deve preservar números", () => {
      const result = normalizeText("Súmula 123 do STJ artigo 456");
      expect(result).toContain("sumula"); // sem acento
      expect(result).toContain("123");
      expect(result).toContain("stj");
      expect(result).toContain("artigo");
      expect(result).toContain("456");
    });

    it("deve normalizar termos jurídicos", () => {
      const result = normalizeText("Ação de Cobrança vs Contestação");
      expect(result).toContain("acao"); // sem ç
      expect(result).toContain("cobranca");
      expect(result).toContain("contestacao");
    });
  });

  describe("searchSimilarDocuments", () => {
    const sampleDocs = [
      {
        id: 1,
        title: "Súmula 100 do STJ",
        content: "Trata sobre competência da justiça federal",
        documentType: "sumula"
      },
      {
        id: 2,
        title: "Súmula 200 do STF",
        content: "Versa sobre direito tributário e ICMS",
        documentType: "sumula"
      },
      {
        id: 3,
        title: "Artigo sobre Dano Moral",
        content: "Discussão sobre dano moral e sua quantificação jurisprudencial",
        documentType: "artigo"
      },
      {
        id: 4,
        title: "Jurisprudência sobre Competência",
        content: "Análise de competência territorial e funcional",
        documentType: "jurisprudencia"
      }
    ];

    it("deve encontrar documento por correspondência exata no título", () => {
      const results = searchSimilarDocuments(sampleDocs, "Súmula 100");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe(1);
      expect(results[0].title).toBe("Súmula 100 do STJ");
    });

    it("deve aplicar boost para números no título", () => {
      const results = searchSimilarDocuments(sampleDocs, "súmula 200");

      expect(results[0].id).toBe(2);
      expect(results[0].similarity).toBeGreaterThan(5); // Boost alto
    });

    it("deve buscar por conteúdo quando não há match no título", () => {
      const results = searchSimilarDocuments(sampleDocs, "direito tributário ICMS");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe(2); // Doc que contém "tributário" e "ICMS"
    });

    it("deve respeitar limite de resultados", () => {
      const results = searchSimilarDocuments(sampleDocs, "competência", { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("deve filtrar por minSimilarity", () => {
      const results = searchSimilarDocuments(sampleDocs, "teste inexistente", {
        minSimilarity: 0.5
      });

      // Query sem match não deve retornar resultados
      expect(results.length).toBe(0);
    });

    it("deve filtrar por tipo de documento", () => {
      const results = searchSimilarDocuments(sampleDocs, "competência", {
        filterTypes: ["sumula"]
      });

      expect(results.every(r => r.documentType === "sumula")).toBe(true);
    });

    it("deve retornar array vazio se nenhum documento corresponder ao filtro", () => {
      const results = searchSimilarDocuments(sampleDocs, "teste", {
        filterTypes: ["tipo_inexistente"]
      });

      expect(results).toEqual([]);
    });

    it("deve ordenar por similaridade decrescente", () => {
      const results = searchSimilarDocuments(sampleDocs, "competência");

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it("deve retornar todos os campos do documento", () => {
      const results = searchSimilarDocuments(sampleDocs, "Súmula 100");

      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("content");
      expect(results[0]).toHaveProperty("similarity");
      expect(results[0]).toHaveProperty("documentType");
    });

    it("deve calcular similarity entre 0 e infinito", () => {
      const results = searchSimilarDocuments(sampleDocs, "competência");

      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(isFinite(result.similarity)).toBe(true);
      });
    });

    it("deve lidar com query vazia", () => {
      const results = searchSimilarDocuments(sampleDocs, "");

      // Query vazia não deve gerar matches
      expect(results.length).toBe(0);
    });

    it("deve lidar com array de documentos vazio", () => {
      const results = searchSimilarDocuments([], "teste");

      expect(results).toEqual([]);
    });

    it("deve ignorar case sensitivity", () => {
      const results1 = searchSimilarDocuments(sampleDocs, "SÚMULA 100");
      const results2 = searchSimilarDocuments(sampleDocs, "súmula 100");

      expect(results1[0]?.id).toBe(results2[0]?.id);
    });

    it("deve lidar com acentuação na query", () => {
      const results = searchSimilarDocuments(sampleDocs, "competência");

      expect(results.length).toBeGreaterThan(0);
    });

    it("deve favorecer documentos com múltiplos termos da query", () => {
      const docs = [
        {
          id: 1,
          title: "Doc com um termo",
          content: "competência",
          documentType: "teste"
        },
        {
          id: 2,
          title: "Doc com dois termos",
          content: "competência territorial federal",
          documentType: "teste"
        }
      ];

      const results = searchSimilarDocuments(docs, "competência territorial");

      // Doc 2 tem mais termos da query
      expect(results[0].id).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("deve lidar com caracteres especiais na query", () => {
      const docs = [
        { id: 1, title: "Test", content: "test content", documentType: "test" }
      ];

      const results = searchSimilarDocuments(docs, "test@#$%^&*()");

      expect(results).toBeDefined();
    });

    it("deve lidar com query muito longa", () => {
      const docs = [
        { id: 1, title: "Test", content: "test content", documentType: "test" }
      ];

      const longQuery = "palavra ".repeat(100);
      const results = searchSimilarDocuments(docs, longQuery);

      expect(results).toBeDefined();
    });

    it("deve lidar com documentos sem documentType", () => {
      const docs = [
        { id: 1, title: "Test", content: "test content" }
      ];

      const results = searchSimilarDocuments(docs as any, "test");

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it("deve lidar com conteúdo muito longo", () => {
      const docs = [
        {
          id: 1,
          title: "Test",
          content: "palavra ".repeat(10000),
          documentType: "test"
        }
      ];

      const results = searchSimilarDocuments(docs, "palavra");

      expect(results).toBeDefined();
      expect(results[0].similarity).toBeGreaterThan(0);
    });

    it("deve lidar com título e conteúdo vazios", () => {
      const docs = [
        { id: 1, title: "", content: "", documentType: "test" }
      ];

      const results = searchSimilarDocuments(docs, "test");

      expect(results).toBeDefined();
    });
  });

  describe("Busca por Números (Súmulas/Artigos)", () => {
    const legalDocs = [
      { id: 1, title: "Súmula 10 do STJ", content: "Conteúdo da súmula 10", documentType: "sumula" },
      { id: 2, title: "Súmula 100 do STJ", content: "Conteúdo da súmula 100", documentType: "sumula" },
      { id: 3, title: "Súmula 1000 do STF", content: "Conteúdo da súmula 1000", documentType: "sumula" },
    ];

    it("deve encontrar Súmula 10 sem confundir com 100 ou 1000", () => {
      const results = searchSimilarDocuments(legalDocs, "Súmula 10");

      expect(results[0].id).toBe(1);
      expect(results[0].title).toContain("Súmula 10");
    });

    it("deve encontrar Súmula 100 corretamente", () => {
      const results = searchSimilarDocuments(legalDocs, "Súmula 100");

      expect(results[0].id).toBe(2);
    });

    it("deve aplicar boost alto para match exato de número", () => {
      const results = searchSimilarDocuments(legalDocs, "sumula 1000");

      expect(results[0].id).toBe(3);
      expect(results[0].similarity).toBeGreaterThan(5);
    });
  });

  describe("Busca por Substring no Título", () => {
    const docs = [
      { id: 1, title: "Dano Moral em Relações de Consumo", content: "...", documentType: "artigo" },
      { id: 2, title: "Competência Territorial", content: "...", documentType: "artigo" },
    ];

    it("deve dar boost para substring no título", () => {
      const results = searchSimilarDocuments(docs, "Dano Moral");

      expect(results[0].id).toBe(1);
      expect(results[0].similarity).toBeGreaterThan(3);
    });

    it("deve funcionar com case insensitive", () => {
      const results = searchSimilarDocuments(docs, "dano moral");

      expect(results[0].id).toBe(1);
    });
  });
});
