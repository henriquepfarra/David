import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function checkDb() {
    try {
        const db = await getDb();
        if (!db) throw new Error("Database not initialized (check DATABASE_URL)");

        // Teste simples
        // @ts-ignore
        await db.execute(sql`SELECT 1`);
        console.log("✅ Conexão com banco de dados OK!");
        console.log("✅ Conexão com banco de dados OK!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Falha na conexão:", e);
        process.exit(1);
    }
}

checkDb();
