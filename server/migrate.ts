/**
 * Production migration script.
 *
 * Uses drizzle-orm's migrate() to apply SQL migration files.
 * Handles transition from drizzle-kit push automatically.
 */
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const MIGRATIONS_FOLDER = "./drizzle";

interface JournalEntry {
  tag: string;
  when: number;
}

function readJournal(): JournalEntry[] {
  const raw = readFileSync(
    `${MIGRATIONS_FOLDER}/meta/_journal.json`,
    "utf-8"
  );
  return JSON.parse(raw).entries;
}

function computeHash(tag: string): string {
  const sql = readFileSync(`${MIGRATIONS_FOLDER}/${tag}.sql`).toString();
  return createHash("sha256").update(sql).digest("hex");
}

async function ensureMigrationsSeeded(connection: mysql.Connection) {
  // Create tracking table if it doesn't exist
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  // Check how many records exist
  const [rows] = (await connection.query(
    "SELECT COUNT(*) as cnt FROM `__drizzle_migrations`"
  )) as any[];
  const count = rows[0].cnt;

  // Check if app tables exist (DB was managed by push)
  const [appTables] = (await connection.query(
    "SHOW TABLES LIKE 'users'"
  )) as any[];
  const appTablesExist = appTables.length > 0;

  if (count === 0 && appTablesExist) {
    // Transition from push: seed all existing migrations as applied
    const entries = readJournal();
    console.log(
      `[Migration] Transitioning from push -> migrate. Seeding ${entries.length} records...`
    );

    for (const entry of entries) {
      const hash = computeHash(entry.tag);
      await connection.execute(
        "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
        [hash, entry.when]
      );
    }

    console.log("[Migration] Transition seeding complete.");
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log("[Migration] Connecting to database...");
  const connection = await mysql.createConnection({ uri: url });

  try {
    // Always ensure tracking table exists and is seeded for push->migrate transition
    await ensureMigrationsSeeded(connection);

    // Run pending migrations
    const db = drizzle(connection);
    console.log("[Migration] Applying pending migrations...");
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    console.log("[Migration] Done.");
  } catch (error) {
    console.error("[Migration] Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
