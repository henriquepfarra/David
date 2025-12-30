import { getDb } from "../server/db";
import { processes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkProcessId() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  const process = await db.select().from(processes).where(
    eq(processes.processNumber, "4005530-16.2025.8.26.0009")
  );
  
  if (process.length > 0) {
    console.log(`\n✅ Processo encontrado:`);
    console.log(`   ID: ${process[0].id}`);
    console.log(`   Número: ${process[0].processNumber}`);
    console.log(`   Autor: ${process[0].plaintiff}`);
    console.log(`   Réu: ${process[0].defendant}\n`);
  } else {
    console.log("\n❌ Processo não encontrado\n");
  }
}

checkProcessId().catch(console.error);
