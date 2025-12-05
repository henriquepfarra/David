import { drizzle } from "drizzle-orm/mysql2";
import { knowledgeBase } from "../drizzle/schema";
import { searchSimilarDocuments } from "../server/_core/textSearch";

const db = drizzle(process.env.DATABASE_URL!);

async function testSearch() {
  console.log("🔍 Testando busca por similaridade...\n");

  // Buscar todos os documentos
  const allDocs = await db.select().from(knowledgeBase);
  console.log(`📄 Total de documentos: ${allDocs.length}\n`);

  // Teste 1: Busca sobre "dano moral negativação"
  const query1 = "dano moral por negativação indevida";
  console.log(`Query 1: "${query1}"`);
  
  const results1 = searchSimilarDocuments(
    allDocs.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      documentType: doc.documentType || undefined,
    })),
    query1,
    {
      limit: 5,
      minSimilarity: 0.1, // Threshold mais baixo para teste
    }
  );

  console.log(`\n✅ Encontrados ${results1.length} documentos:\n`);
  results1.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.title}`);
    console.log(`   Similaridade: ${(doc.similarity * 100).toFixed(2)}%`);
    console.log(`   Tipo: ${doc.documentType || "N/A"}`);
    console.log(`   Preview: ${doc.content.substring(0, 150)}...\n`);
  });

  // Teste 2: Busca sobre "tutela urgência"
  const query2 = "tutela de urgência liminar";
  console.log(`\n\nQuery 2: "${query2}"`);
  
  const results2 = searchSimilarDocuments(
    allDocs.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      documentType: doc.documentType || undefined,
    })),
    query2,
    {
      limit: 5,
      minSimilarity: 0.1,
    }
  );

  console.log(`\n✅ Encontrados ${results2.length} documentos:\n`);
  results2.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.title}`);
    console.log(`   Similaridade: ${(doc.similarity * 100).toFixed(2)}%`);
    console.log(`   Tipo: ${doc.documentType || "N/A"}\n`);
  });

  process.exit(0);
}

testSearch().catch((error) => {
  console.error("❌ Erro:", error);
  process.exit(1);
});
