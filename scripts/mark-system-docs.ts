import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { knowledgeBase } from "../drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL!);

async function markSystemDocs() {
  console.log("🔄 Marcando documentos existentes como 'sistema'...");

  const systemDocTitles = [
    "Enunciados FONAJE",
    "Enunciados FOJESP",
    "Decisões 2025",
    "Minutas Modelo",
    "Teses e Diretrizes DAVID",
  ];

  for (const title of systemDocTitles) {
    const result = await db
      .update(knowledgeBase)
      .set({ source: "sistema" })
      .where(eq(knowledgeBase.title, title));

    console.log(`✅ ${title} marcado como sistema`);
  }

  console.log("\n✅ Todos os documentos do sistema foram marcados!");
}

markSystemDocs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  });
