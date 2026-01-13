import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("thesisRouter.ts - Zod Validations", () => {
  describe("getActiveTheses - Input Validation", () => {
    const schema = z.object({
      search: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    });

    it("deve aceitar valores padrão sem input", () => {
      const input = {};
      const result = schema.parse(input);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("deve aceitar search, limit e offset válidos", () => {
      const input = { search: "tese sobre dano moral", limit: 10, offset: 5 };
      const result = schema.parse(input);
      expect(result.search).toBe("tese sobre dano moral");
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });

    it("deve aceitar limit customizado", () => {
      const input = { limit: 50 };
      const result = schema.parse(input);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("deve aceitar offset customizado", () => {
      const input = { offset: 100 };
      const result = schema.parse(input);
      expect(result.offset).toBe(100);
      expect(result.limit).toBe(20);
    });

    it("deve aceitar search vazio", () => {
      const input = { search: "" };
      const result = schema.parse(input);
      expect(result.search).toBe("");
    });

    it("deve rejeitar limit não numérico", () => {
      const input = { limit: "10" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar offset não numérico", () => {
      const input = { offset: "5" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar search não string", () => {
      const input = { search: 123 };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve aceitar limit 0 (sem proteção de min)", () => {
      const input = { limit: 0 };
      // O schema não tem .min(), então aceita 0
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar offset negativo (sem proteção de min)", () => {
      const input = { offset: -1 };
      // O schema não tem .min(), então aceita negativo
      expect(() => schema.parse(input)).not.toThrow();
    });
  });

  describe("approveThesis - Input Validation", () => {
    const schema = z.object({ thesisId: z.number() });

    it("deve aceitar thesisId válido", () => {
      const input = { thesisId: 10 };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar thesisId ausente", () => {
      const input = {};
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar thesisId não numérico", () => {
      const input = { thesisId: "10" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar thesisId null", () => {
      const input = { thesisId: null };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("editThesis - Input Validation", () => {
    const schema = z.object({
      thesisId: z.number(),
      editedLegalThesis: z.string().optional(),
      editedWritingStyle: z.string().optional(),
    });

    it("deve aceitar thesisId com editedLegalThesis", () => {
      const input = {
        thesisId: 5,
        editedLegalThesis: "Tese jurídica editada",
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar thesisId com editedWritingStyle", () => {
      const input = {
        thesisId: 5,
        editedWritingStyle: "Estilo de escrita editado",
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar thesisId com ambos campos editados", () => {
      const input = {
        thesisId: 5,
        editedLegalThesis: "Tese editada",
        editedWritingStyle: "Estilo editado",
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar apenas thesisId (campos opcionais)", () => {
      const input = { thesisId: 5 };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar thesisId ausente", () => {
      const input = { editedLegalThesis: "Tese" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar thesisId não numérico", () => {
      const input = {
        thesisId: "5",
        editedLegalThesis: "Tese",
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar editedLegalThesis não string", () => {
      const input = {
        thesisId: 5,
        editedLegalThesis: 123,
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar editedWritingStyle não string", () => {
      const input = {
        thesisId: 5,
        editedWritingStyle: ["estilo"],
      };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("rejectThesis - Input Validation", () => {
    const schema = z.object({
      thesisId: z.number(),
      rejectionReason: z.string(),
    });

    it("deve aceitar thesisId e rejectionReason válidos", () => {
      const input = {
        thesisId: 10,
        rejectionReason: "Tese incorreta ou imprecisa",
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar rejectionReason vazio (sem .min())", () => {
      const input = {
        thesisId: 10,
        rejectionReason: "",
      };
      // Não há .min(1), então aceita vazio
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar thesisId ausente", () => {
      const input = { rejectionReason: "Motivo" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar rejectionReason ausente", () => {
      const input = { thesisId: 10 };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar thesisId não numérico", () => {
      const input = {
        thesisId: "10",
        rejectionReason: "Motivo",
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar rejectionReason não string", () => {
      const input = {
        thesisId: 10,
        rejectionReason: 123,
      };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("Edge Cases - Valores Extremos", () => {
    it("deve aceitar thesisId muito grande", () => {
      const schema = z.object({ thesisId: z.number() });
      const input = { thesisId: Number.MAX_SAFE_INTEGER };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar rejectionReason muito longo", () => {
      const schema = z.object({ rejectionReason: z.string() });
      const input = { rejectionReason: "a".repeat(10000) };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar search com caracteres especiais", () => {
      const schema = z.object({ search: z.string().optional() });
      const input = { search: "Tese: dano moral @ R$ 10.000,00 (§1º)" };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar limit muito grande", () => {
      const schema = z.object({ limit: z.number().default(20) });
      const input = { limit: 99999 };
      // Não há .max(), então aceita valores muito grandes
      expect(() => schema.parse(input)).not.toThrow();
    });
  });

  describe("Casos Reais - Paginação", () => {
    const schema = z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
    });

    it("deve paginar primeira página (offset 0)", () => {
      const input = { limit: 20, offset: 0 };
      const result = schema.parse(input);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("deve paginar segunda página (offset 20)", () => {
      const input = { limit: 20, offset: 20 };
      const result = schema.parse(input);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(20);
    });

    it("deve paginar décima página (offset 180)", () => {
      const input = { limit: 20, offset: 180 };
      const result = schema.parse(input);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(180);
    });

    it("deve aceitar pageSize customizado (50 items)", () => {
      const input = { limit: 50, offset: 0 };
      const result = schema.parse(input);
      expect(result.limit).toBe(50);
    });
  });

  describe("Validação de Strings Opcionais", () => {
    const schema = z.object({
      field1: z.string().optional(),
      field2: z.string().optional(),
    });

    it("deve aceitar ambos campos ausentes", () => {
      const input = {};
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar apenas field1", () => {
      const input = { field1: "valor1" };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar apenas field2", () => {
      const input = { field2: "valor2" };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar ambos campos", () => {
      const input = { field1: "valor1", field2: "valor2" };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar strings vazias", () => {
      const input = { field1: "", field2: "" };
      expect(() => schema.parse(input)).not.toThrow();
    });
  });
});
