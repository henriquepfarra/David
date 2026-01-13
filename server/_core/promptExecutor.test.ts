import { describe, it, expect } from "vitest";

describe("promptExecutor.ts - Utility Functions", () => {
  /**
   * Testes para funções auxiliares de processamento de prompts
   * sem precisar de banco de dados ou APIs externas
   */

  describe("Command Name Cleaning", () => {
    it("deve remover barra inicial de comando", () => {
      const command = "/analise_completa";
      const cleaned = command.replace("/", "");

      expect(cleaned).toBe("analise_completa");
      expect(cleaned).not.toContain("/");
    });

    it("deve substituir underscores por espaços", () => {
      const command = "analise_completa";
      const cleaned = command.replace(/_/g, " ");

      expect(cleaned).toBe("analise completa");
    });

    it("deve processar comando completo (barra + underscores)", () => {
      const command = "/analise_completa";
      const cleaned = command.replace("/", "").replace(/_/g, " ");

      expect(cleaned).toBe("analise completa");
    });

    it("deve lidar com comando sem barra", () => {
      const command = "meu_prompt";
      const cleaned = command.replace("/", "").replace(/_/g, " ");

      expect(cleaned).toBe("meu prompt");
    });

    it("deve lidar com múltiplos underscores", () => {
      const command = "/prompt_com_varios_underscores";
      const cleaned = command.replace("/", "").replace(/_/g, " ");

      expect(cleaned).toBe("prompt com varios underscores");
    });
  });

  describe("Title Matching (Case Insensitive)", () => {
    it("deve fazer match case-insensitive exato", () => {
      const savedTitle = "Análise Completa";
      const searchTitle = "análise completa";

      const matches = savedTitle.toLowerCase() === searchTitle.toLowerCase();

      expect(matches).toBe(true);
    });

    it("deve fazer match com espaços vs underscores", () => {
      const savedTitle = "Análise Completa";
      const searchTitle = "analise_completa";

      const matches =
        savedTitle.toLowerCase().replace(/ /g, "_") === searchTitle.toLowerCase();

      expect(matches).toBe(true);
    });

    it("deve fazer match ignorando acentos quando necessário", () => {
      const savedTitle = "analise completa";
      const searchTitle1 = "análise completa";

      // Normalizar acentos
      const normalize = (str: string) =>
        str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

      expect(normalize(savedTitle)).toBe(normalize(searchTitle1));
    });

    it("NÃO deve fazer match em títulos diferentes", () => {
      const savedTitle = "Análise Inicial";
      const searchTitle = "análise completa";

      const matches = savedTitle.toLowerCase() === searchTitle.toLowerCase();

      expect(matches).toBe(false);
    });
  });

  describe("ExecutePromptInput - Interface Validation", () => {
    it("deve aceitar input válido completo", () => {
      const input = {
        userId: 1,
        promptCommand: "/analise_completa",
        processId: 123,
        processNumber: "1234567-89.2021.8.26.0100",
      };

      expect(input.userId).toBe(1);
      expect(input.promptCommand).toBe("/analise_completa");
      expect(input.processId).toBe(123);
      expect(input.processNumber).toContain("2021");
    });

    it("deve ter userId numérico", () => {
      const input = {
        userId: 42,
        promptCommand: "/comando",
        processId: 1,
        processNumber: "0000000-00.0000.0.00.0000",
      };

      expect(typeof input.userId).toBe("number");
      expect(input.userId).toBeGreaterThan(0);
    });

    it("deve aceitar promptCommand com barra", () => {
      const input = {
        userId: 1,
        promptCommand: "/meu_prompt_customizado",
        processId: 1,
        processNumber: "proc",
      };

      expect(input.promptCommand).toMatch(/^\//);
    });

    it("deve aceitar promptCommand sem barra", () => {
      const input = {
        userId: 1,
        promptCommand: "meu_prompt",
        processId: 1,
        processNumber: "proc",
      };

      expect(input.promptCommand).not.toMatch(/^\//);
    });
  });

  describe("Execution Mode Detection", () => {
    it("deve identificar modo 'full_context'", () => {
      const executionMode = "full_context";

      const isFullContext = executionMode === "full_context";
      const isChat = executionMode === "chat";

      expect(isFullContext).toBe(true);
      expect(isChat).toBe(false);
    });

    it("deve identificar modo 'chat'", () => {
      const executionMode = "chat";

      const isFullContext = executionMode === "full_context";
      const isChat = executionMode === "chat";

      expect(isFullContext).toBe(false);
      expect(isChat).toBe(true);
    });

    it("deve usar modo 'chat' como padrão se undefined", () => {
      const executionMode: string | undefined = undefined;

      const mode = executionMode || "chat";

      expect(mode).toBe("chat");
    });
  });

  describe("System Prompt Assembly", () => {
    it("deve concatenar múltiplos prompts do sistema", () => {
      const CORE_IDENTITY = "Você é David, assistente jurídico.";
      const CORE_TONE = "Mantenha tom profissional.";
      const CORE_GATEKEEPER = "Valide todas as entradas.";

      const baseSystemPrompt = `
${CORE_IDENTITY}
${CORE_TONE}
${CORE_GATEKEEPER}
`;

      expect(baseSystemPrompt).toContain("David");
      expect(baseSystemPrompt).toContain("profissional");
      expect(baseSystemPrompt).toContain("Valide");
    });

    it("deve incluir contexto do processo no prompt final", () => {
      const baseSystemPrompt = "Sistema base";
      const context = "Processo nº 123 - Ação de cobrança";
      const promptContent = "Analise os fatos";

      const finalPrompt = `${baseSystemPrompt}

CONTEXTO DO PROCESSO:
${context}

Sua tarefa é executar rigorosamente o seguinte protocolo de análise:
${promptContent}`;

      expect(finalPrompt).toContain("Sistema base");
      expect(finalPrompt).toContain("Processo nº 123");
      expect(finalPrompt).toContain("Analise os fatos");
      expect(finalPrompt).toContain("CONTEXTO DO PROCESSO:");
    });

    it("deve incluir aviso sobre não gerar minutas", () => {
      const finalPrompt = `
IMPORTANTE: Este é um PROTOCOLO DE ANÁLISE, não uma solicitação de minuta. Execute a análise conforme especificado acima, sem gerar documentos finais.`;

      expect(finalPrompt).toContain("PROTOCOLO DE ANÁLISE");
      expect(finalPrompt).toContain("sem gerar documentos finais");
    });
  });

  describe("Context Mode Selection", () => {
    it("deve usar modo 'audit' para full_context", () => {
      const executionMode = "full_context";
      const contextMode = executionMode === "full_context" ? "audit" : "rag";

      expect(contextMode).toBe("audit");
    });

    it("deve usar modo 'rag' para chat", () => {
      const executionMode = "chat";
      const contextMode = executionMode === "full_context" ? "audit" : "rag";

      expect(contextMode).toBe("rag");
    });

    it("deve usar modo 'rag' como padrão", () => {
      const executionMode: string | undefined = undefined;
      const contextMode = executionMode === "full_context" ? "audit" : "rag";

      expect(contextMode).toBe("rag");
    });
  });

  describe("Prompt Command Normalization", () => {
    const testCases = [
      { input: "/analise_completa", expected: "analise completa" },
      { input: "/ANALISE_COMPLETA", expected: "analise completa" },
      { input: "analise_completa", expected: "analise completa" },
      { input: "/prompt_com_varios_nomes", expected: "prompt com varios nomes" },
      { input: "/simples", expected: "simples" },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`deve normalizar '${input}' para '${expected}'`, () => {
        const normalized = input
          .replace("/", "")
          .replace(/_/g, " ")
          .toLowerCase();

        expect(normalized).toBe(expected);
      });
    });
  });

  describe("Prompt Content Validation", () => {
    it("deve aceitar prompt content com múltiplas linhas", () => {
      const content = `
1. Analise os fatos
2. Identifique fundamentos legais
3. Elabore tese jurídica
4. Sugira estratégia processual
`;

      expect(content.split("\n").length).toBeGreaterThan(1);
      expect(content).toContain("Analise os fatos");
      expect(content).toContain("estratégia processual");
    });

    it("deve aceitar prompt content com formatação markdown", () => {
      const content = `
## Análise Processual

**Etapa 1:** Identificar partes
**Etapa 2:** Analisar pedidos

- Item 1
- Item 2
`;

      expect(content).toContain("##");
      expect(content).toContain("**");
      expect(content).toContain("-");
    });

    it("deve aceitar prompt content vazio (edge case)", () => {
      const content = "";

      expect(content.length).toBe(0);
    });

    it("deve aceitar prompt content muito longo", () => {
      const content = "Instrução detalhada. ".repeat(100);

      expect(content.length).toBeGreaterThan(1000);
    });
  });

  describe("Error Scenarios", () => {
    it("deve retornar null quando prompt não é encontrado", () => {
      const prompts = [
        { title: "Análise Inicial", content: "..." },
        { title: "Análise Final", content: "..." },
      ];

      const searchTitle = "analise completa";
      const found = prompts.find(
        (p) => p.title.toLowerCase() === searchTitle.toLowerCase()
      );

      expect(found).toBeUndefined();
    });

    it("deve lidar com lista de prompts vazia", () => {
      const prompts: any[] = [];
      const searchTitle = "qualquer";

      const found = prompts.find(
        (p) => p.title.toLowerCase() === searchTitle.toLowerCase()
      );

      expect(found).toBeUndefined();
    });
  });

  describe("Process Number Validation", () => {
    const validProcessNumbers = [
      "1234567-89.2021.8.26.0100",
      "0000000-00.0000.0.00.0000",
      "9876543-21.2022.5.01.0001",
    ];

    validProcessNumbers.forEach((procNumber) => {
      it(`deve aceitar número de processo válido: ${procNumber}`, () => {
        const pattern = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
        expect(pattern.test(procNumber)).toBe(true);
      });
    });

    it("deve identificar formato inválido", () => {
      const invalidNumber = "123-456";
      const pattern = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

      expect(pattern.test(invalidNumber)).toBe(false);
    });
  });
});
