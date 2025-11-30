import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, longtext, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Processos judiciais
export const processes = mysqlTable("processes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  processNumber: varchar("processNumber", { length: 50 }).notNull(),
  court: varchar("court", { length: 100 }),
  judge: varchar("judge", { length: 200 }),
  plaintiff: text("plaintiff"),
  defendant: text("defendant"),
  subject: text("subject"),
  facts: longtext("facts"),
  evidence: longtext("evidence"),
  requests: longtext("requests"),
  status: varchar("status", { length: 50 }),
  distributionDate: timestamp("distributionDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("processes_userId_idx").on(table.userId),
}));

export type Process = typeof processes.$inferSelect;
export type InsertProcess = typeof processes.$inferInsert;

// Minutas geradas
export const drafts = mysqlTable("drafts", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(),
  userId: int("userId").notNull(),
  draftType: mysqlEnum("draftType", ["sentenca", "decisao", "despacho", "acordao"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: longtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("drafts_userId_idx").on(table.userId),
  processIdIdx: index("drafts_processId_idx").on(table.processId),
}));

export type Draft = typeof drafts.$inferSelect;
export type InsertDraft = typeof drafts.$inferInsert;

// Jurisprudências salvas
export const jurisprudence = mysqlTable("jurisprudence", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  court: varchar("court", { length: 100 }).notNull(),
  caseNumber: varchar("caseNumber", { length: 100 }),
  title: varchar("title", { length: 300 }).notNull(),
  summary: text("summary"),
  content: longtext("content").notNull(),
  decisionDate: timestamp("decisionDate"),
  keywords: text("keywords"),
  url: varchar("url", { length: 500 }),
  isFavorite: int("isFavorite").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("jurisprudence_userId_idx").on(table.userId),
}));

export type Jurisprudence = typeof jurisprudence.$inferSelect;
export type InsertJurisprudence = typeof jurisprudence.$inferInsert;

// Configurações do usuário
export const userSettings = mysqlTable("userSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  llmApiKey: text("llmApiKey"),
  llmProvider: varchar("llmProvider", { length: 50 }).default("openai"),
  llmModel: varchar("llmModel", { length: 100 }).default("gpt-4"),
  customSystemPrompt: longtext("customSystemPrompt"), // System Prompt customizado do David
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// Base de conhecimento - Documentos de referência GLOBAIS (minutas modelo, teses, enunciados)
export const knowledgeBase = mysqlTable("knowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: longtext("content").notNull(),
  fileType: varchar("fileType", { length: 50 }), // pdf, docx, txt
  documentType: mysqlEnum("documentType", ["minuta_modelo", "decisao_referencia", "tese", "enunciado", "jurisprudencia", "outro"]).notNull().default("outro"), // Tipo específico do documento
  category: varchar("category", { length: 100 }), // decisoes, teses, referencias
  tags: text("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("knowledgeBase_userId_idx").on(table.userId),
}));

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;

// Documentos específicos de processos (PDFs do e-Proc, provas, petições)
export const processDocuments = mysqlTable("processDocuments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  processId: int("processId").notNull(), // Vinculado ao processo
  title: varchar("title", { length: 300 }).notNull(),
  content: longtext("content").notNull(), // Texto extraído do documento
  fileType: varchar("fileType", { length: 50 }), // pdf, docx, txt, jpg
  fileUrl: varchar("fileUrl", { length: 500 }), // URL do arquivo no S3 (se aplicável)
  documentType: mysqlEnum("documentType", ["inicial", "prova", "peticao", "sentenca", "recurso", "outro"]).notNull().default("outro"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("processDocuments_userId_idx").on(table.userId),
  processIdIdx: index("processDocuments_processId_idx").on(table.processId),
}));

export type ProcessDocument = typeof processDocuments.$inferSelect;
export type InsertProcessDocument = typeof processDocuments.$inferInsert;

// Conversas do DAVID (chat conversacional)
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  processId: int("processId"), // Processo associado (opcional)
  title: varchar("title", { length: 300 }).notNull(), // Título gerado automaticamente
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("conversations_userId_idx").on(table.userId),
}));

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Mensagens das conversas
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: longtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("messages_conversationId_idx").on(table.conversationId),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Prompts especializados salvos pelo usuário
export const savedPrompts = mysqlTable("savedPrompts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  category: varchar("category", { length: 100 }), // tutela, sentenca, decisao, analise
  content: longtext("content").notNull(), // O prompt completo
  description: text("description"), // Descrição do que o prompt faz
  isDefault: int("isDefault").default(0).notNull(), // Se é um prompt padrão do sistema
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("savedPrompts_userId_idx").on(table.userId),
}));

export type SavedPrompt = typeof savedPrompts.$inferSelect;
export type InsertSavedPrompt = typeof savedPrompts.$inferInsert;

// Configurações personalizadas do DAVID por usuário
export const davidConfig = mysqlTable("davidConfig", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  systemPrompt: longtext("systemPrompt"), // System prompt customizado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DavidConfig = typeof davidConfig.$inferSelect;
export type InsertDavidConfig = typeof davidConfig.$inferInsert;

// Minutas aprovadas pelo usuário (para aprendizado)
export const approvedDrafts = mysqlTable("approvedDrafts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  processId: int("processId"), // Processo vinculado (opcional)
  conversationId: int("conversationId"), // Conversa onde foi gerada
  messageId: int("messageId"), // Mensagem original do DAVID
  originalDraft: longtext("originalDraft").notNull(), // Minuta original gerada pelo DAVID
  editedDraft: longtext("editedDraft"), // Versão editada pelo usuário (se houver)
  draftType: mysqlEnum("draftType", ["sentenca", "decisao", "despacho", "acordao", "outro"]).notNull(),
  approvalStatus: mysqlEnum("approvalStatus", ["approved", "edited_approved", "rejected"]).notNull(),
  userNotes: text("userNotes"), // Comentários do usuário sobre a decisão
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("approvedDrafts_userId_idx").on(table.userId),
  processIdIdx: index("approvedDrafts_processId_idx").on(table.processId),
}));

export type ApprovedDraft = typeof approvedDrafts.$inferSelect;
export type InsertApprovedDraft = typeof approvedDrafts.$inferInsert;

// Teses jurídicas aprendidas a partir de minutas aprovadas
export const learnedTheses = mysqlTable("learnedTheses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  approvedDraftId: int("approvedDraftId").notNull(), // Minuta de origem
  processId: int("processId"), // Processo vinculado
  thesis: longtext("thesis").notNull(), // Tese firmada (ratio decidendi)
  legalFoundations: longtext("legalFoundations"), // Fundamentos jurídicos (artigos, súmulas)
  keywords: text("keywords"), // Palavras-chave para busca
  decisionPattern: longtext("decisionPattern"), // Padrão de redação identificado
  isObsolete: int("isObsolete").default(0).notNull(), // Marca se a tese foi superada
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("learnedTheses_userId_idx").on(table.userId),
  approvedDraftIdIdx: index("learnedTheses_approvedDraftId_idx").on(table.approvedDraftId),
}));

export type LearnedThesis = typeof learnedTheses.$inferSelect;
export type InsertLearnedThesis = typeof learnedTheses.$inferInsert;
