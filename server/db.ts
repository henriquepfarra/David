import { eq, and, or } from "drizzle-orm";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import {
  InsertUser, users,
  InsertProcess, InsertDraft, InsertJurisprudence, InsertUserSettings, InsertKnowledgeBase
} from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { ENV } from './_core/env';
import { logger } from './_core/logger';

let _db: MySql2Database<typeof schema> | null = null;
export { _db as db };

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const connectionPool = createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        waitForConnections: true
      });
      _db = drizzle(connectionPool, { mode: "default", schema });
      logger.info("[Database] ✅ Connected to MySQL successfully");
    } catch (error) {
      console.error("[Database] ❌ Failed to connect to MySQL:", error);
      if (process.env.NODE_ENV !== "development") {
        throw error;
      }
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    // If DB is not available in development, we allow upserting the dev user silently
    // effectively doing nothing but preventing the crash.
    if (process.env.NODE_ENV === "development" && user.openId === "dev-user-id") {
      logger.debug("[Database] Dev mode: Mock upsert for dev user");
      return;
    }
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === "dev-user-id") {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    // In dev mode, return a mock user if DB is down
    if (process.env.NODE_ENV === "development" && openId === "dev-user-id") {
      logger.debug("[Database] Dev mode: Returning mock user for", openId);
      const { users } = await import("../drizzle/schema");
      // Return a mock implementation of the User type
      // We need to cast it or match the shape perfectly. 
      // Using 'any' cast here for safety against schema changes, but manually matching fields.
      return {
        id: 999999,
        openId: openId,
        name: "Desenvolvedor Local",
        email: "dev@local.test",
        loginMethod: "local",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date()
      } as unknown as typeof users.$inferSelect;
    }

    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Processos
export async function getUserProcesses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { processes } = await import("../drizzle/schema");
  return db.select().from(processes).where(eq(processes.userId, userId)).orderBy(processes.createdAt);
}

export async function getProcessById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { processes } = await import("../drizzle/schema");
  const result = await db.select().from(processes).where(eq(processes.id, id)).limit(1);
  if (result.length === 0 || result[0]!.userId !== userId) return undefined;
  return result[0];
}

export async function createProcess(data: InsertProcess) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { processes } = await import("../drizzle/schema");
  const [header] = await db.insert(processes).values(data);
  return { id: header.insertId };
}

export async function updateProcess(id: number, userId: number, data: Partial<InsertProcess>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { processes } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.update(processes).set(data).where(and(eq(processes.id, id), eq(processes.userId, userId)));
}

export async function deleteProcess(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { processes } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.delete(processes).where(and(eq(processes.id, id), eq(processes.userId, userId)));
}

/**
 * Upsert process metadata (auto-save)
 * If process already exists for user, update lastActivityAt
 * Otherwise, create new process record
 */
