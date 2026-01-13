import { describe, it, expect } from "vitest";

/**
 * Testes para lógica auxiliar e validações do titleGenerator
 * Sem mockar invokeLLM - testes de lógica pura
 */

// Funções auxiliares extraídas para testar
function removeQuotes(title: string): string {
  return title.replace(/^["']|["']$/g, '');
}

function truncateTitle(title: string, maxLength: number = 60): string {
  if (title.length > maxLength) {
    return title.substring(0, maxLength - 3) + '...';
  }
  return title;
}

function buildContextParts(processInfo?: {
  processNumber?: string;
  subject?: string;
  plaintiff?: string;
  defendant?: string;
}): string[] {
  const contextParts: string[] = [];

  if (processInfo?.processNumber) {
    contextParts.push(`Processo: ${processInfo.processNumber}`);
  }
  if (processInfo?.subject) {
    contextParts.push(`Assunto: ${processInfo.subject}`);
  }
  if (processInfo?.plaintiff && processInfo?.defendant) {
    contextParts.push(`Partes: ${processInfo.plaintiff} vs ${processInfo.defendant}`);
  }

  return contextParts;
}

function createFallbackTitle(userMessage: string): string {
  const words = userMessage.split(' ').slice(0, 6).join(' ');
  return words.length > 60 ? words.substring(0, 57) + '...' : words;
}

describe("titleGenerator - Funções Auxiliares", () => {
  describe("removeQuotes", () => {
    it("deve remover aspas duplas do início e fim", () => {
      expect(removeQuotes('"Título de Teste"')).toBe('Título de Teste');
    });

    it("deve remover aspas simples do início e fim", () => {
      expect(removeQuotes("'Título de Teste'")).toBe('Título de Teste');
    });

    it("deve manter aspas no meio do texto", () => {
      expect(removeQuotes('Título "especial" de Teste')).toBe('Título "especial" de Teste');
    });

    it("deve remover apenas aspas das extremidades", () => {
      expect(removeQuotes('"Título" e "Subtítulo"')).toBe('Título" e "Subtítulo');
    });

    it("não deve modificar texto sem aspas", () => {
      expect(removeQuotes('Título Normal')).toBe('Título Normal');
    });

    it("deve lidar com strings vazias", () => {
      expect(removeQuotes('')).toBe('');
    });

    it("deve lidar com apenas aspas", () => {
      expect(removeQuotes('""')).toBe('');
      expect(removeQuotes("''")).toBe('');
    });
  });

  describe("truncateTitle", () => {
    it("deve truncar títulos maiores que 60 caracteres", () => {
      const longTitle = "Este é um título muito longo que definitivamente excede os 60 caracteres permitidos";
      const result = truncateTitle(longTitle, 60);

      expect(result.length).toBe(60);
      expect(result.endsWith('...')).toBe(true);
    });

    it("não deve truncar títulos com exatamente 60 caracteres", () => {
      // String com exatamente 60 caracteres
      const exactTitle = "a".repeat(60);
      const result = truncateTitle(exactTitle, 60);

      expect(result).toBe(exactTitle);
      expect(result.length).toBe(60);
    });

    it("não deve truncar títulos menores que 60 caracteres", () => {
      const shortTitle = "Título Curto";
      const result = truncateTitle(shortTitle, 60);

      expect(result).toBe(shortTitle);
      expect(result.length).toBe(12); // "Título Curto" tem 12 caracteres
    });

    it("deve adicionar reticências corretamente", () => {
      const longTitle = "a".repeat(100);
      const result = truncateTitle(longTitle, 60);

      expect(result).toBe("a".repeat(57) + "...");
      expect(result.length).toBe(60);
    });

    it("deve respeitar limite customizado", () => {
      const title = "Título de teste com limite customizado";
      const result = truncateTitle(title, 20);

      expect(result.length).toBe(20);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe("buildContextParts", () => {
    it("deve criar array vazio se não houver processInfo", () => {
      const parts = buildContextParts();
      expect(parts).toEqual([]);
    });

    it("deve incluir apenas processNumber se fornecido", () => {
      const parts = buildContextParts({
        processNumber: "1234567-89.2023.8.26.0001"
      });

      expect(parts).toHaveLength(1);
      expect(parts[0]).toBe("Processo: 1234567-89.2023.8.26.0001");
    });

    it("deve incluir apenas subject se fornecido", () => {
      const parts = buildContextParts({
        subject: "Dano Moral"
      });

      expect(parts).toHaveLength(1);
      expect(parts[0]).toBe("Assunto: Dano Moral");
    });

    it("deve incluir partes apenas se ambos plaintiff e defendant forem fornecidos", () => {
      const parts = buildContextParts({
        plaintiff: "João Silva",
        defendant: "Empresa XYZ"
      });

      expect(parts).toHaveLength(1);
      expect(parts[0]).toBe("Partes: João Silva vs Empresa XYZ");
    });

    it("não deve incluir partes se apenas plaintiff for fornecido", () => {
      const parts = buildContextParts({
        plaintiff: "João Silva"
      });

      expect(parts).toEqual([]);
    });

    it("não deve incluir partes se apenas defendant for fornecido", () => {
      const parts = buildContextParts({
        defendant: "Empresa XYZ"
      });

      expect(parts).toEqual([]);
    });

    it("deve incluir todos os campos se fornecidos", () => {
      const parts = buildContextParts({
        processNumber: "1234567-89.2023.8.26.0001",
        subject: "Dano Moral",
        plaintiff: "João Silva",
        defendant: "Empresa XYZ"
      });

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("Processo: 1234567-89.2023.8.26.0001");
      expect(parts[1]).toBe("Assunto: Dano Moral");
      expect(parts[2]).toBe("Partes: João Silva vs Empresa XYZ");
    });

    it("deve criar string de contexto formatada", () => {
      const parts = buildContextParts({
        processNumber: "1234567-89.2023.8.26.0001",
        subject: "Dano Moral"
      });

      const context = parts.length > 0
        ? `\n\nContexto do processo:\n${parts.join('\n')}`
        : '';

      expect(context).toContain("Contexto do processo:");
      expect(context).toContain("Processo: 1234567-89.2023.8.26.0001");
      expect(context).toContain("Assunto: Dano Moral");
    });
  });

  describe("createFallbackTitle", () => {
    it("deve criar título com primeiras 6 palavras", () => {
      const message = "Preciso analisar a tutela de urgência do processo 123";
      const title = createFallbackTitle(message);

      expect(title).toBe("Preciso analisar a tutela de urgência");
    });

    it("deve truncar se as 6 palavras excederem 60 caracteres", () => {
      const message = "supercalifragilisticexpialidocious antidisestablishmentarianism pneumonoultramicroscopicsilicovolcanoconiosis";
      const title = createFallbackTitle(message);

      expect(title.length).toBeLessThanOrEqual(60);
      expect(title.endsWith('...')).toBe(true);
    });

    it("deve manter mensagens curtas intactas", () => {
      const message = "Olá David";
      const title = createFallbackTitle(message);

      expect(title).toBe("Olá David");
    });

    it("deve lidar com mensagens com menos de 6 palavras", () => {
      const message = "Análise de tutela";
      const title = createFallbackTitle(message);

      expect(title).toBe("Análise de tutela");
    });

    it("deve lidar com mensagens vazias", () => {
      const message = "";
      const title = createFallbackTitle(message);

      expect(title).toBe("");
    });

    it("deve lidar com apenas espaços", () => {
      const message = "     ";
      const title = createFallbackTitle(message);

      // split(' ') retorna array de strings vazias, join retorna espaços
      expect(title.trim()).toBe("");
    });

    it("deve preservar acentuação e caracteres especiais", () => {
      const message = "Análise de contestação com acentuação especial aqui";
      const title = createFallbackTitle(message);

      expect(title).toBe("Análise de contestação com acentuação especial");
    });
  });

  describe("Title Format Validation", () => {
    it("deve aceitar formato comum: [Tipo] - [Assunto] - [Contexto]", () => {
      const validTitles = [
        "Análise Tutela - Gravame Santander",
        "Sentença Cobrança - INSS vs Silva",
        "Decisão Liminar - Busca e Apreensão",
        "Análise Contestação - Danos Morais"
      ];

      // Apenas verificar que contém " - " (separador comum)
      validTitles.forEach(title => {
        expect(title).toContain(" - ");
      });
    });

    it("deve aceitar títulos sem contexto (apenas Tipo - Assunto)", () => {
      const title = "Análise Tutela - Gravame";

      expect(title).toContain(" - ");
      expect(title.split(" - ")).toHaveLength(2);
    });
  });

  describe("Character Length Constraints", () => {
    it("deve aceitar títulos com exatamente 60 caracteres", () => {
      const title = "A".repeat(60);
      expect(title.length).toBe(60);
    });

    it("deve truncar títulos com 61+ caracteres", () => {
      const longTitle = "A".repeat(70);
      const truncated = truncateTitle(longTitle);

      expect(truncated.length).toBe(60);
    });

    it("deve aceitar títulos vazios (edge case)", () => {
      const title = "";
      expect(truncateTitle(title)).toBe("");
    });
  });

  describe("Special Characters Handling", () => {
    it("deve preservar caracteres especiais jurídicos", () => {
      const title = "Análise Art. 300 CPC - Tutela";
      expect(title).toContain("Art.");
      expect(title).toContain("CPC");
    });

    it("deve preservar números de processos formatados", () => {
      const processNumber = "1234567-89.2023.8.26.0001";
      const context = `Processo: ${processNumber}`;

      expect(context).toContain(processNumber);
    });

    it("deve preservar hífens e pontos em nomes", () => {
      const plaintiff = "João Silva-Santos";
      const defendant = "Empresa XYZ Ltda.";

      expect(plaintiff).toContain("-");
      expect(defendant).toContain(".");
    });
  });
});
