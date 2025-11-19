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

describe("processes router", () => {
  it("should list user processes", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.processes.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a new process", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const processData = {
      processNumber: "1234567-89.2023.8.26.0100",
      court: "1ª Vara Cível",
      plaintiff: "João da Silva",
      defendant: "Maria Santos",
      subject: "Ação de Cobrança",
    };

    const result = await caller.processes.create(processData);
    
    expect(result).toBeDefined();
  });
});

describe("settings router", () => {
  it("should get user settings", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.get();
    
    // Settings pode ser undefined se não existir ainda
    expect(result === undefined || typeof result === "object").toBe(true);
  });

  it("should update user settings", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.update({
      llmProvider: "openai",
      llmModel: "gpt-4",
    });
    
    expect(result.success).toBe(true);
  });
});
