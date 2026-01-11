/**
 * Test Setup Helpers
 * Helpers para configurar ambiente de testes E2E
 */

import { sql } from "drizzle-orm";
import { getDb } from "../../db";

export interface TestUser {
  id: number;
  email: string;
  name: string;
}

export interface TestConversation {
  id: number;
  userId: number;
  title: string;
  processId?: number;
}

/**
 * Cria um usuário de teste no banco de dados
 */
export async function createTestUser(): Promise<TestUser> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const email = `test-${Date.now()}@example.com`;
  const name = `Test User ${Date.now()}`;

  const result = await db.execute(
    sql`INSERT INTO users (email, name) VALUES (${email}, ${name})`
  );

  const insertId = Number((result as any).insertId);

  return {
    id: insertId,
    email,
    name,
  };
}

/**
 * Cria uma conversa de teste
 */
export async function createTestConversation(
  userId: number,
  title: string = "Test Conversation"
): Promise<TestConversation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.execute(
    sql`INSERT INTO conversations (userId, title) VALUES (${userId}, ${title})`
  );

  const insertId = Number((result as any).insertId);

  return {
    id: insertId,
    userId,
    title,
  };
}

/**
 * Limpa dados de teste do banco de dados
 */
export async function cleanupTestData(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Deletar na ordem correta (respeitando foreign keys)
  await db.execute(sql`DELETE FROM messages WHERE conversationId IN (SELECT id FROM conversations WHERE userId = ${userId})`);
  await db.execute(sql`DELETE FROM conversations WHERE userId = ${userId}`);
  await db.execute(sql`DELETE FROM userSettings WHERE userId = ${userId}`);
  await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
}

/**
 * Espera por N milissegundos (útil para testes de timing)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cria um mock de contexto tRPC com usuário autenticado
 */
export function createMockContext(user: TestUser) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}
