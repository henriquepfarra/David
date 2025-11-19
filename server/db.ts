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
  await db.insert(userSettings).values({ userId, ...data }).onDuplicateKeyUpdate({ set: data });
}
