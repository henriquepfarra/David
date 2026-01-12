import { describe, expect, it, vi } from "vitest";
import { extractThesisFromDraft } from "./thesisExtractor";
import * as llm from "./_core/llm";

// Mock do módulo _core/llm e _core/env
vi.mock("./_core/llm");
vi.mock("./_core/env", () => ({
  ENV: {
    geminiApiKey: "test-key",
    cookieSecret: "test-secret",
    databaseUrl: "mysql://mock:3306/db",
    isProduction: false,
    appId: "test-app",
    googleClientId: "",
    googleClientSecret: ""
  }
}));

describe("extractThesisFromDraft (Unit)", () => {
  it("deve processar corretamente resposta válida da LLM", async () => {
    // Mock da resposta de sucesso com novo schema
    vi.spyOn(llm, "invokeLLM").mockResolvedValue({
      id: "test-id",
      created: 1234567890,
      model: "test-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({
              legalThesis: "Tese jurídica simulada para teste unitário",
              legalFoundations: "Art. 300 CPC",
              keywords: "tutela, urgência, teste",
              writingStyleSample: "Parágrafo representativo do estilo de redação do juiz.",
              writingCharacteristics: {
                formality: "formal",
                structure: "Estrutura técnica e objetiva",
                tone: "Imparcial e didático"
              },
              // Campos legados para compatibilidade
              thesis: "Tese jurídica simulada para teste unitário",
              decisionPattern: "Padrão técnico e objetivo"
            }),
          },
          finish_reason: "stop",
        },
      ],
    });

    const result = await extractThesisFromDraft("texto da minuta", "decisao");

    expect(result).toBeDefined();
    expect(result.legalThesis).toBe("Tese jurídica simulada para teste unitário");
    expect(result.legalFoundations).toBe("Art. 300 CPC");
    expect(result.writingStyleSample).toBeDefined();
    expect(result.writingCharacteristics).toBeDefined();
    expect(result.writingCharacteristics.formality).toBe("formal");
    expect(llm.invokeLLM).toHaveBeenCalledTimes(1);
  });

  it("deve lidar com erro na extração (JSON inválido)", async () => {
    vi.spyOn(llm, "invokeLLM").mockResolvedValue({
      id: "test-id",
      created: 1234567890,
      model: "test-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Isto não é um JSON válido",
          },
          finish_reason: "stop",
        },
      ],
    });

    await expect(extractThesisFromDraft("texto", "decisao"))
      .rejects
      .toThrow(); // Espera erro de parse ou validação
  });

  it("deve lidar com resposta vazia da API (nossa correção de crash)", async () => {
    vi.spyOn(llm, "invokeLLM").mockResolvedValue({
      id: "test-id",
      created: 1234567890,
      model: "test-model",
      choices: [], // Lista vazia simulando o erro anterior
    } as any);

    await expect(extractThesisFromDraft("texto", "decisao"))
      .rejects
      .toThrow("A resposta da LLM não possui escolhas (choices) válidas.");
  });
});
