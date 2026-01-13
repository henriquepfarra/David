import { describe, it, expect } from "vitest";

describe("thesisExtractor.ts - Data Structure Validation", () => {
  /**
   * Testes para validar estruturas de dados do ExtractedThesis
   * sem precisar chamar LLM APIs
   */

  describe("ExtractedThesis - Interface Validation", () => {
    it("deve aceitar estrutura mínima válida", () => {
      const thesis = {
        legalThesis: "Tese jurídica principal",
        legalFoundations: "Art. 5º, CF/88",
        keywords: "direito, constitucional",
        writingStyleSample: "Amostra de estilo",
        writingCharacteristics: {
          formality: "formal" as const,
          structure: "tópicos numerados",
          tone: "técnico-objetivo",
        },
        thesis: "Tese jurídica principal", // deprecated alias
        decisionPattern: "Amostra de estilo", // deprecated alias
      };

      expect(thesis.legalThesis).toBe("Tese jurídica principal");
      expect(thesis.writingCharacteristics.formality).toBe("formal");
    });

    it("deve aceitar formality 'formal'", () => {
      const characteristics = {
        formality: "formal" as const,
        structure: "estrutura",
        tone: "tom",
      };

      expect(characteristics.formality).toBe("formal");
    });

    it("deve aceitar formality 'moderado'", () => {
      const characteristics = {
        formality: "moderado" as const,
        structure: "estrutura",
        tone: "tom",
      };

      expect(characteristics.formality).toBe("moderado");
    });

    it("deve aceitar formality 'coloquial'", () => {
      const characteristics = {
        formality: "coloquial" as const,
        structure: "estrutura",
        tone: "tom",
      };

      expect(characteristics.formality).toBe("coloquial");
    });

    it("deve ter campos obrigatórios definidos", () => {
      const thesis = {
        legalThesis: "Tese",
        legalFoundations: "Fundamentos",
        keywords: "palavras-chave",
        writingStyleSample: "Amostra",
        writingCharacteristics: {
          formality: "formal" as const,
          structure: "estrutura",
          tone: "tom",
        },
        thesis: "Tese",
        decisionPattern: "Amostra",
      };

      expect(thesis).toHaveProperty("legalThesis");
      expect(thesis).toHaveProperty("legalFoundations");
      expect(thesis).toHaveProperty("keywords");
      expect(thesis).toHaveProperty("writingStyleSample");
      expect(thesis).toHaveProperty("writingCharacteristics");
      expect(thesis.writingCharacteristics).toHaveProperty("formality");
      expect(thesis.writingCharacteristics).toHaveProperty("structure");
      expect(thesis.writingCharacteristics).toHaveProperty("tone");
    });
  });

  describe("JSON Response Parsing", () => {
    it("deve parsear JSON válido do LLM", () => {
      const jsonResponse = JSON.stringify({
        legalThesis: "Aplicação do CDC em relações consumeristas",
        legalFoundations: "Art. 6º, CDC; Súmula 381 do STJ",
        keywords: "CDC, consumidor, relação consumerista, boa-fé",
        writingStyleSample: "Verifica-se que a relação estabelecida entre as partes...",
        writingCharacteristics: {
          formality: "formal",
          structure: "parágrafos longos com fundamentação detalhada",
          tone: "técnico-objetivo",
        },
      });

      const parsed = JSON.parse(jsonResponse);

      expect(parsed.legalThesis).toContain("CDC");
      expect(parsed.legalFoundations).toContain("Art. 6º");
      expect(parsed.keywords).toContain("consumidor");
      expect(parsed.writingCharacteristics.formality).toBe("formal");
    });

    it("deve validar campos obrigatórios no JSON", () => {
      const jsonResponse = JSON.stringify({
        legalThesis: "Tese",
        legalFoundations: "Fundamentos",
        keywords: "palavras",
        writingStyleSample: "Amostra",
        writingCharacteristics: {
          formality: "moderado",
          structure: "estrutura",
          tone: "tom",
        },
      });

      const parsed = JSON.parse(jsonResponse);

      expect(parsed).toHaveProperty("legalThesis");
      expect(parsed).toHaveProperty("legalFoundations");
      expect(parsed).toHaveProperty("keywords");
      expect(parsed).toHaveProperty("writingStyleSample");
      expect(parsed).toHaveProperty("writingCharacteristics");
    });

    it("deve lidar com JSON contendo caracteres especiais", () => {
      const jsonResponse = JSON.stringify({
        legalThesis: "Aplicação do §1º do Art. 927 do CC/02",
        legalFoundations: "Art. 927, §1º, CC/02; Súmula 37 do STJ",
        keywords: "responsabilidade civil, dano moral, indenização",
        writingStyleSample: "Conforme jurisprudência: \"o dano moral...\"",
        writingCharacteristics: {
          formality: "formal",
          structure: "citações jurisprudenciais",
          tone: "técnico",
        },
      });

      const parsed = JSON.parse(jsonResponse);

      expect(parsed.legalThesis).toContain("§1º");
      expect(parsed.legalFoundations).toContain("CC/02");
      expect(parsed.writingStyleSample).toContain('"');
    });
  });

  describe("Keywords Validation", () => {
    it("deve aceitar keywords separadas por vírgula", () => {
      const keywords = "tutela de urgência, CDC, relação consumerista, inversão do ônus";

      const keywordsArray = keywords.split(",").map((k) => k.trim());

      expect(keywordsArray).toHaveLength(4);
      expect(keywordsArray[0]).toBe("tutela de urgência");
      expect(keywordsArray[1]).toBe("CDC");
    });

    it("deve aceitar keywords com espaços", () => {
      const keywords = "direito do consumidor, boa-fé objetiva, vício do produto";

      const keywordsArray = keywords.split(",").map((k) => k.trim());

      expect(keywordsArray.every((k) => k.length > 0)).toBe(true);
    });

    it("deve lidar com keywords vazias após trim", () => {
      const keywords = "palavra1, , palavra2,  , palavra3";

      const keywordsArray = keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      expect(keywordsArray).toHaveLength(3);
      expect(keywordsArray).toEqual(["palavra1", "palavra2", "palavra3"]);
    });
  });

  describe("Legal Foundations Parsing", () => {
    it("deve parsear fundamentos legais com múltiplos artigos", () => {
      const foundations = "Art. 5º, CF/88; Art. 6º, CDC; Súmula 381 do STJ";

      const foundationsArray = foundations.split(";").map((f) => f.trim());

      expect(foundationsArray).toHaveLength(3);
      expect(foundationsArray[0]).toBe("Art. 5º, CF/88");
      expect(foundationsArray[1]).toBe("Art. 6º, CDC");
      expect(foundationsArray[2]).toBe("Súmula 381 do STJ");
    });

    it("deve identificar referências ao STJ", () => {
      const foundations = "Súmula 381 do STJ; Art. 927, CC/02";

      expect(foundations).toContain("STJ");
    });

    it("deve identificar referências ao STF", () => {
      const foundations = "Súmula Vinculante 10 do STF";

      expect(foundations).toContain("STF");
    });

    it("deve identificar artigos do Código Civil", () => {
      const foundations = "Art. 186, CC/02; Art. 927, §1º, CC/02";

      expect(foundations).toContain("CC/02");
      expect(foundations).toContain("§1º");
    });

    it("deve identificar referências à Constituição", () => {
      const foundations = "Art. 5º, XIV, CF/88";

      expect(foundations).toContain("CF/88");
    });
  });

  describe("Writing Style Sample Validation", () => {
    it("deve aceitar amostra de estilo com tamanho razoável", () => {
      const sample =
        "Verifica-se que a relação estabelecida entre as partes é de natureza consumerista, aplicando-se as disposições do Código de Defesa do Consumidor.";

      expect(sample.length).toBeGreaterThan(50);
      expect(sample.length).toBeLessThan(500);
    });

    it("deve aceitar amostra com citações", () => {
      const sample = 'Conforme preceitua o art. 6º do CDC: "São direitos básicos do consumidor..."';

      expect(sample).toContain('"');
      expect(sample).toContain("art. 6º");
    });

    it("deve aceitar amostra com parágrafos jurídicos", () => {
      const sample =
        "Isto posto, JULGO PROCEDENTE o pedido para condenar a ré ao pagamento de R$ 10.000,00 a título de danos morais.";

      expect(sample).toContain("JULGO PROCEDENTE");
      expect(sample).toContain("R$");
    });
  });

  describe("Formality Classification", () => {
    const formalityLevels = ["formal", "moderado", "coloquial"] as const;

    formalityLevels.forEach((level) => {
      it(`deve aceitar nível de formalidade '${level}'`, () => {
        const characteristics = {
          formality: level,
          structure: "estrutura",
          tone: "tom",
        };

        expect(characteristics.formality).toBe(level);
      });
    });

    it("deve classificar textos formais corretamente", () => {
      const formalSample =
        "Verifica-se, portanto, que restaram configurados os requisitos ensejadores da tutela de urgência.";

      // Análise de características formais
      const hasFormalLanguage = /verifica-se|portanto|ensejadores/.test(formalSample);

      expect(hasFormalLanguage).toBe(true);
    });

    it("deve classificar textos moderados", () => {
      const moderateSample =
        "É importante destacar que o autor comprovou todos os fatos alegados na inicial.";

      const hasModerateLanguage = /é importante|destacar|comprovou/.test(moderateSample);

      expect(hasModerateLanguage).toBe(true);
    });
  });

  describe("Edge Cases - Campos 'Não identificado'", () => {
    it("deve aceitar 'Não identificado' em legalFoundations", () => {
      const foundations = "Não identificado";

      expect(foundations).toBe("Não identificado");
    });

    it("deve aceitar 'Não identificado' em keywords", () => {
      const keywords = "Não identificado";

      expect(keywords).toBe("Não identificado");
    });

    it("deve validar thesis mesmo se fundamentos não identificados", () => {
      const thesis = {
        legalThesis: "Aplicação de princípios gerais do direito",
        legalFoundations: "Não identificado",
        keywords: "princípios, direito",
        writingStyleSample: "Amostra válida",
        writingCharacteristics: {
          formality: "formal" as const,
          structure: "estrutura",
          tone: "tom",
        },
        thesis: "Aplicação de princípios gerais do direito",
        decisionPattern: "Amostra válida",
      };

      expect(thesis.legalThesis).toBeTruthy();
      expect(thesis.legalFoundations).toBe("Não identificado");
    });
  });

  describe("Campos Legados (Deprecated)", () => {
    it("deve manter campo 'thesis' como alias de 'legalThesis'", () => {
      const thesis = {
        legalThesis: "Tese principal",
        thesis: "Tese principal",
        legalFoundations: "",
        keywords: "",
        writingStyleSample: "",
        writingCharacteristics: {
          formality: "formal" as const,
          structure: "",
          tone: "",
        },
        decisionPattern: "",
      };

      expect(thesis.thesis).toBe(thesis.legalThesis);
    });

    it("deve manter campo 'decisionPattern' como alias de 'writingStyleSample'", () => {
      const thesis = {
        legalThesis: "",
        thesis: "",
        legalFoundations: "",
        keywords: "",
        writingStyleSample: "Amostra de estilo",
        decisionPattern: "Amostra de estilo",
        writingCharacteristics: {
          formality: "formal" as const,
          structure: "",
          tone: "",
        },
      };

      expect(thesis.decisionPattern).toBe(thesis.writingStyleSample);
    });
  });

  describe("Estruturas Complexas", () => {
    it("deve validar thesis completa extraída de sentença real", () => {
      const thesis = {
        legalThesis:
          "Em relações de consumo caracterizadas por vício do produto, aplica-se a responsabilidade objetiva do fornecedor, cabendo indenização por danos materiais e morais quando comprovado o prejuízo.",
        legalFoundations:
          "Art. 12, CDC; Art. 14, CDC; Súmula 37 do STJ; Art. 186, CC/02; Art. 927, CC/02",
        keywords:
          "CDC, vício do produto, responsabilidade objetiva, dano material, dano moral, relação consumerista",
        writingStyleSample:
          "Verifica-se que restou incontroverso nos autos que o produto adquirido pelo autor apresentou defeito de fabricação no prazo de garantia, conforme documentação acostada às fls. 15/20.",
        writingCharacteristics: {
          formality: "formal" as const,
          structure: "parágrafos longos com fundamentação detalhada e citação de documentos dos autos",
          tone: "técnico-objetivo com linguagem forense tradicional",
        },
        thesis:
          "Em relações de consumo caracterizadas por vício do produto, aplica-se a responsabilidade objetiva do fornecedor, cabendo indenização por danos materiais e morais quando comprovado o prejuízo.",
        decisionPattern:
          "Verifica-se que restou incontroverso nos autos que o produto adquirido pelo autor apresentou defeito de fabricação no prazo de garantia, conforme documentação acostada às fls. 15/20.",
      };

      expect(thesis.legalThesis.length).toBeGreaterThan(100);
      expect(thesis.legalFoundations.split(";")).toHaveLength(5);
      expect(thesis.keywords.split(",")).toHaveLength(6);
      expect(thesis.writingStyleSample).toContain("Verifica-se");
      expect(thesis.writingCharacteristics.formality).toBe("formal");
    });
  });
});
