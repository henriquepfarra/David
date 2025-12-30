import { getDb } from "../server/db";
import { processDocuments, users } from "../drizzle/schema";

async function checkDocUserId() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  const docs = await db.select().from(processDocuments);
  const allUsers = await db.select().from(users);
  
  console.log(`\n👥 Usuários cadastrados:`);
  allUsers.forEach(u => {
    console.log(`   ID: ${u.id}, Nome: ${u.name}, OpenID: ${u.openId}`);
  });
  
  console.log(`\n📄 Documentos:`);
  docs.forEach(doc => {
    console.log(`   Título: ${doc.title}`);
    console.log(`   User ID: ${doc.userId}`);
    console.log(`   Process ID: ${doc.processId}\n`);
  });
}

checkDocUserId().catch(console.error);
