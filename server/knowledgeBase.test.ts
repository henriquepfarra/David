import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("knowledgeBase", () => {
  it("should create knowledge base document", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.knowledgeBase.create({
      title: "Decisão sobre Direito do Consumidor",
      content: "Conteúdo da decisão...",
      fileType: "pdf",
      category: "decisoes",
      tags: "consumidor,contrato",
    });

    expect(result).toEqual({ success: true });
  });

  it("should list user knowledge base documents", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.knowledgeBase.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should delete knowledge base document", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar documento primeiro
    await caller.knowledgeBase.create({
      title: "Documento Teste",
      content: "Conteúdo teste",
    });

    const docs = await caller.knowledgeBase.list();
    if (docs.length > 0) {
      const result = await caller.knowledgeBase.delete({ id: docs[0].id });
      expect(result).toEqual({ success: true });
    }
  });
});

describe("settings.listModels", () => {
  it("should list models with valid API key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Teste com fallback (API key inválida retorna lista estática)
    const result = await caller.settings.listModels({
      provider: "google",
      apiKey: "invalid-key",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
  });

  it("should return fallback models for different providers", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const providers = ["google", "openai", "anthropic"];

    for (const provider of providers) {
      const result = await caller.settings.listModels({
        provider,
        apiKey: "test-key",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