export async function upsertProcessMetadata(
  metadata: {
    processNumber: string;
    plaintiff?: string | null;
    defendant?: string | null;
    court?: string | null;
    subject?: string | null;
  },
  userId: number
): Promise<{ processId: number; isNew: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { processes } = await import("../drizzle/schema");
  const { and, sql } = await import("drizzle-orm");
  const { normalizeProcessNumber } = await import("./services/ProcessMetadataExtractor");

  // Normalizar número do processo para comparação
  const normalized = normalizeProcessNumber(metadata.processNumber);

  // Verificar se já existe
  const existing = await db
    .select()
    .from(processes)
    .where(
      and(
        eq(processes.userId, userId),
        sql`REPLACE(REPLACE(REPLACE(${processes.processNumber}, '.', ''), '-', ''), ' ', '') = ${normalized}`
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Processo já existe - atualizar timestamp
    await db
      .update(processes)
      .set({
        lastActivityAt: new Date(),
        updatedAt: new Date(),
        ...(metadata.plaintiff && { plaintiff: metadata.plaintiff }),
        ...(metadata.defendant && { defendant: metadata.defendant }),
        ...(metadata.court && { court: metadata.court }),
        ...(metadata.subject && { subject: metadata.subject }),
      })
      .where(eq(processes.id, existing[0]!.id));

    logger.info(`[ProcessMetadata] Updated existing process: ${metadata.processNumber}`);

    return { processId: existing[0]!.id, isNew: false };
  } else {
    // Novo processo - inserir
    const result = await db.insert(processes).values({
      userId,
      processNumber: metadata.processNumber,
      plaintiff: metadata.plaintiff || null,
      defendant: metadata.defendant || null,
      court: metadata.court || null,
      subject: metadata.subject || null,
      lastActivityAt: new Date(),
    });

    const processId = Number(result[0].insertId);
    logger.info(`[ProcessMetadata] Created new process: ${metadata.processNumber}`);

    return { processId, isNew: true };
  }
}


// Minutas
export async function getProcessDrafts(processId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { drafts } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  return db.select().from(drafts).where(and(eq(drafts.processId, processId), eq(drafts.userId, userId))).orderBy(drafts.createdAt);
}

export async function getUserDrafts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { drafts } = await import("../drizzle/schema");
  return db.select().from(drafts).where(eq(drafts.userId, userId)).orderBy(drafts.createdAt);
}

export async function createDraft(data: InsertDraft) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { drafts } = await import("../drizzle/schema");
  const result = await db.insert(drafts).values(data);
  return result;
}

export async function updateDraft(id: number, userId: number, data: Partial<InsertDraft>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { drafts } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.update(drafts).set(data).where(and(eq(drafts.id, id), eq(drafts.userId, userId)));
}

export async function deleteDraft(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { drafts } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.delete(drafts).where(and(eq(drafts.id, id), eq(drafts.userId, userId)));
}

// Jurisprudência
export async function getUserJurisprudence(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { jurisprudence } = await import("../drizzle/schema");
  return db.select().from(jurisprudence).where(eq(jurisprudence.userId, userId)).orderBy(jurisprudence.createdAt);
}

export async function createJurisprudence(data: InsertJurisprudence) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { jurisprudence } = await import("../drizzle/schema");
  const result = await db.insert(jurisprudence).values(data);
  return result;
}

export async function updateJurisprudence(id: number, userId: number, data: Partial<InsertJurisprudence>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { jurisprudence } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.update(jurisprudence).set(data).where(and(eq(jurisprudence.id, id), eq(jurisprudence.userId, userId)));
}

export async function deleteJurisprudence(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { jurisprudence } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.delete(jurisprudence).where(and(eq(jurisprudence.id, id), eq(jurisprudence.userId, userId)));
}

// Configurações do usuário
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { userSettings } = await import("../drizzle/schema");
  const { decrypt } = await import("./_core/crypto");

  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

  if (result.length === 0) return undefined;

  const settings = result[0];
  // Decrypt sensitive fields
  return {
    ...settings,
    llmApiKey: settings.llmApiKey ? decrypt(settings.llmApiKey) : null,
    readerApiKey: settings.readerApiKey ? decrypt(settings.readerApiKey) : null,
  };
}

export async function upsertUserSettings(userId: number, data: Partial<InsertUserSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { userSettings } = await import("../drizzle/schema");
  const { encrypt } = await import("./_core/crypto");

  // Converter undefined para null para limpar valores no banco
  const normalizedData: any = {};
  for (const key in data) {
    // @ts-ignore
    normalizedData[key] = data[key] === undefined ? null : data[key];
  }

  // Encrypt sensitive fields before saving
  if (normalizedData.llmApiKey) {
    normalizedData.llmApiKey = encrypt(normalizedData.llmApiKey);
  }
  if (normalizedData.readerApiKey) {
    normalizedData.readerApiKey = encrypt(normalizedData.readerApiKey);
  }

  await db.insert(userSettings).values({ userId, ...normalizedData }).onDuplicateKeyUpdate({ set: normalizedData });
}

