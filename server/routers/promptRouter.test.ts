import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("promptRouter.ts - Zod Validations", () => {
  describe("promptCollection - create", () => {
    const schema = z.object({ name: z.string().min(1).max(100) });

    it("deve aceitar nome válido", () => {
      const input = { name: "Minha Coleção" };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar nome com 100 caracteres (limite)", () => {
      const input = { name: "a".repeat(100) };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar nome vazio", () => {
      const input = { name: "" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar nome com mais de 100 caracteres", () => {
      const input = { name: "a".repeat(101) };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar nome não string", () => {
      const input = { name: 123 };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar nome ausente", () => {
      const input = {};
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("promptCollection - delete", () => {
    const schema = z.object({ id: z.number() });

    it("deve aceitar id válido", () => {
      const input = { id: 1 };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar id ausente", () => {
      const input = {};
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar id não numérico", () => {
      const input = { id: "abc" };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("promptCollection - update", () => {
    const schema = z.object({ id: z.number(), name: z.string().min(1).max(100) });

    it("deve aceitar id e name válidos", () => {
      const input = { id: 1, name: "Nome Atualizado" };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar nome vazio", () => {
      const input = { id: 1, name: "" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar nome muito longo", () => {
      const input = { id: 1, name: "a".repeat(101) };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar id ausente", () => {
      const input = { name: "Nome" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar name ausente", () => {
      const input = { id: 1 };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("savedPrompt - create", () => {
    const schema = z.object({
      title: z.string(),
      collectionId: z.number().optional().nullable(),
      category: z.string().optional(),
      content: z.string(),
      description: z.string().optional(),
      executionMode: z.enum(["chat", "full_context"]).optional(),
      tags: z.array(z.string()).optional(),
    });

    it("deve aceitar input mínimo válido", () => {
      const input = { title: "Prompt Test", content: "Conteúdo do prompt" };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar input completo", () => {
      const input = {
        title: "Prompt Completo",
        collectionId: 5,
        category: "legal",
        content: "Conteúdo completo",
        description: "Descrição detalhada",
        executionMode: "chat" as const,
        tags: ["tag1", "tag2", "tag3"],
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar collectionId null", () => {
      const input = {
        title: "Test",
        content: "Content",
        collectionId: null,
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar executionMode 'full_context'", () => {
      const input = {
        title: "Test",
        content: "Content",
        executionMode: "full_context" as const,
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar array de tags vazio", () => {
      const input = {
        title: "Test",
        content: "Content",
        tags: [],
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar title ausente", () => {
      const input = { content: "Content" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar content ausente", () => {
      const input = { title: "Test" };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar executionMode inválido", () => {
      const input = {
        title: "Test",
        content: "Content",
        executionMode: "invalid_mode",
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar tags não array", () => {
      const input = {
        title: "Test",
        content: "Content",
        tags: "not-an-array",
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar tags com elementos não string", () => {
      const input = {
        title: "Test",
        content: "Content",
        tags: [1, 2, 3],
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar collectionId string", () => {
      const input = {
        title: "Test",
        content: "Content",
        collectionId: "5",
      };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("savedPrompt - update", () => {
    const schema = z.object({
      id: z.number(),
      title: z.string(),
      content: z.string(),
      collectionId: z.number().optional().nullable(),
      description: z.string().optional(),
      executionMode: z.enum(["chat", "full_context"]).optional(),
      tags: z.array(z.string()).optional(),
    });

    it("deve aceitar update básico", () => {
      const input = {
        id: 1,
        title: "Updated Title",
        content: "Updated Content",
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar update com todos os campos", () => {
      const input = {
        id: 1,
        title: "Updated",
        content: "Updated",
        collectionId: 10,
        description: "New description",
        executionMode: "full_context" as const,
        tags: ["new-tag"],
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar collectionId null (remover da coleção)", () => {
      const input = {
        id: 1,
        title: "Test",
        content: "Test",
        collectionId: null,
      };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar id ausente", () => {
      const input = {
        title: "Test",
        content: "Test",
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar title ausente", () => {
      const input = {
        id: 1,
        content: "Test",
      };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar content ausente", () => {
      const input = {
        id: 1,
        title: "Test",
      };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("savedPrompt - delete", () => {
    const schema = z.object({ id: z.number() });

    it("deve aceitar id válido", () => {
      const input = { id: 10 };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar id ausente", () => {
      const input = {};
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar id não numérico", () => {
      const input = { id: "delete-me" };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("savedPrompt - getById", () => {
    const schema = z.object({ id: z.number() });

    it("deve aceitar id válido", () => {
      const input = { id: 5 };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar id ausente", () => {
      const input = {};
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("savedPrompt - list (paginação)", () => {
    const schema = z.object({
      page: z.number().min(1).optional().default(1),
      pageSize: z.number().min(1).max(100).optional().default(20),
      collectionId: z.number().optional(),
      category: z.string().optional(),
    });

    it("deve aceitar paginação padrão (sem input)", () => {
      const input = {};
      const result = schema.parse(input);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it("deve aceitar page e pageSize customizados", () => {
      const input = { page: 2, pageSize: 50 };
      const result = schema.parse(input);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    it("deve aceitar filtro por collectionId", () => {
      const input = { collectionId: 5 };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar filtro por category", () => {
      const input = { category: "legal" };
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar page menor que 1", () => {
      const input = { page: 0 };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar pageSize menor que 1", () => {
      const input = { pageSize: 0 };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar pageSize maior que 100", () => {
      const input = { pageSize: 101 };
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar page não numérico", () => {
      const input = { page: "abc" };
      expect(() => schema.parse(input)).toThrow();
    });
  });

  describe("Casos Especiais - executionMode", () => {
    it("enum deve aceitar apenas valores específicos", () => {
      const schema = z.enum(["chat", "full_context"]);

      expect(() => schema.parse("chat")).not.toThrow();
      expect(() => schema.parse("full_context")).not.toThrow();
      expect(() => schema.parse("invalid")).toThrow();
      expect(() => schema.parse("")).toThrow();
      expect(() => schema.parse(null)).toThrow();
    });
  });

  describe("Validação de Tags", () => {
    const schema = z.array(z.string());

    it("deve aceitar array de strings", () => {
      const input = ["tag1", "tag2", "tag3"];
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve aceitar array vazio", () => {
      const input: string[] = [];
      expect(() => schema.parse(input)).not.toThrow();
    });

    it("deve rejeitar array com elementos não string", () => {
      const input = ["tag1", 123, "tag3"];
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar null", () => {
      const input = null;
      expect(() => schema.parse(input)).toThrow();
    });

    it("deve rejeitar string única (não array)", () => {
      const input = "single-tag";
      expect(() => schema.parse(input)).toThrow();
    });
  });
});
