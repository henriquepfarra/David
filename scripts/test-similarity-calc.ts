import { drizzle } from "drizzle-orm/mysql2";
import { knowledgeBase } from "../drizzle/schema";
import { normalizeText } from "../server/_core/textSearch";

const db = drizzle(process.env.DATABASE_URL!);

// Copiar funções internas para teste
function calculateTF(terms: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const totalTerms = terms.length;

  for (const term of terms) {
    tf.set(term, (tf.get(term) || 0) + 1);
  }

  // Normalizar pela quantidade total de termos
  for (const [term, count] of Array.from(tf.entries())) {
    tf.set(term, count / totalTerms);
  }

  return tf;
}

function calculateIDF(
  documents: Array<{ id: number; terms: string[] }>
): Map<string, number> {
  const idf = new Map<string, number>();
  const totalDocs = documents.length;

  // Contar em quantos documentos cada termo aparece
  const docFrequency = new Map<string, number>();
  for (const doc of documents) {
    const uniqueTerms = new Set(doc.terms);
    for (const term of Array.from(uniqueTerms)) {
      docFrequency.set(term, (docFrequency.get(term) || 0) + 1);
    }
  }

  // Calcular IDF
  for (const [term, docCount] of Array.from(docFrequency.entries())) {
    idf.set(term, Math.log(totalDocs / docCount));
  }

  return idf;
}

function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  // Calcular produto escalar e normas
  for (const [term, value1] of Array.from(vec1.entries())) {
    const value2 = vec2.get(term) || 0;
    dotProduct += value1 * value2;
    norm1 += value1 * value1;
  }

  for (const value of Array.from(vec2.values())) {
    norm2 += value * value;
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

async function testSimilarity() {
  console.log("🧪 Teste detalhado de similaridade\n");

  const allDocs = await db.select().from(knowledgeBase);
  const doc = allDocs[0]; // Primeiro documento (Enunciados FONAJE)

  const query = "dano moral por negativação indevida";
  const queryTerms = normalizeText(query);
  const docTerms = normalizeText(`${doc.title} ${doc.content}`);

  console.log(`Query: "${query}"`);
  console.log(`Termos da query: ${queryTerms.join(", ")}\n`);

  console.log(`Documento: "${doc.title}"`);
  console.log(`Total de termos no documento: ${docTerms.length}`);
  
  // Verificar se os termos da query aparecem no documento
  console.log(`\n--- Termos da query no documento ---`);
  queryTerms.forEach(term => {
    const count = docTerms.filter(t => t === term).length;
    console.log(`"${term}": ${count} ocorrências`);
  });

  // Calcular IDF (apenas documentos)
  const idf = calculateIDF([
    { id: doc.id, terms: docTerms },
  ]);

  console.log(`\n--- IDF dos termos da query ---`);
  queryTerms.forEach(term => {
    console.log(`"${term}": ${idf.get(term)?.toFixed(4) || "0"}`);
  });

  // Calcular TF-IDF
  const queryTF = calculateTF(queryTerms);
  const queryTFIDF = new Map<string, number>();
  for (const [term, tf] of Array.from(queryTF.entries())) {
    const idfValue = idf.get(term) || 0;
    queryTFIDF.set(term, tf * idfValue);
  }

  const docTF = calculateTF(docTerms);
  const docTFIDF = new Map<string, number>();
  for (const [term, tf] of Array.from(docTF.entries())) {
    const idfValue = idf.get(term) || 0;
    docTFIDF.set(term, tf * idfValue);
  }

  console.log(`\n--- TF-IDF da query ---`);
  queryTerms.forEach(term => {
    console.log(`"${term}": ${queryTFIDF.get(term)?.toFixed(6) || "0"}`);
  });

  console.log(`\n--- TF-IDF do documento (termos da query) ---`);
  queryTerms.forEach(term => {
    console.log(`"${term}": ${docTFIDF.get(term)?.toFixed(6) || "0"}`);
  });

  // Calcular similaridade
  const similarity = cosineSimilarity(queryTFIDF, docTFIDF);
  console.log(`\n🎯 Similaridade final: ${(similarity * 100).toFixed(4)}%`);

  process.exit(0);
}

testSimilarity().catch((error) => {
  console.error("❌ Erro:", error);
  process.exit(1);
});
