import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
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

describe("processes.extractFromPDF", () => {
  it("should validate input and reject insufficient text", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.processes.extractFromPDF({
        text: "Texto muito curto",
      })
    ).rejects.toThrow("Nenhum conte\u00fado v\u00e1lido fornecido para extra\u00e7\u00e3o");
  });
  
  // Nota: Teste de extração real requer API key configurada
  // A funcionalidade pode ser testada manualmente na interface
});
