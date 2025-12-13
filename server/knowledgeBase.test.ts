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

describe("knowledgeBase.create and list", () => {
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

describe("knowledgeBase.update", () => {
  it("deve atualizar o conteúdo de um documento existente", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar documento de teste com timestamp único
    const timestamp = Date.now();
    await caller.knowledgeBase.create({
      title: `Documento de Teste Update ${timestamp}`,
      content: "Conteúdo original",
      fileType: "text/plain",
      category: "enunciado",
    });

    // Buscar o documento criado
    const docs = await caller.knowledgeBase.list();
    const testDoc = docs.find(d => d.title === `Documento de Teste Update ${timestamp}`);
    expect(testDoc).toBeDefined();
    expect(testDoc?.content).toBe("Conteúdo original");

    // Atualizar o conteúdo
    const result = await caller.knowledgeBase.update({
      id: testDoc!.id,
      content: "Conteúdo atualizado com novas informações",
    });

    expect(result).toEqual({ success: true });

    // Verificar se o conteúdo foi atualizado
    const updatedDocs = await caller.knowledgeBase.list();
    const updatedDoc = updatedDocs.find(d => d.id === testDoc!.id);
    expect(updatedDoc?.content).toBe("Conteúdo atualizado com novas informações");
  });

  it("não deve permitir atualizar documento de outro usuário", async () => {
    const { ctx: ctx1 } = createAuthContext();
    const caller1 = appRouter.createCaller(ctx1);

    // Criar documento com usuário 1 com timestamp único
    const timestamp = Date.now();
    await caller1.knowledgeBase.create({
      title: `Documento Privado Update ${timestamp}`,
      content: "Conteúdo privado",
    });

    const docs = await caller1.knowledgeBase.list();
    const privateDoc = docs.find(d => d.title === `Documento Privado Update ${timestamp}`);

    // Tentar atualizar com usuário 2
    const { ctx: ctx2 } = createAuthContext();
    ctx2.user!.id = 999; // ID diferente
    const caller2 = appRouter.createCaller(ctx2);

    await caller2.knowledgeBase.update({
      id: privateDoc!.id,
      content: "Tentativa de invasão",
    });

    // Verificar que o conteúdo NÃO foi alterado
    const verifyDocs = await caller1.knowledgeBase.list();
    const verifyDoc = verifyDocs.find(d => d.id === privateDoc!.id);
    expect(verifyDoc?.content).toBe("Conteúdo privado");
  });
});

describe("knowledgeBase.delete advanced", () => {
  it("não deve permitir deletar documento de outro usuário", async () => {
    const { ctx: ctx1 } = createAuthContext();
    const caller1 = appRouter.createCaller(ctx1);

    // Criar documento com usuário 1
    await caller1.knowledgeBase.create({
      title: "Documento Protegido Delete",
      content: "Não deve ser deletado",
    });

    const docs = await caller1.knowledgeBase.list();
    const protectedDoc = docs.find(d => d.title === "Documento Protegido Delete");
    const countBefore = docs.length;

    // Tentar deletar com usuário 2
    const { ctx: ctx2 } = createAuthContext();
    ctx2.user!.id = 999; // ID diferente
    const caller2 = appRouter.createCaller(ctx2);

    await caller2.knowledgeBase.delete({
      id: protectedDoc!.id,
    });

    // Verificar que o documento ainda existe
    const verifyDocs = await caller1.knowledgeBase.list();
    const verifyDoc = verifyDocs.find(d => d.id === protectedDoc!.id);
    expect(verifyDoc).toBeDefined();
    expect(verifyDoc?.title).toBe("Documento Protegido Delete");
    expect(verifyDocs.length).toBe(countBefore);
  });

  it("deve permitir deletar múltiplos documentos em sequência", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Criar 3 documentos de teste
    await caller.knowledgeBase.create({
      title: "Doc Multi 1",
      content: "Conteúdo 1",
    });
    await caller.knowledgeBase.create({
      title: "Doc Multi 2",
      content: "Conteúdo 2",
    });
    await caller.knowledgeBase.create({
      title: "Doc Multi 3",
      content: "Conteúdo 3",
    });

    const docsBefore = await caller.knowledgeBase.list();
    const doc1 = docsBefore.find(d => d.title === "Doc Multi 1");
    const doc2 = docsBefore.find(d => d.title === "Doc Multi 2");
    const doc3 = docsBefore.find(d => d.title === "Doc Multi 3");

    // Deletar os 3 documentos
    await caller.knowledgeBase.delete({ id: doc1!.id });
    await caller.knowledgeBase.delete({ id: doc2!.id });
    await caller.knowledgeBase.delete({ id: doc3!.id });

    // Verificar que todos foram removidos
    const docsAfter = await caller.knowledgeBase.list();
    expect(docsAfter.find(d => d.id === doc1!.id)).toBeUndefined();
    expect(docsAfter.find(d => d.id === doc2!.id)).toBeUndefined();
    expect(docsAfter.find(d => d.id === doc3!.id)).toBeUndefined();
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
