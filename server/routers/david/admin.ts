import { protectedProcedure, router } from "../../_core/trpc";

export const davidAdminRouter = router({
  // 🔧 ADMIN: Rodar migration (TEMPORÁRIO - remover após uso)
  runMigration: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Apenas admin
      if (ctx.user.role !== 'admin') {
        throw new Error("Apenas admins podem rodar migrations");
      }

      const { getDb } = await import("../../db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = [];

      try {
        // 1. Add lastActivityAt column
        await db.execute(sql`
          ALTER TABLE processes
          ADD COLUMN lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          AFTER updatedAt
        `);
        results.push("✓ Added lastActivityAt column");
      } catch (error: any) {
        if (error.message?.includes('Duplicate column')) {
          results.push("⚠ Column lastActivityAt already exists");
        } else {
          results.push(`❌ Failed to add column: ${error.message}`);
          throw error;
        }
      }

      try {
        // 2. Create index for duplicate detection
        await db.execute(sql`
          CREATE INDEX idx_process_number_user
          ON processes(userId, processNumber(50))
        `);
        results.push("✓ Created index idx_process_number_user");
      } catch (error: any) {
        if (error.message?.includes('Duplicate key name')) {
          results.push("⚠ Index idx_process_number_user already exists");
        } else {
          results.push(`⚠ Index creation skipped: ${error.message}`);
        }
      }

      try {
        // 3. Create index for activity timeline
        await db.execute(sql`
          CREATE INDEX idx_process_last_activity
          ON processes(userId, lastActivityAt DESC)
        `);
        results.push("✓ Created index idx_process_last_activity");
      } catch (error: any) {
        if (error.message?.includes('Duplicate key name')) {
          results.push("⚠ Index idx_process_last_activity already exists");
        } else {
          results.push(`⚠ Index creation skipped: ${error.message}`);
        }
      }

      return { success: true, results };
    }),
});
