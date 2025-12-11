import { getDb } from "../server/db";
import { conversations } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function checkConversations() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, 1))
    .orderBy(desc(conversations.createdAt))
    .limit(5);
  
  console.log(`\n💬 Últimas 5 conversas:\n`);
  convs.forEach((conv, idx) => {
    console.log(`${idx + 1}. ID: ${conv.id}`);
    console.log(`   Título: ${conv.title}`);
    console.log(`   Process ID: ${conv.processId || "NENHUM"}`);
    console.log(`   Criado em: ${conv.createdAt}\n`);
  });
}

checkConversations().catch(console.error);
