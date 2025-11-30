import { drizzle } from "drizzle-orm/mysql2";
import { knowledgeBase } from "../drizzle/schema";
import * as fs from "fs";
import * as mammoth from "mammoth";

// Conectar ao banco
const db = drizzle(process.env.DATABASE_URL!);

// Arquivos a processar
const files = [
  {
    path: "/home/ubuntu/upload/ENUNCIADOSFONAJE.docx",
    title: "Enunciados FONAJE - Fórum Nacional de Juizados Especiais",
    documentType: "enunciado" as const,
    category: "enunciados",
    tags: "FONAJE, enunciados, juizados especiais"
  },
  {
    path: "/home/ubuntu/upload/ENUNCIADOSFOJESP.docx",
    title: "Enunciados FOJESP - Fórum Permanente de Juízes Coordenadores dos Juizados Especiais Cíveis e Criminais do Estado de São Paulo",
    documentType: "enunciado" as const,
    category: "enunciados",
    tags: "FOJESP, enunciados, juizados especiais, São Paulo"
  },
  {
    path: "/home/ubuntu/upload/DECISÕES2025-NOVA.docx",
    title: "Decisões 2025 - Referências",
    documentType: "decisao_referencia" as const,
    category: "decisoes",
    tags: "decisões, 2025, referência, minutas"
  },
  {
    path: "/home/ubuntu/upload/Minutas.docx",
    title: "Minutas Modelo - Referências Antigas",
    documentType: "minuta_modelo" as const,
    category: "minutas",
    tags: "minutas, modelos, referência"
  },
  {
    path: "/home/ubuntu/upload/TeseseDiretrizes-David.docx",
    title: "Teses e Diretrizes - DAVID",
    documentType: "tese" as const,
    category: "teses",
    tags: "teses, diretrizes, DAVID, orientações"
  }
];

async function extractTextFromDocx(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function loadKnowledgeBase() {
  console.log("🚀 Iniciando carga da Base de Conhecimento...\n");

  // Usar userId = 1 (assumindo que é o owner)
  const userId = 1;

  for (const file of files) {
    try {
      console.log(`📄 Processando: ${file.title}`);
      
      // Extrair texto do DOCX
      const content = await extractTextFromDocx(file.path);
      
      console.log(`   ✓ Texto extraído: ${content.length} caracteres`);
      
      // Inserir no banco
      await db.insert(knowledgeBase).values({
        userId,
        title: file.title,
        content,
        fileType: "docx",
        documentType: file.documentType,
        category: file.category,
        tags: file.tags,
      });
      
      console.log(`   ✓ Carregado na Base de Conhecimento\n`);
      
    } catch (error: any) {
      console.error(`   ✗ Erro ao processar ${file.title}:`, error.message);
    }
  }

  console.log("✅ Carga concluída!");
  process.exit(0);
}

loadKnowledgeBase().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
