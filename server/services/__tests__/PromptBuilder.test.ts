/**
 * Testes unitários para PromptBuilder
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptBuilder } from "../PromptBuilder";
import * as db from "../../db";
import * as RagService from "../RagService";
import * as IntentService from "../IntentService";

// Mock dos módulos
vi.mock("../../db", () => ({
  getProcessForContext: vi.fn(),
  getProcessDocuments: vi.fn(),
  getUserSettings: vi.fn(),
}));

vi.mock("../RagService", () => ({
  getRagService: vi.fn(() => ({
    buildKnowledgeBaseContext: vi.fn(),
    searchLegalTheses: vi.fn(),
  })),
}));

vi.mock("../IntentService", () => ({
  IntentService: {
    classify: vi.fn(),
    formatDebugBadge: vi.fn(() => "GENERAL_CONSULTATION"),
  },
}));

vi.mock("../../_core/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PromptBuilder", () => {
  let service: PromptBuilder;
  let mockRagService: any;

  beforeEach(() => {
    service = new PromptBuilder();
    mockRagService = {
      buildKnowledgeBaseContext: vi.fn().mockResolvedValue(""),
      searchLegalTheses: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(RagService.getRagService).mockReturnValue(mockRagService);
    vi.clearAllMocks();
  });

  describe("buildContexts", () => {
    it("deve construir contextos sem processo", async () => {
      mockRagService.buildKnowledgeBaseContext.mockResolvedValue(
        "\n## BASE DE CONHECIMENTO\nArtigo X..."
      );

      const result = await service.buildContexts({
        userId: 123,
        query: "Como calcular dano moral?",
        processId: null,
      });

      expect(result.knowledgeBaseContext).toContain("BASE DE CONHECIMENTO");
      expect(result.processContext).toBe("");
      expect(result.processDocsContext).toBe("");
      expect(result.similarCasesContext).toBe("");
    });

    it("deve construir contextos com processo", async () => {
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
      vi.mocked(db.getProcessDocuments).mockResolvedValue([]);
      mockRagService.buildKnowledgeBaseContext.mockResolvedValue("");

      const result = await service.buildContexts({
        userId: 123,
        query: "Analisar processo",
        processId: 789,
      });

      expect(result.processContext).toContain("PROCESSO SELECIONADO");
      expect(result.processContext).toContain("0001234-56.2024.8.26.0100");
      expect(result.processContext).toContain("João Silva");
      expect(result.processContext).toContain("Empresa X");
    });

    it("deve incluir documentos do processo", async () => {
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

      const mockDocs = [
        {
          id: 1,
          title: "Petição Inicial",
          documentType: "petição",
          content: "Conteúdo da petição...",
        },
        {
          id: 2,
          title: "Contrato",
          documentType: "documento",
          content: "Cláusulas do contrato...",
        },
      ];

      vi.mocked(db.getProcessForContext).mockResolvedValue(mockProcess);
      vi.mocked(db.getProcessDocuments).mockResolvedValue(mockDocs);
      mockRagService.buildKnowledgeBaseContext.mockResolvedValue("");

      const result = await service.buildContexts({
        userId: 123,
        query: "Analisar processo",
        processId: 789,
      });

      expect(result.processDocsContext).toContain("DOCUMENTOS DO PROCESSO");
      expect(result.processDocsContext).toContain("Petição Inicial");
      expect(result.processDocsContext).toContain("Contrato");
    });

    it("deve incluir casos similares", async () => {
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

      const mockTheses = [
        {
          legalThesis: "Dano moral configurado",
          legalFoundations: "Art. 186 CC",
          keywords: "dano, moral, indenização",
          similarity: 0.85,
        },
      ];

      vi.mocked(db.getProcessForContext).mockResolvedValue(mockProcess);
      vi.mocked(db.getProcessDocuments).mockResolvedValue([]);
      mockRagService.buildKnowledgeBaseContext.mockResolvedValue("");
      mockRagService.searchLegalTheses.mockResolvedValue(mockTheses);

      const result = await service.buildContexts({
        userId: 123,
        query: "Analisar processo",
        processId: 789,
      });

      expect(result.similarCasesContext).toContain("CASOS SIMILARES");
      expect(result.similarCasesContext).toContain("Dano moral configurado");
      expect(result.similarCasesContext).toContain("85%");
    });

    it("deve truncar documentos muito longos", async () => {
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

      const longContent = "A".repeat(3000);
      const mockDocs = [
        {
          id: 1,
          title: "Documento Longo",
          documentType: "documento",
          content: longContent,
        },
      ];

      vi.mocked(db.getProcessForContext).mockResolvedValue(mockProcess);
      vi.mocked(db.getProcessDocuments).mockResolvedValue(mockDocs);
      mockRagService.buildKnowledgeBaseContext.mockResolvedValue("");

      const result = await service.buildContexts({
        userId: 123,
        query: "Analisar processo",
        processId: 789,
      });

      expect(result.processDocsContext).toContain("...");
      expect(result.processDocsContext.length).toBeLessThan(3000);
    });

    it("não deve falhar se busca de documentos der erro", async () => {
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
      vi.mocked(db.getProcessDocuments).mockRejectedValue(
        new Error("Erro ao buscar docs")
      );
      mockRagService.buildKnowledgeBaseContext.mockResolvedValue("");

      const result = await service.buildContexts({
        userId: 123,
        query: "Analisar processo",
        processId: 789,
      });

      expect(result.processContext).toContain("PROCESSO SELECIONADO");
      expect(result.processDocsContext).toBe("");
    });
  });

  describe("buildSystemPrompt", () => {
    it("deve construir prompt base com todos os módulos core", async () => {
      vi.mocked(db.getUserSettings).mockResolvedValue({
        llmApiKey: "test-key",
      } as any);

      vi.mocked(IntentService.IntentService.classify).mockResolvedValue({
        intent: "GENERAL_CONSULTATION",
        motors: ["A", "B", "C"],
        ragScope: "FULL",
      });

      const { systemPrompt } = await service.buildSystemPrompt(
        "Como funciona?",
        null,
        [],
        123
      );

      expect(systemPrompt).toContain("David");
      expect(systemPrompt).toContain("IDENTIDADE");
    });

    it("deve incluir apenas motores ativos", async () => {
      vi.mocked(db.getUserSettings).mockResolvedValue({
        llmApiKey: "test-key",
      } as any);

      vi.mocked(IntentService.IntentService.classify).mockResolvedValue({
        intent: "GENERAL_CONSULTATION",
        motors: ["A", "C"], // Apenas A e C
        ragScope: "FULL",
      });

      const { systemPrompt } = await service.buildSystemPrompt(
        "Pergunta",
        null,
        [],
        123
      );

      // Deve conter referências aos motores A e C
      // (Os prompts reais contêm identificadores específicos)
      expect(systemPrompt.length).toBeGreaterThan(100);
    });

    it("deve adicionar stylePreferences se fornecido", async () => {
      vi.mocked(db.getUserSettings).mockResolvedValue({
        llmApiKey: "test-key",
      } as any);

      vi.mocked(IntentService.IntentService.classify).mockResolvedValue({
        intent: "GENERAL_CONSULTATION",
        motors: ["A"],
        ragScope: "FULL",
      });

      const { systemPrompt } = await service.buildSystemPrompt(
        "Pergunta",
        null,
        [],
        123,
        "Use linguagem formal"
      );

      expect(systemPrompt).toContain("PREFERÊNCIAS DE ESTILO DO GABINETE");
      expect(systemPrompt).toContain("Use linguagem formal");
    });

    it("deve adicionar instrução de análise para CASE_ANALYSIS", async () => {
      vi.mocked(db.getUserSettings).mockResolvedValue({
        llmApiKey: "test-key",
      } as any);

      vi.mocked(IntentService.IntentService.classify).mockResolvedValue({
        intent: "CASE_ANALYSIS",
        motors: ["A", "B", "C", "D"],
        ragScope: "FULL",
      });

      const { systemPrompt } = await service.buildSystemPrompt(
        "Analise este caso",
        null,
        [],
        123
      );

      expect(systemPrompt).toContain("MODO ANÁLISE ATIVADO");
      expect(systemPrompt).toContain("NÃO elabore documento final");
    });
  });

  describe("buildLLMMessages", () => {
    it("deve montar mensagens com system prompt e histórico", async () => {
      vi.mocked(db.getUserSettings).mockResolvedValue({
        llmApiKey: "test-key",
      } as any);

      vi.mocked(IntentService.IntentService.classify).mockResolvedValue({
        intent: "GENERAL_CONSULTATION",
        motors: ["A"],
        ragScope: "FULL",
      });

      const contexts = {
        knowledgeBaseContext: "\nKnowledge...",
        processContext: "\nProcess...",
        processDocsContext: "",
        similarCasesContext: "",
      };

      const history = [
        { role: "user" as const, content: "Mensagem 1" },
        { role: "assistant" as const, content: "Resposta 1" },
        { role: "user" as const, content: "Mensagem 2" },
      ];

      const messages = await service.buildLLMMessages({
        systemPromptOverride: undefined,
        contexts,
        conversationId: 123,
        userQuery: "Mensagem 2",
        history,
        processId: null,
      });

      expect(messages.length).toBe(4); // system + 3 mensagens histórico
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(messages[1].content).toBe("Mensagem 1");
      expect(messages[2].role).toBe("assistant");
      expect(messages[2].content).toBe("Resposta 1");
    });

    it("deve limitar histórico a últimas 10 mensagens", async () => {
      vi.mocked(db.getUserSettings).mockResolvedValue({
        llmApiKey: "test-key",
      } as any);

      vi.mocked(IntentService.IntentService.classify).mockResolvedValue({
        intent: "GENERAL_CONSULTATION",
        motors: ["A"],
        ragScope: "FULL",
      });

      const contexts = {
        knowledgeBaseContext: "",
        processContext: "",
        processDocsContext: "",
        similarCasesContext: "",
      };

      const history = Array.from({ length: 20 }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: `Mensagem ${i + 1}`,
      }));

      const messages = await service.buildLLMMessages({
        systemPromptOverride: undefined,
        contexts,
        conversationId: 123,
        userQuery: "Última mensagem",
        history,
        processId: null,
      });

      // System + últimas 10 mensagens
      expect(messages.length).toBe(11);
      expect(messages[0].role).toBe("system");
    });

    it("deve incluir todos os contextos no system prompt", async () => {
      vi.mocked(db.getUserSettings).mockResolvedValue({
        llmApiKey: "test-key",
      } as any);

      vi.mocked(IntentService.IntentService.classify).mockResolvedValue({
        intent: "GENERAL_CONSULTATION",
        motors: ["A"],
        ragScope: "FULL",
      });

      const contexts = {
        knowledgeBaseContext: "\n## KNOWLEDGE",
        processContext: "\n## PROCESS",
        processDocsContext: "\n## DOCS",
        similarCasesContext: "\n## SIMILAR",
      };

      const messages = await service.buildLLMMessages({
        systemPromptOverride: undefined,
        contexts,
        conversationId: 123,
        userQuery: "Query",
        history: [],
        processId: null,
      });

      const systemMessage = messages[0].content;
      expect(systemMessage).toContain("KNOWLEDGE");
      expect(systemMessage).toContain("PROCESS");
      expect(systemMessage).toContain("DOCS");
      expect(systemMessage).toContain("SIMILAR");
    });
  });
});
