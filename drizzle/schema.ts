import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, longtext, index, json, date, bigint } from "drizzle-orm/mysql-core";

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
  /** Plano do usuário: tester (beta), free, pro, avancado (API própria) */
  plan: mysqlEnum("plan", ["tester", "free", "pro", "avancado"]).default("tester").notNull(),
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
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
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
  // LLM para raciocínio/geração
  llmApiKey: text("llmApiKey"),
  llmProvider: varchar("llmProvider", { length: 50 }).default("google"),
  llmModel: varchar("llmModel", { length: 100 }).default("gemini-3-flash-preview"),
  // File API para leitura de PDF (Google Gemini)
  readerApiKey: text("readerApiKey"), // Chave Gemini para File API
  readerModel: varchar("readerModel", { length: 100 }).default("gemini-2.0-flash"),
  // Configurações do assistente
  customSystemPrompt: longtext("customSystemPrompt"), // System Prompt customizado do David
  // Módulo especializado padrão
  defaultModule: varchar("defaultModule", { length: 20 }).default("default"), // 'default' | 'jec' | 'familia' | 'criminal' | 'fazenda'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// Chunks de documentos processados para RAG e Leitura Profunda
export const processDocumentChunks = mysqlTable("processDocumentChunks", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(), // Vinculado ao processo
  documentId: int("documentId").notNull(), // Vinculado ao documento original
  content: longtext("content").notNull(), // Texto fiel do chunk
  pageNumber: int("pageNumber").notNull(), // Página de origem
  chunkIndex: int("chunkIndex").notNull(), // Ordem sequencial na página
  tokenCount: int("tokenCount"), // Para gestão de janela de contexto
  embedding: json("embedding").$type<number[]>(), // Vetor (armazenado como JSON array)
  tags: text("tags"), // Metadados extras (ex: "comprovante", "assinatura")
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  processIdIdx: index("processDocumentChunks_processId_idx").on(table.processId),
  documentIdIdx: index("processDocumentChunks_documentId_idx").on(table.documentId),
}));

export type ProcessDocumentChunk = typeof processDocumentChunks.$inferSelect;
export type InsertProcessDocumentChunk = typeof processDocumentChunks.$inferInsert;

// Base de conhecimento - Documentos de referência GLOBAIS (minutas modelo, teses, enunciados)
export const knowledgeBase = mysqlTable("knowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  systemId: varchar("systemId", { length: 100 }).unique(), // ID único para documentos do sistema (ex: SUMULA_STJ_54) - usado para upsert
  title: varchar("title", { length: 300 }).notNull(),
  content: longtext("content").notNull(),
  fileType: varchar("fileType", { length: 50 }), // pdf, docx, txt
  documentType: mysqlEnum("documentType", [
    "minuta_modelo", "decisao_referencia", "tese", "enunciado",
    "jurisprudencia", "outro", "sumula_stj", "sumula_stf", "sumula_vinculante", "tema_repetitivo"
  ]).notNull().default("outro"), // Tipo específico do documento
  source: mysqlEnum("source", ["sistema", "usuario"]).notNull().default("usuario"), // Origem do documento (sistema = pré-carregado, usuario = adicionado pelo usuário)
  category: varchar("category", { length: 100 }), // decisoes, teses, referencias
  tags: text("tags"),
  embedding: json("embedding"), // Vetor de embedding para busca semântica (JSON array)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("knowledgeBase_userId_idx").on(table.userId),
  systemIdIdx: index("knowledgeBase_systemId_idx").on(table.systemId),
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
  isPinned: int("isPinned").default(0).notNull(), // 0 = não fixada, 1 = fixada
  googleFileUri: varchar("googleFileUri", { length: 500 }), // URI do arquivo no Google (para sessão)
  googleFileName: varchar("googleFileName", { length: 200 }), // Nome do arquivo no Google (para cleanup)
  pdfExtractedText: longtext("pdfExtractedText"), // Texto extraído localmente via pdf.js (null = usar FileAPI)
  moduleSlug: varchar("moduleSlug", { length: 20 }), // Módulo usado nesta conversa (opcional)
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
  thinking: longtext("thinking"), // Raciocínio/thinking do modelo (para mensagens assistant)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("messages_conversationId_idx").on(table.conversationId),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Coleções de prompts (pastas)
export const promptCollections = mysqlTable("promptCollections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("promptCollections_userId_idx").on(table.userId),
}));

