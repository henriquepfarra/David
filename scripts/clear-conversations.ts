/// <reference types="node" />
import "dotenv/config";
import { getDb } from "../server/db.js";
import { conversations, messages } from "../drizzle/schema.js";

async function clearConversations() {
    const db = await getDb();
    if (!db) {
        console.log('❌ No DB connection');
        process.exit(1);
    }

    // Deletar mensagens primeiro (FK)
    await db.delete(messages);
    console.log('✅ Mensagens deletadas');

    // Deletar conversas
    await db.delete(conversations);
    console.log('✅ Conversas deletadas');

    console.log('🧹 Banco limpo!');
}

clearConversations()
    .then(() => process.exit(0))
    .catch(e => {
        console.error('❌ Erro:', e);
        process.exit(1);
    });
