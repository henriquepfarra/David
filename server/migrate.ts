/**
 * Production migration script.
 *
 * Uses drizzle-orm's migrate() to apply SQL migration files sequentially.
 * Unlike `drizzle-kit push`, this:
 *  - Never truncates tables or drops columns
 *  - Applies only the exact SQL you reviewed in the migration files
 *  - Tracks applied migrations in a __drizzle_migrations table
 *  - Is safe for automated CI/CD deploys
 *
 * Handles transition from push -> migrate automatically:
 * If the DB already has tables (from push) but no __drizzle_migrations table,
 * it seeds the tracking table with all existing migration entries so migrate()
 * doesn't try to re-create existing tables.
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

async function seedExistingMigrations(connection: mysql.Connection) {
  const journal = JSON.parse(
    readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf-8")
  ) as { entries: JournalEntry[] };

  if (journal.entries.length === 0) return;

  console.log(
    `[Migration] Seeding ${journal.entries.length} existing migrations into tracking table...`
  );

  for (const entry of journal.entries) {
    // Compute SHA-256 hash of SQL content (same as drizzle-orm's readMigrationFiles)
    const sqlContent = readFileSync(
      `${MIGRATIONS_FOLDER}/${entry.tag}.sql`
    ).toString();
    const hash = createHash("sha256").update(sqlContent).digest("hex");

    await connection.execute(
      "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
      [hash, entry.when]
    );
  }

  console.log(
    "[Migration] Transition complete. Future deploys will only apply new migrations."
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log("[Migration] Connecting to database...");
  const connection = await mysql.createConnection({ uri: url });

  try {
    // === Transition logic: push -> migrate ===
    const [tables] = (await connection.query(
      "SHOW TABLES LIKE '__drizzle_migrations'"
    )) as any[];
    const trackingTableExists = tables.length > 0;

    const [appTables] = (await connection.query(
      "SHOW TABLES LIKE 'users'"
    )) as any[];
    const appTablesExist = appTables.length > 0;

    if (!trackingTableExists && appTablesExist) {
      console.log(
        "[Migration] Detected DB managed by push. Transitioning to migrate..."
      );

      // Create the tracking table (same DDL drizzle-orm uses internally)
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
          id serial PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        )
      `);

      await seedExistingMigrations(connection);
    }

    // === Run migrations ===
    const db = drizzle(connection);
    console.log("[Migration] Applying pending migrations...");
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    console.log("[Migration] All migrations applied successfully.");
  } catch (error) {
    console.error("[Migration] Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
