/**
 * Migration runner - Adds lastActivityAt to processes table
 */
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function runMigration() {
    console.log("[Migration] Starting: Add process activity tracking...");

    const db = await getDb();
    if (!db) {
        throw new Error("Database not available");
    }

    try {
        // Add lastActivityAt column
        console.log("[Migration] Adding lastActivityAt column...");
        await db.execute(sql`
      ALTER TABLE processes 
      ADD COLUMN lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    `);
        console.log("✓ Added lastActivityAt column");
    } catch (error: any) {
        if (error.message?.includes('Duplicate column')) {
            console.log("⚠ Column lastActivityAt already exists, skipping");
        } else {
            console.error("❌ Failed to add column:", error.message);
            throw error;
        }
    }

    try {
        // Create index for faster duplicate detection
        console.log("[Migration] Creating index idx_process_number_user...");
        await db.execute(sql`
      CREATE INDEX idx_process_number_user 
      ON processes(userId, processNumber(50))
    `);
        console.log("✓ Created index idx_process_number_user");
    } catch (error: any) {
        if (error.message?.includes('Duplicate key name')) {
            console.log("⚠ Index idx_process_number_user already exists, skipping");
        } else {
            console.error("❌ Failed to create index:", error.message);
        }
    }

    try {
        // Add index for activity timeline queries
        console.log("[Migration] Creating index idx_process_last_activity...");
        await db.execute(sql`
      CREATE INDEX idx_process_last_activity 
      ON processes(userId, lastActivityAt DESC)
    `);
        console.log("✓ Created index idx_process_last_activity");
    } catch (error: any) {
        if (error.message?.includes('Duplicate key name')) {
            console.log("⚠ Index idx_process_last_activity already exists, skipping");
        } else {
            console.error("❌ Failed to create index:", error.message);
        }
    }

    console.log("[Migration] ✅ Completed successfully!");
}

runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
