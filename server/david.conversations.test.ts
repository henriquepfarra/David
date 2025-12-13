import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-user-conversations",
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

describe("david.togglePin", () => {
  it("deve fixar uma conversa não fixada", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar conversa
    const { id: conversationId } = await caller.david.createConversation({
      title: `Conversa para fixar ${Date.now()}`,
    });

    // Verificar que não está fixada
    const conversationsBefore = await caller.david.listConversations();
    const convBefore = conversationsBefore.find(c => c.id === conversationId);
    expect(convBefore?.isPinned).toBe(0);

    // Fixar
    await caller.david.togglePin({ id: conversationId });

    // Verificar que está fixada
    const conversationsAfter = await caller.david.listConversations();
    const convAfter = conversationsAfter.find(c => c.id === conversationId);
    expect(convAfter?.isPinned).toBe(1);
  });

  it("deve desafixar uma conversa fixada", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar e fixar conversa
    const { id: conversationId } = await caller.david.createConversation({
      title: `Conversa para desafixar ${Date.now()}`,
    });
    await caller.david.togglePin({ id: conversationId });

    // Verificar que está fixada
    const conversationsBefore = await caller.david.listConversations();
    const convBefore = conversationsBefore.find(c => c.id === conversationId);
    expect(convBefore?.isPinned).toBe(1);

    // Desafixar
    await caller.david.togglePin({ id: conversationId });

    // Verificar que não está fixada
    const conversationsAfter = await caller.david.listConversations();
    const convAfter = conversationsAfter.find(c => c.id === conversationId);
    expect(convAfter?.isPinned).toBe(0);
  });

  it("deve ordenar conversas fixadas primeiro", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar 3 conversas
    const { id: conv1 } = await caller.david.createConversation({
      title: `Conv 1 ${Date.now()}`,
    });
    const { id: conv2 } = await caller.david.createConversation({
      title: `Conv 2 ${Date.now()}`,
    });
    const { id: conv3 } = await caller.david.createConversation({
      title: `Conv 3 ${Date.now()}`,
    });

    // Fixar apenas a conv2
    await caller.david.togglePin({ id: conv2 });

    // Listar conversas
    const conversations = await caller.david.listConversations();
    
    // Encontrar posições
    const pos1 = conversations.findIndex(c => c.id === conv1);
    const pos2 = conversations.findIndex(c => c.id === conv2);
    const pos3 = conversations.findIndex(c => c.id === conv3);

    // Conv2 (fixada) deve estar antes das outras
    expect(pos2).toBeLessThan(pos1);
    expect(pos2).toBeLessThan(pos3);
  });
});

describe("david.deleteMultiple", () => {
  it("deve deletar múltiplas conversas de uma vez", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar 3 conversas
    const { id: conv1 } = await caller.david.createConversation({
      title: `Conv Delete 1 ${Date.now()}`,
    });
    const { id: conv2 } = await caller.david.createConversation({
      title: `Conv Delete 2 ${Date.now()}`,
    });
    const { id: conv3 } = await caller.david.createConversation({
      title: `Conv Delete 3 ${Date.now()}`,
    });

    // Deletar 2 conversas
    const result = await caller.david.deleteMultiple({ ids: [conv1, conv2] });

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);

    // Verificar que foram deletadas
    const conversations = await caller.david.listConversations();
    expect(conversations.find(c => c.id === conv1)).toBeUndefined();
    expect(conversations.find(c => c.id === conv2)).toBeUndefined();
    expect(conversations.find(c => c.id === conv3)).toBeDefined();
  });

  it("não deve permitir deletar conversas de outro usuário", async () => {
    const { ctx: ctx1 } = createAuthContext();
    const caller1 = appRouter.createCaller(ctx1);

    // Usuário 1 cria conversa
    const { id: conv1 } = await caller1.david.createConversation({
      title: `Conv User 1 ${Date.now()}`,
    });

    // Usuário 2 tenta deletar
    const user2: AuthenticatedUser = {
      id: 998,
      openId: "test-user-2",
      email: "test2@example.com",
      name: "Test User 2",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx2: TrpcContext = {
      user: user2,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };

    const caller2 = appRouter.createCaller(ctx2);

    // Deve lançar erro
    await expect(
      caller2.david.deleteMultiple({ ids: [conv1] })
    ).rejects.toThrow();
  });
});
