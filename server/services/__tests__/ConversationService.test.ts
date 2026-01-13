/**
 * Testes unitários para ConversationService
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversationService } from "../ConversationService";
import * as db from "../../db";
import * as promptExecutor from "../../_core/promptExecutor";
import * as titleGenerator from "../../titleGenerator";

// Mock dos módulos
vi.mock("../../db", () => ({
  getConversationById: vi.fn(),
  getProcessForContext: vi.fn(),
  updateConversationTitle: vi.fn(),
}));

vi.mock("../../_core/promptExecutor", () => ({
  executeSavedPrompt: vi.fn(),
}));

vi.mock("../../titleGenerator", () => ({
  generateConversationTitle: vi.fn(),
}));

vi.mock("../../_core/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ConversationService", () => {
  let service: ConversationService;

  beforeEach(() => {
    service = new ConversationService();
    vi.clearAllMocks();
  });

  describe("validateAccess", () => {
    it("deve retornar conversa se usuário é o dono", async () => {
      const mockConversation = {
        id: 123,
        userId: 456,
        title: "Test Conversation",
        processId: null,
        isPinned: 0,
        googleFileUri: null,
        googleFileName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getConversationById).mockResolvedValue(mockConversation);

      const result = await service.validateAccess({
        conversationId: 123,
        userId: 456,
      });

      expect(result).toEqual(mockConversation);
      expect(db.getConversationById).toHaveBeenCalledWith(123);
    });

    it("deve lançar erro se conversa não existir", async () => {
      vi.mocked(db.getConversationById).mockResolvedValue(null);

      await expect(
        service.validateAccess({
          conversationId: 999,
          userId: 456,
        })
      ).rejects.toThrow("Conversa não encontrada");
    });

    it("deve lançar erro se usuário não é o dono", async () => {
      const mockConversation = {
        id: 123,
        userId: 456,
        title: "Test Conversation",
        processId: null,
        isPinned: 0,
        googleFileUri: null,
        googleFileName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getConversationById).mockResolvedValue(mockConversation);

      await expect(
        service.validateAccess({
          conversationId: 123,
          userId: 789, // Diferente do dono
        })
      ).rejects.toThrow("Você não tem permissão para acessar esta conversa");
    });
  });

  describe("tryExecuteCommand", () => {
    it("deve retornar null se content não começa com /", async () => {
      const result = await service.tryExecuteCommand({
        content: "Mensagem normal",
        conversationId: 123,
        userId: 456,
        processId: 789,
      });

      expect(result).toBeNull();
      expect(promptExecutor.executeSavedPrompt).not.toHaveBeenCalled();
    });

    it("deve retornar null se não há processo vinculado", async () => {
      const result = await service.tryExecuteCommand({
        content: "/analise",
        conversationId: 123,
        userId: 456,
        processId: null,
      });

      expect(result).toBeNull();
      expect(promptExecutor.executeSavedPrompt).not.toHaveBeenCalled();
    });

    it("deve retornar null se processo não existir", async () => {
      vi.mocked(db.getProcessForContext).mockResolvedValue(null);

      const result = await service.tryExecuteCommand({
        content: "/analise",
        conversationId: 123,
        userId: 456,
        processId: 789,
      });

      expect(result).toBeNull();
      expect(db.getProcessForContext).toHaveBeenCalledWith(789);
    });

    it("deve executar comando com sucesso", async () => {
      const mockProcess = {
        id: 789,
        processNumber: "0001234-56.2024.8.26.0100",
        plaintiff: "João Silva",
        defendant: "Empresa X",
        court: "1ª Vara Cível",
        subject: "Dano moral",
        facts: "Fatos do caso",
        requests: "Pedidos",
        status: "Em andamento",
      };

      vi.mocked(db.getProcessForContext).mockResolvedValue(mockProcess);
      vi.mocked(promptExecutor.executeSavedPrompt).mockResolvedValue(
        "Resultado da análise"
      );

      const result = await service.tryExecuteCommand({
        content: "/analise",
        conversationId: 123,
        userId: 456,
        processId: 789,
      });

      expect(result).toBe("Resultado da análise");
      expect(promptExecutor.executeSavedPrompt).toHaveBeenCalledWith({
        userId: 456,
        promptCommand: "/analise",
        processId: 789,
        processNumber: "0001234-56.2024.8.26.0100",
      });
    });

    it("deve retornar null se comando não encontrar prompt", async () => {
      const mockProcess = {
        id: 789,
        processNumber: "0001234-56.2024.8.26.0100",
        plaintiff: "João Silva",
        defendant: "Empresa X",
        court: "1ª Vara Cível",
        subject: "Dano moral",
        facts: "Fatos do caso",
        requests: "Pedidos",
        status: "Em andamento",
      };

      vi.mocked(db.getProcessForContext).mockResolvedValue(mockProcess);
      vi.mocked(promptExecutor.executeSavedPrompt).mockResolvedValue(null);

      const result = await service.tryExecuteCommand({
        content: "/comando_inexistente",
        conversationId: 123,
        userId: 456,
        processId: 789,
      });

      expect(result).toBeNull();
    });

    it("deve retornar null e logar erro se executeSavedPrompt falhar", async () => {
      const mockProcess = {
        id: 789,
        processNumber: "0001234-56.2024.8.26.0100",
        plaintiff: "João Silva",
        defendant: "Empresa X",
        court: "1ª Vara Cível",
        subject: "Dano moral",
        facts: "Fatos do caso",
        requests: "Pedidos",
        status: "Em andamento",
      };

      vi.mocked(db.getProcessForContext).mockResolvedValue(mockProcess);
      vi.mocked(promptExecutor.executeSavedPrompt).mockRejectedValue(
        new Error("Erro ao executar")
      );

      const result = await service.tryExecuteCommand({
        content: "/analise",
        conversationId: 123,
        userId: 456,
        processId: 789,
      });

      expect(result).toBeNull();
    });
  });

  describe("handleFirstMessageActions", () => {
    it("deve gerar título sem processo", async () => {
      vi.mocked(titleGenerator.generateConversationTitle).mockResolvedValue(
        "Título gerado"
      );

      await service.handleFirstMessageActions({
        conversationId: 123,
        content: "Primeira mensagem",
        processId: null,
      });

      // Aguardar um pouco para a promise resolver
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(titleGenerator.generateConversationTitle).toHaveBeenCalledWith(
        "Primeira mensagem",
        undefined
      );
      expect(db.updateConversationTitle).toHaveBeenCalledWith(
        123,
        "Título gerado"
      );
    });

    it("deve gerar título com informações do processo", async () => {
      const mockProcess = {
        id: 789,
        processNumber: "0001234-56.2024.8.26.0100",
        plaintiff: "João Silva",
        defendant: "Empresa X",
        court: "1ª Vara Cível",
        subject: "Dano moral",
        facts: "Fatos do caso",
        requests: "Pedidos",
        status: "Em andamento",
      };

      vi.mocked(db.getProcessForContext).mockResolvedValue(mockProcess);
      vi.mocked(titleGenerator.generateConversationTitle).mockResolvedValue(
        "Processo 0001234-56.2024.8.26.0100"
      );

      await service.handleFirstMessageActions({
        conversationId: 123,
        content: "Primeira mensagem",
        processId: 789,
      });

      // Aguardar um pouco para a promise resolver
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(db.getProcessForContext).toHaveBeenCalledWith(789);
      expect(titleGenerator.generateConversationTitle).toHaveBeenCalledWith(
        "Primeira mensagem",
        {
          processNumber: "0001234-56.2024.8.26.0100",
          subject: "Dano moral",
          plaintiff: "João Silva",
          defendant: "Empresa X",
        }
      );
    });

    it("não deve bloquear se geração de título falhar", async () => {
      vi.mocked(titleGenerator.generateConversationTitle).mockRejectedValue(
        new Error("Erro ao gerar título")
      );

      // Não deve lançar erro
      await expect(
        service.handleFirstMessageActions({
          conversationId: 123,
          content: "Primeira mensagem",
          processId: null,
        })
      ).resolves.toBeUndefined();

      // Aguardar um pouco para a promise rejeitar
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(db.updateConversationTitle).not.toHaveBeenCalled();
    });
  });
});
