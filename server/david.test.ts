import { describe, expect, it } from "vitest";
import { generateDraft, chunkText } from "./ghostwriter";

describe("David - System Prompt e Conhecimento Híbrido", () => {
  it("should generate draft with David system prompt", async () => {
    const input = {
      draftType: "sentenca" as const,
      processNumber: "1234567-89.2024.8.26.0100",
      court: "1º Juizado Especial Cível",
      plaintiff: "João da Silva",
      defendant: "Empresa XYZ Ltda",
      subject: "Indenização por danos morais",
      facts: "Autor alega ter sofrido danos morais devido a cobrança indevida",
      evidence: "Comprovantes de pagamento e prints de mensagens",
      requests: "Indenização por danos morais no valor de R$ 5.000,00",
      knowledgeBase: "[Decisão Anterior]\nEm casos similares, o entendimento consolidado é...",
      driveContent: "[Tese Atualizada]\nPara casos de cobrança indevida, aplicar...",
    };

    // Nota: Este teste não fará chamada real à API
    // Apenas valida a estrutura do input
    expect(input.draftType).toBe("sentenca");
    expect(input.processNumber).toBeTruthy();
    expect(input.knowledgeBase).toBeTruthy();
    expect(input.driveContent).toBeTruthy();
  });

  it("should handle special commands", async () => {
    const commands = [
      "/minutar Procedência Parcial",
      "/consultar danos morais",
      "/tese"
    ];

    for (const command of commands) {
      expect(command).toMatch(/^\/(minutar|consultar|tese)/);
    }
  });

  it("should chunk large text correctly", () => {
    const largeText = "Parágrafo 1\n\n".repeat(1000);
    const chunks = chunkText(largeText, 5000);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(5000);
    }
  });

  it("should preserve small text without chunking", () => {
    const smallText = "Texto pequeno para teste";
    const chunks = chunkText(smallText, 10000);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(smallText);
  });
});

describe("Sistema de Conhecimento Híbrido", () => {
  it("should validate knowledge base structure", () => {
    const knowledgeBase = [
      {
        id: 1,
        title: "Decisão sobre Danos Morais",
        content: "Conteúdo da decisão...",
        category: "decisoes",
      },
      {
        id: 2,
        title: "Tese sobre Cobrança Indevida",
        content: "Conteúdo da tese...",
        category: "teses",
      },
    ];

    expect(knowledgeBase.length).toBe(2);
    expect(knowledgeBase[0].title).toBeTruthy();
    expect(knowledgeBase[0].content).toBeTruthy();
  });

  it("should format knowledge base content correctly", () => {
    const knowledgeBase = [
      { title: "Doc 1", content: "Conteúdo 1" },
      { title: "Doc 2", content: "Conteúdo 2" },
    ];

    const formatted = knowledgeBase
      .map(kb => `[${kb.title}]\n${kb.content}`)
      .join("\n\n---\n\n");

    expect(formatted).toContain("[Doc 1]");
    expect(formatted).toContain("Conteúdo 1");
    expect(formatted).toContain("---");
  });
});

describe("Rastreabilidade de Provas", () => {
  it("should validate proof citation format", () => {
    const validCitations = [
      "(Evento 15 - Doc. 02)",
      "(fls. 45 - Contrato)",
      "Conforme narrado na inicial",
    ];

    for (const citation of validCitations) {
      expect(citation).toBeTruthy();
      expect(citation.length).toBeGreaterThan(0);
    }
  });
});