// Base de Conhecimento
export async function createKnowledgeBase(data: InsertKnowledgeBase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { knowledgeBase } = await import("../drizzle/schema");
  const result = await db.insert(knowledgeBase).values(data);
  return result;
}

export async function getUserKnowledgeBase(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { knowledgeBase } = await import("../drizzle/schema");
  // Buscar documentos APENAS do usuário para gestão na UI (Settings)
  // Documentos do sistema (súmulas) são usados apenas internamente pelo RagService
  return db.select().from(knowledgeBase).where(
    eq(knowledgeBase.userId, userId)
  ).orderBy(knowledgeBase.createdAt);
}

export async function updateKnowledgeBase(id: number, userId: number, data: { content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { knowledgeBase } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.update(knowledgeBase)
    .set({ content: data.content, updatedAt: new Date() })
    .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.userId, userId)));
}

export async function deleteKnowledgeBase(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { knowledgeBase } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  await db.delete(knowledgeBase).where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.userId, userId)));
}

// ===== DAVID Chat Functions =====

import {
  conversations,
  messages,
  savedPrompts,
  processes,
  type InsertConversation,
  type InsertMessage,
  type InsertSavedPrompt,
  type Conversation,
  type Message,
  type SavedPrompt
} from "../drizzle/schema";
import { desc } from "drizzle-orm";

// Conversas
export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [conversation] = await db.insert(conversations).values(data).$returningId();
  return conversation.id;
}

// Função auxiliar para deletar conversas vazias antigas
export async function deleteEmptyConversations(userId: number) {
  const db = await getDb();
  if (!db) return;

  const { inArray } = await import("drizzle-orm");

  try {
    // 1. Buscar todas as conversas do usuário
    const userConvos = await db
      .select({ id: conversations.id, createdAt: conversations.createdAt })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    if (userConvos.length === 0) return;

    const convIds = userConvos.map((c) => c.id);

    // 2. Buscar quais dessas têm mensagens
    const activeConvos = await db
      .selectDistinct({ conversationId: messages.conversationId })
      .from(messages)
      .where(inArray(messages.conversationId, convIds));

    const activeIds = new Set(activeConvos.map((c) => c.conversationId));

    // 3. Filtrar vazias com mais de 1 minuto de vida (pra evitar deletar conversa recém criada que user está digitando)
    const now = Date.now();
    const idsToDelete = userConvos
      .filter((c) => !activeIds.has(c.id))
      .filter((c) => now - new Date(c.createdAt).getTime() > 60 * 1000) // 1 minuto de tolerância
      .map((c) => c.id);

    // 4. Deletar
    if (idsToDelete.length > 0) {
      await db.delete(conversations).where(inArray(conversations.id, idsToDelete));
      logger.info(`[Cleanup] Deletadas ${idsToDelete.length} conversas vazias automaticamente.`);
    }
  } catch (err) {
    console.error("[Cleanup] Erro ao limpar conversas vazias:", err);
  }
}

export async function getUserConversations(userId: number): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];

  // Limpar conversas vazias antes de listar
  await deleteEmptyConversations(userId);

  // Ordenar: fixadas primeiro (isPinned DESC), depois por data de atualização (updatedAt DESC)
  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.isPinned), desc(conversations.updatedAt));
}

export async function getConversationById(id: number): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result[0];
}

export async function updateConversationProcess(conversationId: number, processId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(conversations)
    .set({
      processId: processId,
      updatedAt: new Date()
    })
    .where(eq(conversations.id, conversationId));
}

export async function updateConversationTitle(conversationId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(conversations)
    .set({
      title: title,
      updatedAt: new Date()
    })
    .where(eq(conversations.id, conversationId));
}

export async function updateConversationGoogleFile(
  conversationId: number,
  googleFileUri: string | null,
  googleFileName: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(conversations)
    .set({
      googleFileUri,
      googleFileName,
      updatedAt: new Date()
    })
    .where(eq(conversations.id, conversationId));
}

