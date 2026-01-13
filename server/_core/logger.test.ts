import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger.ts - Conditional Logging", () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Spy nos métodos do console
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restaurar console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("debug", () => {
    it("NÃO deve logar em ambiente test/production", () => {
      // NODE_ENV é "test" durante testes, não "development"
      logger.debug("Test debug message");

      // Em test/prod, debug não deve chamar console.log
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("deve aceitar múltiplos argumentos sem erro", () => {
      // Mesmo sem logar, não deve quebrar
      logger.debug("Message", { data: "test" }, 123, true);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("deve aceitar objetos complexos sem erro", () => {
      const complexObj = {
        nested: {
          deep: {
            value: "test"
          }
        },
        array: [1, 2, 3]
      };

      logger.debug("Complex:", complexObj);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("info", () => {
    it("NÃO deve logar em ambiente test/production", () => {
      logger.info("Test info message");

      // Em test/prod, info não deve chamar console.log
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("deve aceitar múltiplos argumentos sem erro", () => {
      logger.info("User login", { userId: 123, email: "test@example.com" });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("deve aceitar valores primitivos sem erro", () => {
      logger.info(null);
      logger.info(undefined);
      logger.info(0);
      logger.info(false);

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("warn", () => {
    it("deve logar em ambiente development", () => {
      process.env.NODE_ENV = "development";

      logger.warn("Test warning");

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", "Test warning");
    });

    it("deve logar em ambiente production", () => {
      process.env.NODE_ENV = "production";

      logger.warn("Production warning");

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", "Production warning");
    });

    it("deve aceitar múltiplos argumentos", () => {
      logger.warn("Deprecated API", "Use newAPI instead", { version: "2.0" });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[WARN]",
        "Deprecated API",
        "Use newAPI instead",
        { version: "2.0" }
      );
    });

    it("deve aceitar Error objects", () => {
      const error = new Error("Test error");
      logger.warn("Something went wrong", error);

      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", "Something went wrong", error);
    });
  });

  describe("error", () => {
    it("deve logar em ambiente development", () => {
      process.env.NODE_ENV = "development";

      logger.error("Test error");

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", "Test error");
    });

    it("deve logar em ambiente production", () => {
      process.env.NODE_ENV = "production";

      logger.error("Production error");

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", "Production error");
    });

    it("deve aceitar Error objects", () => {
      const error = new Error("Critical failure");
      logger.error("Fatal error occurred:", error);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", "Fatal error occurred:", error);
    });

    it("deve aceitar stack traces", () => {
      const error = new Error("Test");
      error.stack = "Error: Test\n  at test.ts:10:5";

      logger.error(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", error);
    });

    it("deve aceitar múltiplos argumentos", () => {
      logger.error("Database error", { code: "ECONNREFUSED", host: "localhost" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR]",
        "Database error",
        { code: "ECONNREFUSED", host: "localhost" }
      );
    });
  });

  describe("Edge Cases", () => {
    it("deve lidar com argumentos vazios", () => {
      logger.debug();
      logger.info();
      logger.warn();
      logger.error();

      // Não deve lançar erros
      expect(true).toBe(true);
    });

    it("deve lidar com strings vazias", () => {
      logger.debug("");
      logger.info("");
      logger.warn("");
      logger.error("");

      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", "");
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", "");
    });

    it("deve lidar com valores null e undefined", () => {
      logger.warn(null);
      logger.error(undefined);

      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN]", null);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR]", undefined);
    });

    it("deve lidar com objetos circulares", () => {
      const circular: any = { name: "test" };
      circular.self = circular;

      // Não deve lançar erro ao logar objeto circular
      logger.error("Circular object:", circular);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("deve lidar com arrays sem erro", () => {
      logger.info("Array:", [1, 2, 3, 4, 5]);
      // Em test/prod, info não loga
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("deve lidar com functions sem erro", () => {
      const fn = () => "test";
      logger.debug("Function:", fn);
      // Em test/prod, debug não loga
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("Prefixos de Log", () => {
    it("debug NÃO loga em test/prod", () => {
      logger.debug("test");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("info NÃO loga em test/prod", () => {
      logger.info("test");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("warn deve usar prefixo [WARN]", () => {
      logger.warn("test");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[WARN]"),
        expect.anything()
      );
    });

    it("error deve usar prefixo [ERROR]", () => {
      logger.error("test");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR]"),
        expect.anything()
      );
    });
  });

  describe("Casos Reais", () => {
    it("info NÃO loga em test/prod (ex: Server started)", () => {
      logger.info("Server started on port 3000");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("deve logar erros de banco de dados", () => {
      const dbError = new Error("Connection timeout");
      logger.error("Database connection failed:", dbError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[ERROR]",
        "Database connection failed:",
        dbError
      );
    });

    it("deve logar avisos de deprecação", () => {
      logger.warn("DEPRECATED: oldFunction() will be removed in v2.0");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[WARN]",
        "DEPRECATED: oldFunction() will be removed in v2.0"
      );
    });

    it("debug NÃO loga em test/prod (ex: HTTP Request)", () => {
      logger.debug("HTTP Request", {
        method: "POST",
        url: "/api/users",
        body: { name: "John" }
      });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
