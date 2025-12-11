import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
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
    } else if (user.openId === ENV.ownerOpenId) {
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

export async function createProcess(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { processes } = await import("../drizzle/schema");
  const result = await db.insert(processes).values(data);
  return result;
}

export async function updateProcess(id: number, userId: number, data: any) {
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

export async function createDraft(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { drafts } = await import("../drizzle/schema");
  const result = await db.insert(drafts).values(data);
  return result;
}

export async function updateDraft(id: number, userId: number, data: any) {
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

export async function createJurisprudence(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { jurisprudence } = await import("../drizzle/schema");
  const result = await db.insert(jurisprudence).values(data);
  return result;
}

export async function updateJurisprudence(id: number, userId: number, data: any) {
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
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserSettings(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { userSettings } = await import("../drizzle/schema");
  
  // Converter undefined para null para limpar valores no banco
  const normalizedData: any = {};
  for (const key in data) {
    normalizedData[key] = data[key] === undefined ? null : data[key];
  }
  
  await db.insert(userSettings).values({ userId, ...normalizedData }).onDuplicateKeyUpdate({ set: normalizedData });
}

// Base de Conhecimento
export async function createKnowledgeBase(data: any) {
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
  return db.select().from(knowledgeBase).where(eq(knowledgeBase.userId, userId)).orderBy(knowledgeBase.createdAt);
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

export async function getUserConversations(userId: number): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
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

// Prompts Salvos
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
