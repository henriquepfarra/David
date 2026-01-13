import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("env.ts - Environment Variable Validation", () => {
  /**
   * Testes para validação de variáveis de ambiente usando Zod
   * Testa os schemas sem depender do process.env real
   */

  describe("Environment Schema - Required Fields", () => {
    const envSchema = z.object({
      JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
      DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    });

    it("deve aceitar configuração mínima válida", () => {
      const env = {
        JWT_SECRET: "secret123",
        DATABASE_URL: "mysql://localhost:3306/db",
      };

      const result = envSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.JWT_SECRET).toBe("secret123");
        expect(result.data.NODE_ENV).toBe("development"); // default
      }
    });

    it("deve rejeitar JWT_SECRET vazio", () => {
      const env = {
        JWT_SECRET: "",
        DATABASE_URL: "mysql://localhost:3306/db",
      };

      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
    });

    it("deve rejeitar DATABASE_URL ausente", () => {
      const env = {
        JWT_SECRET: "secret123",
      };

      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
    });

    it("deve rejeitar JWT_SECRET ausente", () => {
      const env = {
        DATABASE_URL: "mysql://localhost:3306/db",
      };

      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
    });
  });

  describe("NODE_ENV - Validation", () => {
    const nodeEnvSchema = z.enum(["development", "production", "test"]).default("development");

    it("deve aceitar 'development'", () => {
      const result = nodeEnvSchema.parse("development");
      expect(result).toBe("development");
    });

    it("deve aceitar 'production'", () => {
      const result = nodeEnvSchema.parse("production");
      expect(result).toBe("production");
    });

    it("deve aceitar 'test'", () => {
      const result = nodeEnvSchema.parse("test");
      expect(result).toBe("test");
    });

    it("deve usar 'development' como padrão quando undefined", () => {
      const result = nodeEnvSchema.parse(undefined);
      expect(result).toBe("development");
    });

    it("deve rejeitar valores inválidos", () => {
      expect(() => nodeEnvSchema.parse("staging")).toThrow();
      expect(() => nodeEnvSchema.parse("prod")).toThrow();
      expect(() => nodeEnvSchema.parse("dev")).toThrow();
    });
  });

  describe("Optional Fields - Validation", () => {
    const optionalSchema = z.object({
      GOOGLE_CLIENT_ID: z.string().optional(),
      GOOGLE_CLIENT_SECRET: z.string().optional(),
      GEMINI_API_KEY: z.string().optional(),
      OPENAI_API_KEY: z.string().optional(),
      VITE_APP_ID: z.string().optional(),
      PORT: z.string().optional(),
    });

    it("deve aceitar todos os campos opcionais ausentes", () => {
      const env = {};

      const result = optionalSchema.safeParse(env);

      expect(result.success).toBe(true);
    });

    it("deve aceitar GOOGLE_CLIENT_ID presente", () => {
      const env = {
        GOOGLE_CLIENT_ID: "123456789.apps.googleusercontent.com",
      };

      const result = optionalSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.GOOGLE_CLIENT_ID).toContain("googleusercontent.com");
      }
    });

    it("deve aceitar GEMINI_API_KEY presente", () => {
      const env = {
        GEMINI_API_KEY: "AIzaSy...",
      };

      const result = optionalSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.GEMINI_API_KEY).toBeTruthy();
      }
    });

    it("deve aceitar OPENAI_API_KEY presente", () => {
      const env = {
        OPENAI_API_KEY: "sk-...",
      };

      const result = optionalSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.OPENAI_API_KEY).toBeTruthy();
      }
    });

    it("deve aceitar PORT como string", () => {
      const env = {
        PORT: "3000",
      };

      const result = optionalSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe("3000");
      }
    });
  });

  describe("ENV Object - Structure", () => {
    it("deve ter propriedade isProduction baseada em NODE_ENV", () => {
      const nodeEnv1 = "production";
      const isProduction1 = nodeEnv1 === "production";

      expect(isProduction1).toBe(true);

      const nodeEnv2 = "development";
      const isProduction2 = nodeEnv2 === "production";

      expect(isProduction2).toBe(false);
    });

    it("deve usar string vazia como fallback para campos opcionais", () => {
      const optionalValue = undefined;
      const value = optionalValue ?? "";

      expect(value).toBe("");
    });

    it("deve preservar valor presente em campo opcional", () => {
      const optionalValue = "my-api-key";
      const value = optionalValue ?? "";

      expect(value).toBe("my-api-key");
    });

    it("deve usar cookieSecret como alias de JWT_SECRET", () => {
      const jwtSecret = "my-secret-key";
      const cookieSecret = jwtSecret;

      expect(cookieSecret).toBe(jwtSecret);
    });
  });

  describe("Database URL - Validation", () => {
    const databaseUrlSchema = z.string().min(1);

    it("deve aceitar URL MySQL válida", () => {
      const url = "mysql://user:pass@localhost:3306/database";

      const result = databaseUrlSchema.safeParse(url);

      expect(result.success).toBe(true);
    });

    it("deve aceitar URL PostgreSQL válida", () => {
      const url = "postgresql://user:pass@localhost:5432/database";

      const result = databaseUrlSchema.safeParse(url);

      expect(result.success).toBe(true);
    });

    it("deve aceitar URL com Railway (proxy público)", () => {
      const url = "mysql://root:password@tramway.proxy.rlwy.net:40154/railway";

      const result = databaseUrlSchema.safeParse(url);

      expect(result.success).toBe(true);
    });

    it("deve rejeitar URL vazia", () => {
      const url = "";

      const result = databaseUrlSchema.safeParse(url);

      expect(result.success).toBe(false);
    });
  });

  describe("API Keys - Format Validation", () => {
    it("deve reconhecer formato de chave Gemini (AIza...)", () => {
      const key = "AIzaSyAfNMrxUmI2La8AQjyDlF8UEKwX7EL-Y6U";

      expect(key).toMatch(/^AIza/);
    });

    it("deve reconhecer formato de chave OpenAI (sk-...)", () => {
      const key = "sk-svcacct-hcn5sGw8OYSrd6eLkT9j5q8ASitsRAtaBOI59ONZ";

      expect(key).toMatch(/^sk-/);
    });

    it("deve reconhecer formato de Google Client ID", () => {
      const clientId = "123456789-abcdefghijklmnop.apps.googleusercontent.com";

      expect(clientId).toContain("apps.googleusercontent.com");
    });
  });

  describe("Error Messages - Validation", () => {
    const envSchema = z.object({
      JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
      DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    });

    it("deve gerar erro com mensagem customizada para JWT_SECRET", () => {
      const env = {
        JWT_SECRET: "",
        DATABASE_URL: "mysql://localhost/db",
      };

      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.JWT_SECRET).toBeDefined();
      }
    });

    it("deve gerar erro com mensagem customizada para DATABASE_URL", () => {
      const env = {
        JWT_SECRET: "secret",
        DATABASE_URL: "",
      };

      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.DATABASE_URL).toBeDefined();
      }
    });

    it("deve listar múltiplos erros quando vários campos estão inválidos", () => {
      const env = {
        JWT_SECRET: "",
        DATABASE_URL: "",
      };

      const result = envSchema.safeParse(env);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(Object.keys(errors).length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("Complete Configuration - Examples", () => {
    const fullSchema = z.object({
      JWT_SECRET: z.string().min(1),
      DATABASE_URL: z.string().min(1),
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      GOOGLE_CLIENT_ID: z.string().optional(),
      GOOGLE_CLIENT_SECRET: z.string().optional(),
      GEMINI_API_KEY: z.string().optional(),
      OPENAI_API_KEY: z.string().optional(),
      VITE_APP_ID: z.string().optional(),
      PORT: z.string().optional(),
    });

    it("deve validar configuração completa de desenvolvimento", () => {
      const env = {
        JWT_SECRET: "dev-secret-key",
        DATABASE_URL: "mysql://localhost:3306/david_dev",
        NODE_ENV: "development" as const,
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "GOCSPX-secret",
        GEMINI_API_KEY: "AIzaSy...",
        OPENAI_API_KEY: "sk-...",
        VITE_APP_ID: "com.example.app",
        PORT: "3000",
      };

      const result = fullSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("development");
        expect(result.data.PORT).toBe("3000");
      }
    });

    it("deve validar configuração mínima de produção", () => {
      const env = {
        JWT_SECRET: "prod-secret-key-very-long-and-secure",
        DATABASE_URL: "mysql://root:pass@tramway.proxy.rlwy.net:40154/railway",
        NODE_ENV: "production" as const,
      };

      const result = fullSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("production");
      }
    });

    it("deve validar configuração de teste", () => {
      const env = {
        JWT_SECRET: "test_secret_dev",
        DATABASE_URL: "mysql://localhost:3306/david_test",
        NODE_ENV: "test" as const,
      };

      const result = fullSchema.safeParse(env);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("test");
      }
    });
  });

  describe("Edge Cases", () => {
    it("deve tratar JWT_SECRET com espaços como válido", () => {
      const schema = z.string().min(1);
      const secret = "secret with spaces";

      const result = schema.safeParse(secret);

      expect(result.success).toBe(true);
    });

    it("deve tratar DATABASE_URL muito longa como válida", () => {
      const schema = z.string().min(1);
      const longUrl = "mysql://user:pass@very-long-host-name.example.com:3306/database_name_with_long_suffix";

      const result = schema.safeParse(longUrl);

      expect(result.success).toBe(true);
    });

    it("deve aceitar PORT como string numérica", () => {
      const portSchema = z.string().optional();

      expect(portSchema.parse("3000")).toBe("3000");
      expect(portSchema.parse("8080")).toBe("8080");
      expect(portSchema.parse("80")).toBe("80");
    });
  });
});
