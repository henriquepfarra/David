
import "dotenv/config";
import { getDb } from "../server/db.js";
import { knowledgeBase } from "../drizzle/schema.js";
import { eq, count } from "drizzle-orm";

async function verify() {
    const db = await getDb();

    if (!db) {
        throw new Error("Não foi possível conectar ao banco de dados.");
    }

    console.log("🔍 Verificando banco de dados...");

    const totalDocs = await db.select({ value: count() }).from(knowledgeBase);
    const sumulasDocs = await db.select({ value: count() }).from(knowledgeBase).where(eq(knowledgeBase.documentType, 'sumula'));

    console.log(`📊 Total de documentos: ${totalDocs[0].value}`);
    console.log(`⚖️ Total de Súmulas: ${sumulasDocs[0].value}`);

    process.exit(0);
}

verify().catch(console.error);
