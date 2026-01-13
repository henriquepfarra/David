import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, isEncrypted } from "./crypto";

describe("crypto.ts - Encryption/Decryption", () => {
  // Garante que ENV está carregado antes dos testes
  beforeAll(() => {
    if (!process.env.JWT_SECRET && !process.env.COOKIE_SECRET) {
      process.env.COOKIE_SECRET = "test-secret-key-for-testing-only-min-32-chars";
    }
  });

  describe("encrypt", () => {
    it("deve criptografar texto simples", () => {
      const plaintext = "API Key Secreta";
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(":");
    });

    it("deve retornar string vazia para entrada vazia", () => {
      expect(encrypt("")).toBe("");
    });

    it("deve retornar formato iv:tag:encrypted", () => {
      const plaintext = "test";
      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(":");

      expect(parts).toHaveLength(3);
      expect(parts[0].length).toBe(32); // IV em hex (16 bytes = 32 chars)
      expect(parts[1].length).toBe(32); // Tag em hex (16 bytes = 32 chars)
      expect(parts[2].length).toBeGreaterThan(0); // Encrypted data
    });

    it("deve gerar IVs diferentes para mesma entrada", () => {
      const plaintext = "test";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      // Mas ambos devem ser descriptografáveis para o mesmo valor
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it("deve criptografar texto com caracteres especiais", () => {
      const plaintext = "Chave com ãçêntos e símbolos!@#$%";
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeTruthy();
      expect(encrypted).toContain(":");
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it("deve criptografar texto longo", () => {
      const plaintext = "a".repeat(1000);
      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeTruthy();
      expect(decrypt(encrypted)).toBe(plaintext);
    });
  });

  describe("decrypt", () => {
    it("deve descriptografar texto criptografado", () => {
      const plaintext = "API Key Secreta";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("deve retornar string vazia para entrada vazia", () => {
      expect(decrypt("")).toBe("");
    });

    it("deve retornar texto original se não estiver no formato esperado", () => {
      const notEncrypted = "plain-text-no-colons";
      expect(decrypt(notEncrypted)).toBe(notEncrypted);
    });

    it("deve retornar texto original se formato for inválido (backward compatibility)", () => {
      const invalidFormat = "invalid:format"; // Apenas 2 partes
      expect(decrypt(invalidFormat)).toBe(invalidFormat);
    });

    it("deve lidar com falha de descriptografia gracefully", () => {
      const fakeEncrypted = "0000000000000000:0000000000000000:abcd1234";

      // Não deve lançar erro, mas retornar o original
      expect(() => decrypt(fakeEncrypted)).not.toThrow();
      expect(decrypt(fakeEncrypted)).toBe(fakeEncrypted);
    });

    it("deve descriptografar vários valores consecutivos", () => {
      const values = ["api-key-1", "api-key-2", "api-key-3"];

      const encrypted = values.map(v => encrypt(v));
      const decrypted = encrypted.map(e => decrypt(e));

      expect(decrypted).toEqual(values);
    });

    it("deve preservar caracteres especiais após descriptografia", () => {
      const plaintext = "Chave: ãçêntos!@#$%^&*()";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("isEncrypted", () => {
    it("deve identificar texto criptografado", () => {
      const plaintext = "test";
      const encrypted = encrypt(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("deve retornar false para texto não criptografado", () => {
      expect(isEncrypted("plain-text")).toBe(false);
    });

    it("deve retornar false para string vazia", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("deve retornar false para formato inválido", () => {
      expect(isEncrypted("invalid:format")).toBe(false);
      expect(isEncrypted("too:many:colons:here")).toBe(false);
    });

    it("deve validar comprimento do IV (32 chars hex = 16 bytes)", () => {
      const validEncrypted = encrypt("test");
      const parts = validEncrypted.split(":");

      expect(parts[0].length).toBe(32);
      expect(isEncrypted(validEncrypted)).toBe(true);
    });

    it("deve rejeitar IV com comprimento incorreto", () => {
      const invalidIV = "short:tag32charsabcdefghij1234567890:encrypted";
      expect(isEncrypted(invalidIV)).toBe(false);
    });
  });

  describe("Round-trip Encryption/Decryption", () => {
    it("deve manter integridade de dados após round-trip", () => {
      const testCases = [
        "Simple text",
        "Text with numbers 123456",
        "Special chars !@#$%^&*()",
        "Unicode: 你好世界 🚀",
        "Multi\nline\ntext",
        '{"json": "object"}',
        "Very long text: " + "a".repeat(1000),
        "",
      ];

      testCases.forEach((original) => {
        const encrypted = encrypt(original);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(original);
      });
    });
  });

  describe("Security Properties", () => {
    it("mesma entrada deve gerar saídas diferentes (random IV)", () => {
      const plaintext = "same-input";
      const results = new Set();

      for (let i = 0; i < 10; i++) {
        results.add(encrypt(plaintext));
      }

      // Todos devem ser únicos devido ao IV aleatório
      expect(results.size).toBe(10);
    });

    it("não deve ser possível derivar plaintext do ciphertext", () => {
      const plaintext = "secret-password";
      const encrypted = encrypt(plaintext);

      // Encrypted não deve conter partes do plaintext
      expect(encrypted).not.toContain("secret");
      expect(encrypted).not.toContain("password");
    });

    it("pequena mudança no plaintext deve gerar ciphertext completamente diferente", () => {
      const text1 = "password123";
      const text2 = "password124"; // Apenas 1 char diferente

      const encrypted1 = encrypt(text1);
      const encrypted2 = encrypt(text2);

      // IVs serão diferentes, mas mesmo se fossem iguais, encrypted data seria muito diferente
      expect(encrypted1).not.toBe(encrypted2);

      // Extrair parte encrypted (após 2 primeiros ':')
      const enc1Data = encrypted1.split(":")[2];
      const enc2Data = encrypted2.split(":")[2];
      expect(enc1Data).not.toBe(enc2Data);
    });
  });

  describe("Edge Cases", () => {
    it("deve lidar com null/undefined gracefully", () => {
      expect(encrypt(null as any)).toBe("");
      expect(encrypt(undefined as any)).toBe("");
      expect(decrypt(null as any)).toBe("");
      expect(decrypt(undefined as any)).toBe("");
    });

    it("deve lidar com strings muito longas", () => {
      const veryLong = "x".repeat(100000);
      const encrypted = encrypt(veryLong);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(veryLong);
      expect(decrypted.length).toBe(100000);
    });

    it("deve lidar com caracteres de controle", () => {
      const withControl = "Line1\nLine2\tTabbed\rReturn";
      const encrypted = encrypt(withControl);
      const decrypted = decrypt(withControl);

      expect(decrypt(encrypted)).toBe(withControl);
    });
  });
});