export async function getConversationGoogleFile(conversationId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      googleFileUri: conversations.googleFileUri,
      googleFileName: conversations.googleFileName,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return result[0] || null;
}

/**
 * Get the active module for a conversation.
 * Falls back to user's default module if conversation doesn't have one set.
 */
export async function getConversationModuleSlug(
  conversationId: number,
  userId: number
): Promise<string> {
  const db = await getDb();
  if (!db) return 'default';

  // First, check if conversation has a module set
  const convo = await db
    .select({ moduleSlug: conversations.moduleSlug })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (convo[0]?.moduleSlug) {
    return convo[0].moduleSlug;
  }

  // Fall back to user's default module
  const { userSettings } = await import("../drizzle/schema");
  const settings = await db
    .select({ defaultModule: userSettings.defaultModule })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return settings[0]?.defaultModule || 'default';
}

/**
 * Find conversations that have a process with the given processNumber
 * Used to detect duplicate process uploads
 */
export async function findConversationsByProcessNumber(
  userId: number,
  processNumber: string
): Promise<{ conversationId: number; conversationTitle: string; processId: number }[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      conversationId: conversations.id,
      conversationTitle: conversations.title,
      processId: conversations.processId,
    })
    .from(conversations)
    .innerJoin(processes, eq(conversations.processId, processes.id))
    .where(
      and(
        eq(conversations.userId, userId),
        eq(processes.processNumber, processNumber)
      )
    );

  return result.filter(r => r.processId !== null) as { conversationId: number; conversationTitle: string; processId: number }[];
}

export async function toggleConversationPin(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot toggle pin: database not available");
    return;
  }

  // Buscar estado atual
  const conversation = await getConversationById(id);
  if (!conversation) {
    throw new Error("Conversa não encontrada");
  }

  // Inverter estado de isPinned (0 -> 1, 1 -> 0)
  const newPinnedState = conversation.isPinned === 1 ? 0 : 1;

  await db
    .update(conversations)
    .set({ isPinned: newPinnedState })
    .where(eq(conversations.id, id));
}

export async function deleteConversation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Deletar mensagens primeiro
  await db.delete(messages).where(eq(messages.conversationId, id));
  // Deletar conversa
  await db.delete(conversations).where(eq(conversations.id, id));
}

// Mensagens
export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(messages).values(data);

  // Atualizar updatedAt da conversa
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
}

export async function getConversationMessages(conversationId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

// ============================================
// Coleções de Prompts
// ============================================

import { promptCollections, InsertPromptCollection, PromptCollection } from "../drizzle/schema";

export async function createPromptCollection(data: InsertPromptCollection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [collection] = await db.insert(promptCollections).values(data).$returningId();
  return collection.id;
}

export async function getUserPromptCollections(userId: number): Promise<(PromptCollection & { promptCount: number })[]> {
  const db = await getDb();
  if (!db) return [];

  const { count, sql } = await import("drizzle-orm");

  // Query com contagem de prompts por coleção
  const collections = await db
    .select({
      id: promptCollections.id,
      userId: promptCollections.userId,
      name: promptCollections.name,
      createdAt: promptCollections.createdAt,
      updatedAt: promptCollections.updatedAt,
      promptCount: sql<number>`(
        SELECT COUNT(*) FROM savedPrompts 
        WHERE savedPrompts.collectionId = ${promptCollections.id}
      )`.as("promptCount"),
    })
    .from(promptCollections)
    .where(eq(promptCollections.userId, userId))
    .orderBy(promptCollections.name);

  return collections;
}

export async function deletePromptCollection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Move prompts da coleção para a raiz (null)
  await db.update(savedPrompts).set({ collectionId: null }).where(eq(savedPrompts.collectionId, id));

  // Delete a coleção
  await db.delete(promptCollections).where(eq(promptCollections.id, id));
}

