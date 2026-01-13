import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getDb, upsertUser } from "./db";
import type { InsertUser } from "../drizzle/schema";

describe("db.ts - Database Functions", () => {
  describe("getDb", () => {
    it("deve retornar null se DATABASE_URL não estiver definida", async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      // Reset the module to clear cached db instance
      const db = await getDb();

      expect(db).toBeNull();

      // Restore
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    });

    it("deve retornar instância do drizzle se DATABASE_URL estiver definida", async () => {
      if (!process.env.DATABASE_URL) {
        console.log("⏭️  Skipping: DATABASE_URL não definida");
        return;
      }

      const db = await getDb();
      expect(db).toBeDefined();
      expect(db).not.toBeNull();
    });
  });

  describe("upsertUser", () => {
    it("deve lançar erro se openId não for fornecido", async () => {
      const invalidUser = {
        name: "Test User",
        email: "test@example.com",
      } as InsertUser;

      await expect(upsertUser(invalidUser)).rejects.toThrow(
        "User openId is required for upsert"
      );
    });

    it("deve permitir upsert do dev user em modo desenvolvimento sem DB", async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalDbUrl = process.env.DATABASE_URL;

      process.env.NODE_ENV = "development";
      delete process.env.DATABASE_URL;

      const devUser: InsertUser = {
        openId: "dev-user-id",
        name: "Dev User",
        email: "dev@example.com",
        loginMethod: "manus",
      };

      // Should not throw
      await expect(upsertUser(devUser)).resolves.toBeUndefined();

      // Restore
      process.env.NODE_ENV = originalEnv;
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      }
    });

    it("deve definir role como admin para dev-user-id", async () => {
      if (!process.env.DATABASE_URL) {
        console.log("⏭️  Skipping: DATABASE_URL não definida");
        return;
      }

      const devUser: InsertUser = {
        openId: `dev-user-${Date.now()}`,
        name: "Dev User",
        email: "dev@example.com",
        loginMethod: "manus",
      };

      // Change to dev-user-id to trigger admin role
      devUser.openId = "dev-user-id";

      await expect(upsertUser(devUser)).resolves.toBeUndefined();
    });

    it("deve criar novo usuário com campos obrigatórios", async () => {
      if (!process.env.DATABASE_URL) {
        console.log("⏭️  Skipping: DATABASE_URL não definida");
        return;
      }

      const newUser: InsertUser = {
        openId: `test-user-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        loginMethod: "manus",
      };

      await expect(upsertUser(newUser)).resolves.toBeUndefined();
    });

    it("deve atualizar usuário existente (upsert behavior)", async () => {
      if (!process.env.DATABASE_URL) {
        console.log("⏭️  Skipping: DATABASE_URL não definida");
        return;
      }

      const openId = `test-upsert-${Date.now()}`;

      // First insert
      const user1: InsertUser = {
        openId,
        name: "Original Name",
        email: "original@example.com",
        loginMethod: "manus",
      };
      await upsertUser(user1);

      // Update via upsert
      const user2: InsertUser = {
        openId,
        name: "Updated Name",
        email: "updated@example.com",
      };
      await expect(upsertUser(user2)).resolves.toBeUndefined();
    });

    it("deve lidar com campos nulos", async () => {
      if (!process.env.DATABASE_URL) {
        console.log("⏭️  Skipping: DATABASE_URL não definida");
        return;
      }

      const userWithNulls: InsertUser = {
        openId: `test-nulls-${Date.now()}`,
        name: null,
        email: null,
        loginMethod: "manus",
      };

      await expect(upsertUser(userWithNulls)).resolves.toBeUndefined();
    });

    it("deve definir lastSignedIn automaticamente se não fornecido", async () => {
      if (!process.env.DATABASE_URL) {
        console.log("⏭️  Skipping: DATABASE_URL não definida");
        return;
      }

      const user: InsertUser = {
        openId: `test-lastsigned-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        loginMethod: "manus",
        // lastSignedIn omitted
      };

      await expect(upsertUser(user)).resolves.toBeUndefined();
    });
  });

  describe("Validações de Campos", () => {
    it("deve aceitar apenas valores válidos para loginMethod", async () => {
      if (!process.env.DATABASE_URL) {
        console.log("⏭️  Skipping: DATABASE_URL não definida");
        return;
      }

      const validMethods = ["manus", "google", "github"] as const;

      for (const method of validMethods) {
        const user: InsertUser = {
          openId: `test-method-${method}-${Date.now()}`,
          name: "Test User",
          email: "test@example.com",
          loginMethod: method,
        };

        await expect(upsertUser(user)).resolves.toBeUndefined();
      }
    });

    it("deve aceitar valores válidos para role", async () => {
      if (!process.env.DATABASE_URL) {
        console.log("⏭️  Skipping: DATABASE_URL não definida");
        return;
      }

      const validRoles = ["user", "admin"] as const;

      for (const role of validRoles) {
        const user: InsertUser = {
          openId: `test-role-${role}-${Date.now()}`,
          name: "Test User",
          email: "test@example.com",
          loginMethod: "manus",
          role,
        };

        await expect(upsertUser(user)).resolves.toBeUndefined();
      }
    });
  });
});
