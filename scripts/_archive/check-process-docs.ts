import { getDb } from "../server/db";
import { processDocuments } from "../drizzle/schema";

async function checkProcessDocs() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  const docs = await db.select().from(processDocuments);
  
  console.log(`\n📄 Total de documentos: ${docs.length}\n`);
  
  docs.forEach((doc, idx) => {
    console.log(`${idx + 1}. ${doc.title}`);
    console.log(`   Processo ID: ${doc.processId}`);
    console.log(`   Tipo: ${doc.documentType}`);
    console.log(`   Tamanho do conteúdo: ${doc.content.length} caracteres`);
    console.log(`   Preview: ${doc.content.substring(0, 100)}...`);
    console.log("");
  });
}

checkProcessDocs().catch(console.error);
