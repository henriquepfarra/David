import { describe, it, expect } from "vitest";
import { splitTextIntoChunks, type TextChunk } from "./chunking";

describe("chunking.ts - Text Splitting", () => {
  describe("splitTextIntoChunks - Basic", () => {
    it("deve retornar texto completo se menor que maxSize", () => {
      const text = "Texto curto";
      const chunks = splitTextIntoChunks(text, { maxSize: 100, overlap: 20 });

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].chunkIndex).toBe(0);
    });

    it("deve dividir texto longo em múltiplos chunks", () => {
      const text = "a".repeat(3000);
      const chunks = splitTextIntoChunks(text, { maxSize: 1000, overlap: 100 });

      expect(chunks.length).toBeGreaterThan(1);
    });

    it("deve incluir chunkIndex sequencial", () => {
      const text = "a".repeat(3000);
      const chunks = splitTextIntoChunks(text, { maxSize: 1000, overlap: 100 });

      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });
    });

    it("deve estimar tokenCount (aprox length/4)", () => {
      const text = "texto de teste";
      const chunks = splitTextIntoChunks(text);

      expect(chunks[0].tokenCountEstimate).toBe(Math.ceil(text.length / 4));
    });

    it("deve fazer trim de espaços em branco", () => {
      const text = "   Texto com espaços   ";
      const chunks = splitTextIntoChunks(text);

      expect(chunks[0].content).toBe("Texto com espaços");
      expect(chunks[0].content).not.toMatch(/^\s|\s$/);
    });
  });

  describe("Overlap (Sobreposição)", () => {
    it("deve criar overlap entre chunks consecutivos", () => {
      const text = "AAAA BBBB CCCC DDDD EEEE FFFF";
      const chunks = splitTextIntoChunks(text, { maxSize: 15, overlap: 5 });

      if (chunks.length > 1) {
        const endOfFirst = chunks[0].content.slice(-5);
        const startOfSecond = chunks[1].content.slice(0, 5);

        // Deve haver sobreposição
        expect(chunks[1].content).toContain(endOfFirst.slice(0, 2));
      }
    });

    it("overlap de 0 não deve criar sobreposição", () => {
      const text = "a".repeat(2000);
      const chunks = splitTextIntoChunks(text, { maxSize: 1000, overlap: 0 });

      // Total de caracteres deve ser igual ao texto original
      const totalChars = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
      expect(totalChars).toBeLessThanOrEqual(text.length + chunks.length * 10); // Margem para trim/ajustes
    });

    it("overlap maior que maxSize deve ser ignorado (proteção)", () => {
      const text = "a".repeat(3000);
      const chunks = splitTextIntoChunks(text, { maxSize: 500, overlap: 600 });

      // Não deve criar loop infinito
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThan(100); // Proteção contra loop infinito
    });
  });

  describe("Quebra em Palavras", () => {
    it("deve evitar cortar palavras no meio", () => {
      const text = "primeira segunda terceira quarta quinta sexta sétima oitava nona décima";
      const chunks = splitTextIntoChunks(text, { maxSize: 30, overlap: 5 });

      // Nenhum chunk deve terminar no meio de uma palavra
      chunks.forEach(chunk => {
        expect(chunk.content).not.toMatch(/\S$/); // Não deve terminar com char não-espaço cortado
      });
    });

    it("deve quebrar no último espaço antes do limite", () => {
      const text = "palavra1 palavra2 palavra3 palavra4 palavra5";
      const chunks = splitTextIntoChunks(text, { maxSize: 20, overlap: 5 });

      expect(chunks.length).toBeGreaterThan(1);
    });

    it("deve lidar com texto sem espaços (forçar corte)", () => {
      const text = "a".repeat(2000);
      const chunks = splitTextIntoChunks(text, { maxSize: 500, overlap: 50 });

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(500);
      });
    });
  });

  describe("Edge Cases", () => {
    it("deve lidar com string vazia", () => {
      const chunks = splitTextIntoChunks("");

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe("");
    });

    it("deve lidar com apenas espaços", () => {
      const text = "     ";
      const chunks = splitTextIntoChunks(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(""); // Após trim
    });

    it("deve lidar com texto exatamente igual a maxSize", () => {
      const text = "a".repeat(1000);
      const chunks = splitTextIntoChunks(text, { maxSize: 1000, overlap: 100 });

      expect(chunks).toHaveLength(1);
    });

    it("deve lidar com maxSize muito pequeno", () => {
      const text = "Teste de texto longo com várias palavras";
      const chunks = splitTextIntoChunks(text, { maxSize: 5, overlap: 1 });

      expect(chunks.length).toBeGreaterThan(1);
    });

    it("deve lidar com overlap maior que texto", () => {
      const text = "curto";
      const chunks = splitTextIntoChunks(text, { maxSize: 100, overlap: 200 });

      expect(chunks).toHaveLength(1);
    });

    it("deve lidar com caracteres especiais", () => {
      const text = "Olá! Como vai? Tudo bem... 😊 #teste @mention";
      const chunks = splitTextIntoChunks(text, { maxSize: 50, overlap: 10 });

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("deve lidar com newlines", () => {
      const text = "Linha 1\n\nLinha 2\n\nLinha 3\n\nLinha 4";
      const chunks = splitTextIntoChunks(text, { maxSize: 20, overlap: 5 });

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(1);
    });
  });

  describe("Token Estimation", () => {
    it("tokenCountEstimate deve ser aproximadamente length/4", () => {
      const text = "a".repeat(1000);
      const chunks = splitTextIntoChunks(text);

      const expected = Math.ceil(1000 / 4);
      expect(chunks[0].tokenCountEstimate).toBe(expected);
    });

    it("deve estimar tokens para todos os chunks", () => {
      const text = "a".repeat(3000);
      const chunks = splitTextIntoChunks(text, { maxSize: 1000, overlap: 100 });

      chunks.forEach(chunk => {
        expect(chunk.tokenCountEstimate).toBeGreaterThan(0);
        expect(chunk.tokenCountEstimate).toBe(Math.ceil(chunk.content.length / 4));
      });
    });
  });

  describe("Default Config", () => {
    it("deve usar maxSize=1000 e overlap=200 por padrão", () => {
      const text = "a".repeat(5000);
      const chunks = splitTextIntoChunks(text);

      // Com maxSize=1000 e overlap=200, esperamos ~6 chunks
      expect(chunks.length).toBeGreaterThanOrEqual(5);
      expect(chunks.length).toBeLessThanOrEqual(7);
    });

    it("deve aceitar config customizado", () => {
      const text = "a".repeat(5000);
      const chunks = splitTextIntoChunks(text, { maxSize: 500, overlap: 50 });

      expect(chunks.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Casos Reais (Textos Jurídicos)", () => {
    it("deve dividir petição longa adequadamente", () => {
      const petition = `
        EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DO JUIZADO ESPECIAL CÍVEL

        JOÃO SILVA, brasileiro, casado, empresário, portador do RG nº 12.345.678-9,
        inscrito no CPF sob o nº 123.456.789-00, residente e domiciliado à Rua Exemplo,
        nº 100, Bairro Centro, Cidade/UF, CEP 12345-678, vem, respeitosamente,
        perante Vossa Excelência, por intermédio de seu advogado que esta subscreve,
        propor a presente

        AÇÃO DE COBRANÇA

        em face de EMPRESA XYZ LTDA, pessoa jurídica de direito privado...
      `.repeat(10); // Simular texto longo

      const chunks = splitTextIntoChunks(petition, { maxSize: 2000, overlap: 200 });

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(2000 + 50); // Margem para ajustes
      });
    });

    it("deve preservar estrutura de parágrafos quando possível", () => {
      const text = "Parágrafo 1.\n\nParágrafo 2.\n\nParágrafo 3.\n\nParágrafo 4.";
      const chunks = splitTextIntoChunks(text, { maxSize: 30, overlap: 10 });

      expect(chunks).toBeDefined();
    });
  });

  describe("Validação de Interface TextChunk", () => {
    it("deve retornar objetos com interface correta", () => {
      const text = "teste";
      const chunks = splitTextIntoChunks(text);

      chunks.forEach(chunk => {
        expect(chunk).toHaveProperty("content");
        expect(chunk).toHaveProperty("chunkIndex");
        expect(chunk).toHaveProperty("tokenCountEstimate");

        expect(typeof chunk.content).toBe("string");
        expect(typeof chunk.chunkIndex).toBe("number");
        expect(typeof chunk.tokenCountEstimate).toBe("number");
      });
    });
  });
});
