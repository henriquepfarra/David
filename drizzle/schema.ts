import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  facts: text("facts"),
  evidence: text("evidence"),
  requests: text("requests"),
  status: varchar("status", { length: 50 }),
  distributionDate: timestamp("distributionDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Process = typeof processes.$inferSelect;
export type InsertProcess = typeof processes.$inferInsert;

// Minutas geradas
export const drafts = mysqlTable("drafts", {
  id: int("id").autoincrement().primaryKey(),
  processId: int("processId").notNull(),
  userId: int("userId").notNull(),
  draftType: mysqlEnum("draftType", ["sentenca", "decisao", "despacho", "acordao"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
  content: text("content").notNull(),
  decisionDate: timestamp("decisionDate"),
  keywords: text("keywords"),
  url: varchar("url", { length: 500 }),
  isFavorite: int("isFavorite").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Jurisprudence = typeof jurisprudence.$inferSelect;
export type InsertJurisprudence = typeof jurisprudence.$inferInsert;

// Configurações do usuário
export const userSettings = mysqlTable("userSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  llmApiKey: text("llmApiKey"),
  llmProvider: varchar("llmProvider", { length: 50 }).default("openai"),
  llmModel: varchar("llmModel", { length: 100 }).default("gpt-4"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// Base de conhecimento - Documentos de referência
export const knowledgeBase = mysqlTable("knowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  fileType: varchar("fileType", { length: 50 }), // pdf, docx, txt
  category: varchar("category", { length: 100 }), // decisoes, teses, referencias
  tags: text("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;