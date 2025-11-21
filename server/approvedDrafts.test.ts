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

describe("david.approvedDrafts", () => {
  it("cria minuta aprovada com sucesso", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.david.approvedDrafts.create({
      processId: 1,
      conversationId: 1,
      messageId: 1,
      originalDraft: "Minuta de teste gerada pelo DAVID",
      draftType: "decisao",
      approvalStatus: "approved",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("cria minuta editada e aprovada", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.david.approvedDrafts.create({
      processId: 1,
      conversationId: 1,
      messageId: 2,
      originalDraft: "Minuta original",
      editedDraft: "Minuta editada pelo usuário",
      draftType: "sentenca",
      approvalStatus: "edited_approved",
      userNotes: "Ajustei a fundamentação legal",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("lista minutas aprovadas do usuário", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar algumas minutas
    await caller.david.approvedDrafts.create({
      originalDraft: "Minuta 1",
      draftType: "decisao",
      approvalStatus: "approved",
    });

    await caller.david.approvedDrafts.create({
      originalDraft: "Minuta 2",
      editedDraft: "Minuta 2 editada",
      draftType: "sentenca",
      approvalStatus: "edited_approved",
    });

    const drafts = await caller.david.approvedDrafts.list();

    expect(Array.isArray(drafts)).toBe(true);
    expect(drafts.length).toBeGreaterThanOrEqual(2);
    expect(drafts[0]).toHaveProperty("originalDraft");
    expect(drafts[0]).toHaveProperty("approvalStatus");
  }, 30000); // Timeout de 30s pois extrai teses automaticamente

  it("recupera minuta aprovada por ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.david.approvedDrafts.create({
      originalDraft: "Minuta de teste",
      draftType: "despacho",
      approvalStatus: "approved",
    });

    const draft = await caller.david.approvedDrafts.get({ id: created.id });

    expect(draft).toBeDefined();
    expect(draft.id).toBe(created.id);
    expect(draft.originalDraft).toBe("Minuta de teste");
    expect(draft.draftType).toBe("despacho");
  });
});