export type PromptCollection = typeof promptCollections.$inferSelect;
export type InsertPromptCollection = typeof promptCollections.$inferInsert;

// Prompts especializados salvos pelo usuário
export const savedPrompts = mysqlTable("savedPrompts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  collectionId: int("collectionId"), // FK para promptCollections (null = raiz)
  title: varchar("title", { length: 300 }).notNull(),
  category: varchar("category", { length: 100 }), // DEPRECATED - usar collectionId
  content: longtext("content").notNull(), // O prompt completo
  description: text("description"), // Descrição do que o prompt faz
  isDefault: int("isDefault").default(0).notNull(), // Se é um prompt padrão do sistema
  executionMode: mysqlEnum("executionMode", ["chat", "full_context"]).default("chat").notNull(),
  tags: json("tags").$type<string[]>(), // Tags/Etiquetas para organização
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("savedPrompts_userId_idx").on(table.userId),
  collectionIdIdx: index("savedPrompts_collectionId_idx").on(table.collectionId),
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

  // ✨ NOVOS CAMPOS - Separação Tese Jurídica vs Estilo
  legalThesis: longtext("legalThesis").notNull(), // Ratio decidendi (Motor C - Argumentação)
  writingStyleSample: longtext("writingStyleSample"), // Padrão de redação (Motor B - Estilo)
  writingCharacteristics: json("writingCharacteristics").$type<{
    formality?: string;
    structure?: string;
    tone?: string;
  }>(), // Metadados do estilo

  // Campos legados (manter compatibilidade)
  thesis: longtext("thesis"), // DEPRECATED - usar legalThesis
  legalFoundations: longtext("legalFoundations"), // Fundamentos jurídicos (artigos, súmulas)
  keywords: text("keywords"), // Palavras-chave para busca
  decisionPattern: longtext("decisionPattern"), // DEPRECATED - usar writingStyleSample

  // ✨ Quality Gate - Status Workflow
  status: mysqlEnum("status", ["PENDING_REVIEW", "ACTIVE", "REJECTED"])
    .default("PENDING_REVIEW")
    .notNull(),
  reviewedAt: timestamp("reviewedAt"), // Quando foi revisado
  reviewedBy: int("reviewedBy"), // Quem revisou (userId)
  rejectionReason: text("rejectionReason"), // Motivo da rejeição (se status = REJECTED)

  // ✨ Embeddings Duais (Busca Semântica Separada)
  thesisEmbedding: json("thesisEmbedding").$type<number[]>(), // Vector do legalThesis
  styleEmbedding: json("styleEmbedding").$type<number[]>(), // Vector do writingStyleSample

  // Flags de controle
  isObsolete: int("isObsolete").default(0).notNull(), // Marca se a tese foi superada

  // Rastreamento de uso (Curadoria Inteligente)
  useCount: int("useCount").default(0).notNull(), // Quantas vezes foi retornada pelo RAG
  lastUsedAt: timestamp("lastUsedAt"), // Última vez que foi retornada pelo RAG

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("learnedTheses_userId_idx").on(table.userId),
  approvedDraftIdIdx: index("learnedTheses_approvedDraftId_idx").on(table.approvedDraftId),
  statusIdx: index("learnedTheses_status_idx").on(table.status), // ← Novo índice para queries eficientes
}));

export type LearnedThesis = typeof learnedTheses.$inferSelect;
export type InsertLearnedThesis = typeof learnedTheses.$inferInsert;

// Rastreamento de uso de API (rate limiting e custos)
export const usageTracking = mysqlTable("usageTracking", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // google, openai, anthropic
  model: varchar("model", { length: 100 }).notNull(),
  inputTokens: bigint("inputTokens", { mode: "number" }).default(0).notNull(),
  outputTokens: bigint("outputTokens", { mode: "number" }).default(0).notNull(),
  requestCount: int("requestCount").default(0).notNull(),
  date: date("date", { mode: "string" }).notNull(), // YYYY-MM-DD (agregado por dia)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userDateIdx: index("usageTracking_userId_date_idx").on(table.userId, table.date),
  dateIdx: index("usageTracking_date_idx").on(table.date),
}));

export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;
