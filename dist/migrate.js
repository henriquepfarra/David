// server/migrate.ts
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { createHash } from "crypto";
var MIGRATIONS_FOLDER = "./drizzle";
function readJournal() {
  const raw = readFileSync(
    `${MIGRATIONS_FOLDER}/meta/_journal.json`,
    "utf-8"
  );
  return JSON.parse(raw).entries;
}
function computeHash(tag) {
  const sql = readFileSync(`${MIGRATIONS_FOLDER}/${tag}.sql`).toString();
  return createHash("sha256").update(sql).digest("hex");
}
async function ensureMigrationsSeeded(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  const [rows] = await connection.query(
    "SELECT COUNT(*) as cnt FROM `__drizzle_migrations`"
  );
  const count = Number(rows[0].cnt);
  const [appTables] = await connection.query(
    "SHOW TABLES LIKE 'users'"
  );
  const appTablesExist = appTables.length > 0;
  console.log(
    `[Migration] Tracking records: ${count}, App tables exist: ${appTablesExist}`
  );
  if (count === 0 && appTablesExist) {
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
    await ensureMigrationsSeeded(connection);
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
