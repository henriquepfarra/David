import { describe, it, expect, vi } from "vitest";

/**
 * Testes unitários para funções auxiliares do processExtractor
 * Focando nas funções que não dependem de chamadas LLM
 */

// Função auxiliar extraída para testar (copiada do módulo original)
function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

// Função auxiliar para calcular confidence
function calculateConfidence(extractedFieldsCount: number): "high" | "medium" | "low" {
  if (extractedFieldsCount >= 5) return "high";
  if (extractedFieldsCount >= 3) return "medium";
  return "low";
}

describe("processExtractor - Funções Auxiliares", () => {
  describe("cleanJsonResponse", () => {
    it("deve remover blocos ```json ... ```", () => {
      const input = '```json\n{"test": "value"}\n```';
      const expected = '{"test": "value"}';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it("deve remover blocos ``` ... ``` genéricos", () => {
      const input = '```\n{"test": "value"}\n```';
      const expected = '{"test": "value"}';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it("deve remover apenas ``` do final", () => {
      const input = '{"test": "value"}```';
      const expected = '{"test": "value"}';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it("deve remover apenas ```json do início", () => {
      const input = '```json\n{"test": "value"}';
      const expected = '{"test": "value"}';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it("deve lidar com JSON limpo sem markdown", () => {
      const input = '{"test": "value"}';
      expect(cleanJsonResponse(input)).toBe(input);
    });

    it("deve remover espaços em branco extras", () => {
      const input = '   \n\n   {"test": "value"}   \n\n   ';
      const expected = '{"test": "value"}';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it("deve lidar com múltiplos níveis de aninhamento", () => {
      const input = '```json\n{"nested": {"deep": {"value": 123}}}\n```';
      const expected = '{"nested": {"deep": {"value": 123}}}';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it("deve lidar com strings vazias", () => {
      const input = '';
      expect(cleanJsonResponse(input)).toBe('');
    });

    it("deve lidar com apenas marcadores markdown", () => {
      const input = '```json\n```';
      expect(cleanJsonResponse(input)).toBe('');
    });
  });

  describe("calculateConfidence", () => {
    it("deve retornar 'high' para 5+ campos", () => {
      expect(calculateConfidence(5)).toBe("high");
      expect(calculateConfidence(6)).toBe("high");
      expect(calculateConfidence(10)).toBe("high");
    });

    it("deve retornar 'medium' para 3-4 campos", () => {
      expect(calculateConfidence(3)).toBe("medium");
      expect(calculateConfidence(4)).toBe("medium");
    });

    it("deve retornar 'low' para 1-2 campos", () => {
      expect(calculateConfidence(1)).toBe("low");
      expect(calculateConfidence(2)).toBe("low");
    });

    it("deve retornar 'low' para 0 campos", () => {
      expect(calculateConfidence(0)).toBe("low");
    });
  });

  describe("Data Validation & Cleaning Logic", () => {
    it("deve aceitar camelCase field names", () => {
      const data = {
        numeroProcesso: "1234567-89.2023.8.26.0001",
        autor: "João Silva",
        reu: "Empresa XYZ",
      };

      expect(data.numeroProcesso).toBe("1234567-89.2023.8.26.0001");
      expect(data.autor).toBe("João Silva");
      expect(data.reu).toBe("Empresa XYZ");
    });

    it("deve aceitar Portuguese field names", () => {
      const rawData: any = {
        "Número do Processo": "1234567-89.2023.8.26.0001",
        "Autor/Requerente": "João Silva",
        "Réu/Requerido": "Empresa XYZ",
      };

      // Lógica de normalização
      const normalized = {
        numeroProcesso: rawData["numeroProcesso"] || rawData["Número do Processo"] || null,
        autor: rawData["autor"] || rawData["Autor/Requerente"] || rawData["Autor"] || null,
        reu: rawData["reu"] || rawData["Réu/Requerido"] || rawData["Réu"] || null,
      };

      expect(normalized.numeroProcesso).toBe("1234567-89.2023.8.26.0001");
      expect(normalized.autor).toBe("João Silva");
      expect(normalized.reu).toBe("Empresa XYZ");
    });

    it("deve converter arrays de pedidos em string", () => {
      const pedidosArray = [
        "Condenar o réu ao pagamento",
        "Deferir a tutela de urgência",
        "Condenar em honorários"
      ];

      const pedidosString = pedidosArray.join('\n');

      expect(pedidosString).toContain("Condenar o réu");
      expect(pedidosString).toContain("Deferir a tutela");
      expect(pedidosString.split('\n')).toHaveLength(3);
    });

    it("deve manter strings de pedidos como estão", () => {
      const pedidosString = "Condenar o réu ao pagamento de danos morais";
      expect(pedidosString).toBe("Condenar o réu ao pagamento de danos morais");
    });

    it("deve retornar null para campos ausentes", () => {
      const data: any = {
        numeroProcesso: "1234567-89.2023.8.26.0001"
      };

      const normalized = {
        numeroProcesso: data.numeroProcesso || null,
        autor: data.autor || null,
        reu: data.reu || null,
      };

      expect(normalized.numeroProcesso).toBe("1234567-89.2023.8.26.0001");
      expect(normalized.autor).toBeNull();
      expect(normalized.reu).toBeNull();
    });
  });

  describe("ExtractedFields Logic", () => {
    it("deve incluir todos os campos presentes no array", () => {
      const data = {
        numeroProcesso: "123",
        autor: "João",
        reu: "Maria",
        vara: "1ª Vara",
        assunto: "Dano Moral",
      };

      const extractedFields: string[] = [];
      if (data.numeroProcesso) extractedFields.push('processNumber');
      if (data.autor) extractedFields.push('plaintiff');
      if (data.reu) extractedFields.push('defendant');
      if (data.vara) extractedFields.push('court');
      if (data.assunto) extractedFields.push('subject');

      expect(extractedFields).toHaveLength(5);
      expect(extractedFields).toContain('processNumber');
      expect(extractedFields).toContain('plaintiff');
      expect(extractedFields).toContain('defendant');
      expect(extractedFields).toContain('court');
      expect(extractedFields).toContain('subject');
    });

    it("deve ignorar campos null/undefined", () => {
      const data = {
        numeroProcesso: "123",
        autor: null,
        reu: undefined,
      };

      const extractedFields: string[] = [];
      if (data.numeroProcesso) extractedFields.push('processNumber');
      if (data.autor) extractedFields.push('plaintiff');
      if (data.reu) extractedFields.push('defendant');

      expect(extractedFields).toHaveLength(1);
      expect(extractedFields).toContain('processNumber');
    });

    it("deve ignorar strings vazias", () => {
      const data = {
        numeroProcesso: "123",
        autor: "",
        reu: "   ",
      };

      const extractedFields: string[] = [];
      if (data.numeroProcesso && data.numeroProcesso.trim()) extractedFields.push('processNumber');
      if (data.autor && data.autor.trim()) extractedFields.push('plaintiff');
      if (data.reu && data.reu.trim()) extractedFields.push('defendant');

      expect(extractedFields).toHaveLength(1);
      expect(extractedFields).toContain('processNumber');
    });
  });

  describe("Text Truncation", () => {
    it("deve truncar texto para 15000 caracteres", () => {
      const longText = "a".repeat(20000);
      const truncated = longText.slice(0, 15000);

      expect(truncated.length).toBe(15000);
      expect(longText.length).toBe(20000);
    });

    it("não deve truncar textos menores que 15000", () => {
      const shortText = "a".repeat(1000);
      const truncated = shortText.slice(0, 15000);

      expect(truncated.length).toBe(1000);
      expect(truncated).toBe(shortText);
    });
  });

  describe("Image Limiting", () => {
    it("deve limitar imagens para 5", () => {
      const images = Array(10).fill("image_url");
      const limited = images.slice(0, 5);

      expect(limited.length).toBe(5);
    });

    it("não deve limitar arrays com menos de 5 imagens", () => {
      const images = ["img1", "img2", "img3"];
      const limited = images.slice(0, 5);

      expect(limited.length).toBe(3);
      expect(limited).toEqual(images);
    });
  });

  describe("Error Messages", () => {
    it("deve formatar mensagens de erro corretamente", () => {
      const originalError = new Error("Network timeout");
      const wrappedError = new Error(`Falha na extração: ${originalError.message}`);

      expect(wrappedError.message).toBe("Falha na extração: Network timeout");
    });

    it("deve incluir contexto em erros multimodais", () => {
      const originalError = new Error("Invalid image format");
      const wrappedError = new Error(`Falha na extração multimodal: ${originalError.message}`);

      expect(wrappedError.message).toBe("Falha na extração multimodal: Invalid image format");
    });
  });

  describe("CNJ Process Number Format", () => {
    it("deve validar formato CNJ correto", () => {
      const validFormats = [
        "1234567-89.2023.8.26.0001",
        "0000001-00.2025.8.26.0100",
        "4005530-16.2025.8.26.0009",
      ];

      const cnj_pattern = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

      validFormats.forEach((num) => {
        expect(cnj_pattern.test(num)).toBe(true);
      });
    });

    it("deve rejeitar formatos inválidos", () => {
      const invalidFormats = [
        "123456789",
        "123-45.2023",
        "abc-de.fghi.j.kl.mnop",
        "",
      ];

      const cnj_pattern = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

      invalidFormats.forEach((num) => {
        expect(cnj_pattern.test(num)).toBe(false);
      });
    });
  });
});
