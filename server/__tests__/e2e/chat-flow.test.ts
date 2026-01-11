/**
 * E2E Tests: Chat Flow
 *
 * Testa o fluxo completo de conversação do DAVID
 * BASELINE para garantir que refatorações futuras não quebrem funcionalidade
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createTestUser, createTestConversation, cleanupTestData, createMockContext } from "../helpers/testSetup";
import { davidRouter } from "../../davidRouter";
import type { TestUser } from "../helpers/testSetup";

describe("Chat Flow E2E", () => {
  let testUser: TestUser;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeAll(async () => {
    // Criar usuário de teste
    testUser = await createTestUser();
    mockContext = createMockContext(testUser);

    console.log(`[Test Setup] Created test user: ${testUser.email} (ID: ${testUser.id})`);
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (testUser) {
      await cleanupTestData(testUser.id);
      console.log(`[Test Cleanup] Cleaned up test user: ${testUser.id}`);
    }
  });

  describe("Create Conversation", () => {
    it("should create a new conversation", async () => {
      const caller = davidRouter.createCaller(mockContext);

      const result = await caller.createConversation({
        title: "Test Conversation",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeTypeOf("number");
      expect(result.title).toBe("Test Conversation");
    });

    it("should create conversation with default title", async () => {
      const caller = davidRouter.createCaller(mockContext);

      const result = await caller.createConversation({});

      expect(result).toBeDefined();
      expect(result.title).toBe("Nova conversa");
    });
  });

  describe("Send Message (Non-Streaming)", () => {
    let conversationId: number;

    beforeEach(async () => {
      // Criar nova conversa para cada teste
      const conversation = await createTestConversation(testUser.id);
      conversationId = conversation.id;
    });

    it("should send a message and get response", async () => {
      const caller = davidRouter.createCaller(mockContext);

      const result = await caller.sendMessage({
        conversationId,
        content: "Olá, DAVID! Este é um teste.",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeTypeOf("string");
      expect(result.content.length).toBeGreaterThan(0);
    }, { timeout: 30000 }); // LLM pode demorar

    it("should save user message to database", async () => {
      const caller = davidRouter.createCaller(mockContext);

      await caller.sendMessage({
        conversationId,
        content: "Mensagem de teste",
      });

      // Verificar se mensagem foi salva
      const messages = await caller.getConversationMessages({ conversationId });

      const userMessage = messages.find(m => m.role === "user" && m.content === "Mensagem de teste");
      expect(userMessage).toBeDefined();
    }, { timeout: 30000 });

    it("should save assistant response to database", async () => {
      const caller = davidRouter.createCaller(mockContext);

      await caller.sendMessage({
        conversationId,
        content: "Teste de resposta",
      });

      // Verificar se resposta foi salva
      const messages = await caller.getConversationMessages({ conversationId });

      const assistantMessage = messages.find(m => m.role === "assistant");
      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toBeTypeOf("string");
      expect(assistantMessage?.content.length).toBeGreaterThan(0);
    }, { timeout: 30000 });

    it("should fail if conversation does not exist", async () => {
      const caller = davidRouter.createCaller(mockContext);

      await expect(
        caller.sendMessage({
          conversationId: 999999, // ID inexistente
          content: "Teste",
        })
      ).rejects.toThrow("Conversa não encontrada");
    });

    it("should fail if user does not own conversation", async () => {
      // Criar outro usuário
      const otherUser = await createTestUser();
      const otherConversation = await createTestConversation(otherUser.id);

      const caller = davidRouter.createCaller(mockContext);

      await expect(
        caller.sendMessage({
          conversationId: otherConversation.id,
          content: "Teste",
        })
      ).rejects.toThrow("Conversa não encontrada");

      // Cleanup
      await cleanupTestData(otherUser.id);
    });
  });

  describe("Message History", () => {
    let conversationId: number;

    beforeEach(async () => {
      const conversation = await createTestConversation(testUser.id);
      conversationId = conversation.id;
    });

    it("should retrieve conversation messages in order", async () => {
      const caller = davidRouter.createCaller(mockContext);

      // Enviar 2 mensagens
      await caller.sendMessage({ conversationId, content: "Primeira mensagem" });
      await caller.sendMessage({ conversationId, content: "Segunda mensagem" });

      // Buscar histórico
      const messages = await caller.getConversationMessages({ conversationId });

      expect(messages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant

      // Verificar ordem
      const userMessages = messages.filter(m => m.role === "user");
      expect(userMessages[0].content).toBe("Primeira mensagem");
      expect(userMessages[1].content).toBe("Segunda mensagem");
    }, { timeout: 60000 });

    it("should include message metadata", async () => {
      const caller = davidRouter.createCaller(mockContext);

      await caller.sendMessage({ conversationId, content: "Teste metadata" });

      const messages = await caller.getConversationMessages({ conversationId });
      const message = messages[0];

      expect(message).toHaveProperty("id");
      expect(message).toHaveProperty("conversationId");
      expect(message).toHaveProperty("role");
      expect(message).toHaveProperty("content");
      expect(message).toHaveProperty("createdAt");
    }, { timeout: 30000 });
  });

  describe("Context and RAG", () => {
    let conversationId: number;

    beforeEach(async () => {
      const conversation = await createTestConversation(testUser.id);
      conversationId = conversation.id;
    });

    it("should handle messages without RAG context", async () => {
      const caller = davidRouter.createCaller(mockContext);

      // Mensagem simples sem necessidade de RAG
      const result = await caller.sendMessage({
        conversationId,
        content: "Quanto é 2 + 2?",
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    }, { timeout: 30000 });

    // TODO: Adicionar teste com RAG quando houver documentos na base
    it.skip("should use RAG when knowledge base has relevant docs", async () => {
      // Implementar quando tivermos seed de knowledge base para testes
    });

    // TODO: Adicionar teste com processo
    it.skip("should include process context when conversation has processId", async () => {
      // Implementar quando tivermos seed de processos para testes
    });
  });

  describe("Edge Cases", () => {
    let conversationId: number;

    beforeEach(async () => {
      const conversation = await createTestConversation(testUser.id);
      conversationId = conversation.id;
    });

    it("should handle empty message", async () => {
      const caller = davidRouter.createCaller(mockContext);

      await expect(
        caller.sendMessage({
          conversationId,
          content: "",
        })
      ).rejects.toThrow();
    });

    it("should handle very long message", async () => {
      const caller = davidRouter.createCaller(mockContext);

      const longMessage = "A".repeat(10000); // 10k caracteres

      const result = await caller.sendMessage({
        conversationId,
        content: longMessage,
      });

      expect(result.content).toBeDefined();
    }, { timeout: 60000 });

    it("should handle special characters", async () => {
      const caller = davidRouter.createCaller(mockContext);

      const specialMessage = "Teste com caracteres especiais: @#$%&*()_+{}[]|\\:;\"'<>?,./";

      const result = await caller.sendMessage({
        conversationId,
        content: specialMessage,
      });

      expect(result.content).toBeDefined();
    }, { timeout: 30000 });
  });
});
