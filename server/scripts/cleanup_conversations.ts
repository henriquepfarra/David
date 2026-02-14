import "dotenv/config";
import { getDb } from "../db";
import { conversations, messages } from "../../drizzle/schema";
import { eq, ne, inArray, sql } from "drizzle-orm";
import { logger } from "../_core/logger";

async function cleanup() {
    const db = await getDb();
    if (!db) {
        console.error("Database connection not available");
        process.exit(1);
    }

    console.log("Iniciando limpeza de conversas...");

    try {
        // 1. Identificar conversas NÃO fixadas
        // isPinned pode ser 0 ou null, então buscamos onde NÃO é 1
        const conversationsToDelete = await db
            .select({ id: conversations.id, title: conversations.title })
            .from(conversations)
            .where(sql`${conversations.isPinned} IS NULL OR ${conversations.isPinned} != 1`);

        const idsUtils = conversationsToDelete.map(c => c.id);
        const count = idsUtils.length;

        console.log(`Encontradas ${count} conversas não fixadas para exclusão.`);

        if (count === 0) {
            console.log("Nenhuma conversa para deletar.");
            return;
        }

        // Processar em lotes para evitar erros de query muito grande se houverem milhares
        const BATCH_SIZE = 100;
        for (let i = 0; i < count; i += BATCH_SIZE) {
            const batchIds = idsUtils.slice(i, i + BATCH_SIZE);

            console.log(`Deletando lote ${Math.floor(i / BATCH_SIZE) + 1} de ${Math.ceil(count / BATCH_SIZE)}... (${batchIds.length} itens)`);

            // Deletar mensagens primeiro (FK constraint, embora schema drizzle as vezes não enforce, é bom)
            await db.delete(messages).where(inArray(messages.conversationId, batchIds));

            // Deletar conversas
            await db.delete(conversations).where(inArray(conversations.id, batchIds));
        }

        console.log("Limpeza concluída com sucesso!");
        console.log(`Total de conversas removidas: ${count}`);

    } catch (error) {
        console.error("Erro durante a limpeza:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

cleanup();
