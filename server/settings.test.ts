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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("settings.update", () => {
  it("should allow saving with empty API key to use native LLM", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Salvar com API key vazia (undefined)
    const result = await caller.settings.update({
      llmApiKey: undefined,
      llmProvider: "google",
      llmModel: undefined,
    });

    expect(result).toEqual({ success: true });
  });

  it("should allow saving with API key and model", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Salvar com API key preenchida
    const result = await caller.settings.update({
      llmApiKey: "test-api-key-12345",
      llmProvider: "google",
      llmModel: "gemini-2.0-flash-exp",
    });

    expect(result).toEqual({ success: true });
  });

  it("should retrieve saved settings", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Salvar configurações
    await caller.settings.update({
      llmApiKey: "test-key",
      llmProvider: "openai",
      llmModel: "gpt-4",
    });

    // Recuperar configurações
    const settings = await caller.settings.get();

    expect(settings?.llmApiKey).toBe("test-key");
    expect(settings?.llmProvider).toBe("openai");
    expect(settings?.llmModel).toBe("gpt-4");
  });

  it("should allow clearing API key after it was set", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Primeiro salvar com API key
    await caller.settings.update({
      llmApiKey: "test-key",
      llmProvider: "google",
      llmModel: "gemini-pro",
    });

    // Depois limpar a API key
    await caller.settings.update({
      llmApiKey: undefined,
      llmProvider: "google",
      llmModel: undefined,
    });

    // Verificar que foi limpa
    const settings = await caller.settings.get();
    
    // API key deve ser null ou undefined após limpar
    expect(settings?.llmApiKey == null).toBe(true);
  });
});
