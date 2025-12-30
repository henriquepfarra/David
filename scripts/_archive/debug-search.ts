import { drizzle } from "drizzle-orm/mysql2";
import { knowledgeBase } from "../drizzle/schema";
import { normalizeText } from "../server/_core/textSearch";

const db = drizzle(process.env.DATABASE_URL!);

async function debugSearch() {
  console.log("🔍 Debug da busca por similaridade...\n");

  // Buscar todos os documentos
  const allDocs = await db.select().from(knowledgeBase);
  console.log(`📄 Total de documentos: ${allDocs.length}\n`);

  // Mostrar os primeiros 2 documentos
  allDocs.slice(0, 2).forEach((doc, index) => {
    console.log(`\n--- Documento ${index + 1} ---`);
    console.log(`Título: ${doc.title}`);
    console.log(`Tipo: ${doc.documentType || "N/A"}`);
    console.log(`Tamanho: ${doc.content.length} caracteres`);
    console.log(`Preview: ${doc.content.substring(0, 200)}...`);
    
    // Normalizar e mostrar termos
    const normalized = normalizeText(doc.content);
    console.log(`\nTermos normalizados (primeiros 20): ${normalized.slice(0, 20).join(", ")}`);
    console.log(`Total de termos: ${normalized.length}`);
  });

  // Testar normalização da query
  const query = "dano moral por negativação indevida";
  console.log(`\n\n--- Query de Teste ---`);
  console.log(`Original: "${query}"`);
  const queryTerms = normalizeText(query);
  console.log(`Termos normalizados: ${queryTerms.join(", ")}`);
  console.log(`Total de termos: ${queryTerms.length}`);

  process.exit(0);
}

debugSearch().catch((error) => {
  console.error("❌ Erro:", error);
  process.exit(1);
});
