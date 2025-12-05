import { drizzle } from "drizzle-orm/mysql2";
import { knowledgeBase } from "../drizzle/schema";
import { generateEmbedding } from "../server/_core/embeddings";
import { eq } from "drizzle-orm";

// Conectar ao banco
const db = drizzle(process.env.DATABASE_URL!);

async function generateAllEmbeddings() {
  console.log("🚀 Iniciando geração de embeddings...\n");

  // Buscar todos os documentos sem embedding (NULL ou vazio)
  const documents = await db
    .select()
    .from(knowledgeBase);

  console.log(`📄 Encontrados ${documents.length} documentos sem embedding\n`);

  let processed = 0;
  let errors = 0;

  for (const doc of documents) {
    // Pular se já tem embedding
    if (doc.embedding) {
      console.log(`[${processed + 1}/${documents.length}] Pulando (já tem embedding): ${doc.title}\n`);
      processed++;
      continue;
    }

    try {
      console.log(`[${processed + 1}/${documents.length}] Processando: ${doc.title}`);

      // Gerar embedding do conteúdo (limitado a primeiros 8000 caracteres para não estourar limite)
      const textToEmbed = doc.content.substring(0, 8000);
      const embedding = await generateEmbedding(textToEmbed);

      // Salvar embedding no banco
      await db
        .update(knowledgeBase)
        .set({ embedding: JSON.stringify(embedding) })
        .where(eq(knowledgeBase.id, doc.id));

      console.log(`   ✓ Embedding gerado (${embedding.length} dimensões)\n`);
      processed++;

      // Pequeno delay para não sobrecarregar a API
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`   ✗ Erro: ${error.message}\n`);
      errors++;
    }
  }

  console.log("✅ Geração concluída!");
  console.log(`   Processados: ${processed}`);
  console.log(`   Erros: ${errors}`);

  process.exit(0);
}

generateAllEmbeddings().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