export async function updatePromptCollection(id: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(promptCollections).set({ name }).where(eq(promptCollections.id, id));
}

// ============================================
// Prompts Salvos
// ============================================
export async function createSavedPrompt(data: InsertSavedPrompt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [prompt] = await db.insert(savedPrompts).values(data).$returningId();
  return prompt.id;
}

export async function getUserSavedPrompts(userId: number): Promise<SavedPrompt[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(savedPrompts)
    .where(eq(savedPrompts.userId, userId))
    .orderBy(desc(savedPrompts.createdAt));
}

export async function getSavedPromptsPaginated(options: {
  userId: number;
  limit: number;
  cursor?: number; // ID do último item para paginação
  search?: string;
  category?: string | null;
}) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: undefined };

  const { like, or, lt, and, isNull } = await import("drizzle-orm");

  const conditions = [eq(savedPrompts.userId, options.userId)];

  // Paginação (Items mais antigos que o cursor)
  if (options.cursor) {
    conditions.push(lt(savedPrompts.id, options.cursor));
  }

  // Busca (Título ou Conteúdo)
  if (options.search) {
    const searchPattern = `%${options.search}%`;
    const searchCondition = or(
      like(savedPrompts.title, searchPattern),
      like(savedPrompts.content, searchPattern)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // Filtro por Categoria
  if (options.category === null) {
    conditions.push(isNull(savedPrompts.category));
  } else if (typeof options.category === "string") {
    conditions.push(eq(savedPrompts.category, options.category));
  }

  const limit = options.limit + 1; // Buscar 1 a mais para saber se tem próximo

  const items = await db
    .select()
    .from(savedPrompts)
    .where(and(...conditions))
    .orderBy(desc(savedPrompts.id)) // Ordenação estável por ID (assume ID auto-incremento correlacionado com tempo)
    .limit(limit);

  let nextCursor: number | undefined = undefined;
  if (items.length > options.limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return {
    items,
    nextCursor,
  };
}

export async function getUniqueCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { count, isNotNull } = await import("drizzle-orm");

  return await db
    .select({
      name: savedPrompts.category,
      count: count(savedPrompts.id),
    })
    .from(savedPrompts)
    .where(
      and(
        eq(savedPrompts.userId, userId),
        isNotNull(savedPrompts.category)
      )
    )
    .groupBy(savedPrompts.category);
}

export async function getSavedPromptById(id: number): Promise<SavedPrompt | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(savedPrompts).where(eq(savedPrompts.id, id)).limit(1);
  return result[0];
}

export async function updateSavedPrompt(id: number, data: Partial<InsertSavedPrompt>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(savedPrompts).set(data).where(eq(savedPrompts.id, id));
}

export async function deleteSavedPrompt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(savedPrompts).where(eq(savedPrompts.id, id));
}

// Obter processo com todos os dados para contexto do DAVID
export async function getProcessForContext(processId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(processes).where(eq(processes.id, processId)).limit(1);
  return result[0];
}


// Configurações do DAVID
export async function getDavidConfig(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const { davidConfig } = await import("../drizzle/schema");
  const result = await db.select().from(davidConfig).where(eq(davidConfig.userId, userId)).limit(1);
  return result[0] || null;
}

export async function upsertDavidConfig(userId: number, systemPrompt: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { davidConfig } = await import("../drizzle/schema");

  // Tentar atualizar primeiro
  const existing = await getDavidConfig(userId);

  if (existing) {
    await db
      .update(davidConfig)
      .set({ systemPrompt, updatedAt: new Date() })
      .where(eq(davidConfig.userId, userId));
  } else {
    await db.insert(davidConfig).values({
      userId,
      systemPrompt,
    });
  }
}


// ===== Aprendizado: Minutas Aprovadas e Teses =====

import {
  approvedDrafts,
  learnedTheses,
  type InsertApprovedDraft,
  type InsertLearnedThesis,
  type ApprovedDraft,
  type LearnedThesis
} from "../drizzle/schema";

