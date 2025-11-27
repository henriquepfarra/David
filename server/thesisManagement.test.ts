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

describe("Gerenciamento de Teses", () => {
  it("deve editar uma tese existente", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar uma tese
    const { id: thesisId } = await caller.david.learnedTheses.create({
      approvedDraftId: 1,
      processId: 1,
      thesis: "Tese original sobre tutela de urgência",
      legalFoundations: "Art. 300 CPC",
      keywords: "tutela, urgência",
      decisionPattern: "Padrão original",
    });

    // Editar a tese
    const result = await caller.david.learnedTheses.update({
      id: thesisId,
      thesis: "Tese atualizada sobre tutela de urgência com novo entendimento",
      legalFoundations: "Art. 300 CPC; Art. 14 CDC",
      keywords: "tutela, urgência, responsabilidade objetiva",
    });

    expect(result.success).toBe(true);

    // Verificar se foi atualizada
    const theses = await caller.david.learnedTheses.list();
    const updatedThesis = theses.find((t) => t.id === thesisId);

    expect(updatedThesis).toBeDefined();
    expect(updatedThesis?.thesis).toBe("Tese atualizada sobre tutela de urgência com novo entendimento");
    expect(updatedThesis?.legalFoundations).toBe("Art. 300 CPC; Art. 14 CDC");
    expect(updatedThesis?.keywords).toBe("tutela, urgência, responsabilidade objetiva");
  }, 15000);

  it("deve marcar tese como obsoleta", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar uma tese
    const { id: thesisId } = await caller.david.learnedTheses.create({
      approvedDraftId: 2,
      processId: 2,
      thesis: "Tese que será marcada como obsoleta",
      legalFoundations: "Art. 500 CPC",
      keywords: "teste, obsoleta",
    });

    // Marcar como obsoleta
    await caller.david.learnedTheses.update({
      id: thesisId,
      isObsolete: 1,
    });

    // Verificar se foi marcada
    const theses = await caller.david.learnedTheses.list();
    const obsoleteThesis = theses.find((t) => t.id === thesisId);

    expect(obsoleteThesis).toBeDefined();
    expect(obsoleteThesis?.isObsolete).toBe(1);

    // Desmarcar como obsoleta
    await caller.david.learnedTheses.update({
      id: thesisId,
      isObsolete: 0,
    });

    const thesesAfter = await caller.david.learnedTheses.list();
    const currentThesis = thesesAfter.find((t) => t.id === thesisId);

    expect(currentThesis?.isObsolete).toBe(0);
  }, 15000);

  it("deve deletar uma tese", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar uma tese
    const { id: thesisId } = await caller.david.learnedTheses.create({
      approvedDraftId: 3,
      processId: 3,
      thesis: "Tese que será deletada",
      legalFoundations: "Art. 600 CPC",
      keywords: "teste, delete",
    });

    // Verificar que existe
    const thesesBefore = await caller.david.learnedTheses.list();
    const thesisBefore = thesesBefore.find((t) => t.id === thesisId);
    expect(thesisBefore).toBeDefined();

    // Deletar
    const result = await caller.david.learnedTheses.delete({ id: thesisId });
    expect(result.success).toBe(true);

    // Verificar que foi deletada
    const thesesAfter = await caller.david.learnedTheses.list();
    const thesisAfter = thesesAfter.find((t) => t.id === thesisId);
    expect(thesisAfter).toBeUndefined();
  }, 15000);
});
