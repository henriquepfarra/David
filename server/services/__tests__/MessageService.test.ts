/**
 * Testes unitários para MessageService
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageService } from "../MessageService";
import * as db from "../../db";

// Mock do módulo db
vi.mock("../../db", () => ({
  createMessage: vi.fn(),
  getConversationMessages: vi.fn(),
}));

describe("MessageService", () => {
  let service: MessageService;

  beforeEach(() => {
    service = new MessageService();
    vi.clearAllMocks();
  });

  describe("saveUserMessage", () => {
    it("deve salvar mensagem com conversationId e content corretos", async () => {
      const params = {
        conversationId: 123,
        content: "Olá, preciso de ajuda",
      };

      await service.saveUserMessage(params);

      expect(db.createMessage).toHaveBeenCalledWith({
        conversationId: 123,
        role: "user",
        content: "Olá, preciso de ajuda",
      });
      expect(db.createMessage).toHaveBeenCalledTimes(1);
    });

    it("deve lançar erro se content estiver vazio", async () => {
      const params = {
        conversationId: 123,
        content: "",
      };

      await expect(service.saveUserMessage(params)).rejects.toThrow(
        "Conteúdo da mensagem não pode estar vazio"
      );

      expect(db.createMessage).not.toHaveBeenCalled();
    });

    it("deve lançar erro se content for apenas espaços em branco", async () => {
      const params = {
        conversationId: 123,
        content: "   ",
      };

      await expect(service.saveUserMessage(params)).rejects.toThrow(
        "Conteúdo da mensagem não pode estar vazio"
      );

      expect(db.createMessage).not.toHaveBeenCalled();
    });

    it("deve aceitar mensagens muito longas", async () => {
      const longContent = "A".repeat(100000);
      const params = {
        conversationId: 123,
        content: longContent,
      };

      await service.saveUserMessage(params);

      expect(db.createMessage).toHaveBeenCalledWith({
        conversationId: 123,
        role: "user",
        content: longContent,
      });
    });
  });

  describe("saveAssistantMessage", () => {
    it("deve salvar mensagem do assistente com content", async () => {
      const params = {
        conversationId: 123,
        content: "Aqui está a resposta",
      };

      await service.saveAssistantMessage(params);

      expect(db.createMessage).toHaveBeenCalledWith({
        conversationId: 123,
        role: "assistant",
        content: "Aqui está a resposta",
        thinking: undefined,
      });
      expect(db.createMessage).toHaveBeenCalledTimes(1);
    });

    it("deve salvar mensagem do assistente com thinking", async () => {
      const params = {
        conversationId: 123,
        content: "Aqui está a resposta",
        thinking: "Analisando o caso...",
      };

      await service.saveAssistantMessage(params);

      expect(db.createMessage).toHaveBeenCalledWith({
        conversationId: 123,
        role: "assistant",
        content: "Aqui está a resposta",
        thinking: "Analisando o caso...",
      });
    });

    it("deve lançar erro se content estiver vazio", async () => {
      const params = {
        conversationId: 123,
        content: "",
      };

      await expect(service.saveAssistantMessage(params)).rejects.toThrow(
        "Conteúdo da mensagem não pode estar vazio"
      );

      expect(db.createMessage).not.toHaveBeenCalled();
    });

    it("deve lançar erro se content for apenas espaços em branco", async () => {
      const params = {
        conversationId: 123,
        content: "   \n   ",
      };

      await expect(service.saveAssistantMessage(params)).rejects.toThrow(
        "Conteúdo da mensagem não pode estar vazio"
      );

      expect(db.createMessage).not.toHaveBeenCalled();
    });
  });

  describe("getConversationHistory", () => {
    it("deve retornar todas as mensagens se limit não for fornecido", async () => {
      const mockMessages = [
        {
          id: 1,
          conversationId: 123,
          role: "user" as const,
          content: "Mensagem 1",
          thinking: null,
          createdAt: new Date("2024-01-01"),
        },
        {
          id: 2,
          conversationId: 123,
          role: "assistant" as const,
          content: "Mensagem 2",
          thinking: null,
          createdAt: new Date("2024-01-02"),
        },
        {
          id: 3,
          conversationId: 123,
          role: "user" as const,
          content: "Mensagem 3",
          thinking: null,
          createdAt: new Date("2024-01-03"),
        },
      ];

      vi.mocked(db.getConversationMessages).mockResolvedValue(mockMessages);

      const result = await service.getConversationHistory(123);

      expect(result).toEqual(mockMessages);
      expect(db.getConversationMessages).toHaveBeenCalledWith(123);
    });

    it("deve retornar as últimas N mensagens quando limit é fornecido", async () => {
      const mockMessages = [
        {
          id: 1,
          conversationId: 123,
          role: "user" as const,
          content: "Mensagem 1",
          thinking: null,
          createdAt: new Date("2024-01-01"),
        },
        {
          id: 2,
          conversationId: 123,
          role: "assistant" as const,
          content: "Mensagem 2",
          thinking: null,
          createdAt: new Date("2024-01-02"),
        },
        {
          id: 3,
          conversationId: 123,
          role: "user" as const,
          content: "Mensagem 3",
          thinking: null,
          createdAt: new Date("2024-01-03"),
        },
        {
          id: 4,
          conversationId: 123,
          role: "assistant" as const,
          content: "Mensagem 4",
          thinking: null,
          createdAt: new Date("2024-01-04"),
        },
      ];

      vi.mocked(db.getConversationMessages).mockResolvedValue(mockMessages);

      const result = await service.getConversationHistory(123, 2);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Mensagem 3");
      expect(result[1].content).toBe("Mensagem 4");
    });

    it("deve retornar array vazio se conversa não tiver mensagens", async () => {
      vi.mocked(db.getConversationMessages).mockResolvedValue([]);

      const result = await service.getConversationHistory(999);

      expect(result).toEqual([]);
    });

    it("deve ignorar limit se for 0 ou negativo", async () => {
      const mockMessages = [
        {
          id: 1,
          conversationId: 123,
          role: "user" as const,
          content: "Mensagem 1",
          thinking: null,
          createdAt: new Date("2024-01-01"),
        },
      ];

      vi.mocked(db.getConversationMessages).mockResolvedValue(mockMessages);

      const result1 = await service.getConversationHistory(123, 0);
      const result2 = await service.getConversationHistory(123, -5);

      expect(result1).toEqual(mockMessages);
      expect(result2).toEqual(mockMessages);
    });
  });
});