// Minutas Aprovadas
export async function createApprovedDraft(data: InsertApprovedDraft) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [draft] = await db.insert(approvedDrafts).values(data).$returningId();
  return draft.id;
}

export async function getUserApprovedDrafts(userId: number): Promise<ApprovedDraft[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(approvedDrafts)
    .where(eq(approvedDrafts.userId, userId))
    .orderBy(desc(approvedDrafts.createdAt));
}

export async function getApprovedDraftById(id: number): Promise<ApprovedDraft | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(approvedDrafts).where(eq(approvedDrafts.id, id)).limit(1);
  return result[0];
}

export async function updateApprovedDraft(id: number, data: Partial<InsertApprovedDraft>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(approvedDrafts).set(data).where(eq(approvedDrafts.id, id));
}

export async function deleteApprovedDraft(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(approvedDrafts).where(eq(approvedDrafts.id, id));
}

// Teses Aprendidas
export async function createLearnedThesis(data: InsertLearnedThesis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [thesis] = await db.insert(learnedTheses).values(data).$returningId();
  return thesis.id;
}

export async function getUserLearnedTheses(userId: number): Promise<LearnedThesis[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(learnedTheses)
    .where(eq(learnedTheses.userId, userId))
    .orderBy(desc(learnedTheses.createdAt));
}

export async function getLearnedThesisByDraftId(approvedDraftId: number): Promise<LearnedThesis | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(learnedTheses).where(eq(learnedTheses.approvedDraftId, approvedDraftId)).limit(1);
  return result[0];
}

export async function updateLearnedThesis(id: number, data: Partial<InsertLearnedThesis>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(learnedTheses).set(data).where(eq(learnedTheses.id, id));
}

export async function deleteLearnedThesis(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(learnedTheses).where(eq(learnedTheses.id, id));
}

// Buscar teses similares por palavras-chave
export async function searchSimilarTheses(userId: number, keywords: string[]): Promise<LearnedThesis[]> {
  const db = await getDb();
  if (!db) return [];

  // Busca simples por palavras-chave (pode ser melhorada com busca semântica futuramente)
  const { and, or, like } = await import("drizzle-orm");

  const conditions = keywords.map(keyword =>
    or(
      like(learnedTheses.keywords, `%${keyword}%`),
      like(learnedTheses.thesis, `%${keyword}%`)
    )
  );

  return await db
    .select()
    .from(learnedTheses)
    .where(and(
      eq(learnedTheses.userId, userId),
      eq(learnedTheses.isObsolete, 0),
      or(...conditions)
    ))
    .orderBy(desc(learnedTheses.createdAt))
    .limit(10);
}

// ===== Process Documents =====

export async function createProcessDocument(doc: {
  userId: number;
  processId: number;
  title: string;
  content: string;
  fileType?: string;
  fileUrl?: string;
  documentType?: "inicial" | "prova" | "peticao" | "sentenca" | "recurso" | "outro";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { processDocuments } = await import("../drizzle/schema");

  const result = await db.insert(processDocuments).values({
    userId: doc.userId,
    processId: doc.processId,
    title: doc.title,
    content: doc.content,
    fileType: doc.fileType || null,
    fileUrl: doc.fileUrl || null,
    documentType: doc.documentType || "outro",
  });

  return result;
}

export async function getProcessDocuments(processId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { processDocuments } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  const docs = await db
    .select()
    .from(processDocuments)
    .where(
      and(
        eq(processDocuments.processId, processId),
        eq(processDocuments.userId, userId)
      )
    )
    .orderBy(processDocuments.createdAt);

  return docs;
}

export async function deleteProcessDocument(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { processDocuments } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  await db
    .delete(processDocuments)
    .where(
      and(
        eq(processDocuments.id, id),
        eq(processDocuments.userId, userId)
      )
    );

  return { success: true };
}
