/**
 * Busca por similaridade de texto usando TF-IDF
 * Alternativa simples aos embeddings que não depende de APIs externas
 */

/**
 * Remove stopwords e normaliza texto para busca
 */
export function normalizeText(text: string): string[] {
  const stopwords = new Set([
    "o", "a", "os", "as", "um", "uma", "de", "da", "do", "dos", "das",
    "em", "no", "na", "nos", "nas", "por", "para", "com", "sem", "sob",
    "e", "ou", "mas", "que", "se", "é", "são", "foi", "como", "mais",
    "ao", "aos", "à", "às", "pelo", "pela", "pelos", "pelas"
  ]);

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/g, " ") // Remove pontuação
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word));
}

/**
 * Calcula TF (Term Frequency) - frequência do termo no documento
 */
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

/**
 * Calcula IDF (Inverse Document Frequency) - raridade do termo no corpus
 */
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

/**
 * Calcula similaridade de cosseno entre dois vetores TF-IDF
 */
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

/**
 * Busca documentos similares usando TF-IDF
 */
export function searchSimilarDocuments(
  documents: Array<{ id: number; title: string; content: string; documentType?: string }>,
  query: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    filterTypes?: string[];
  } = {}
): Array<{ id: number; title: string; content: string; similarity: number; documentType?: string }> {
  const { limit = 5, minSimilarity = 0.1, filterTypes } = options;

  // Filtrar por tipo se especificado
  let filteredDocs = documents;
  if (filterTypes && filterTypes.length > 0) {
    filteredDocs = documents.filter(doc =>
      doc.documentType && filterTypes.includes(doc.documentType)
    );
  }

  if (filteredDocs.length === 0) {
    return [];
  }

  // Normalizar query e documentos
  const queryTerms = normalizeText(query);
  const docsWithTerms = filteredDocs.map(doc => ({
    ...doc,
    terms: normalizeText(`${doc.title} ${doc.content}`),
  }));

  // Usar busca por sobreposição de termos (mais simples e eficaz para poucos documentos)
  const queryTermSet = new Set(queryTerms);

  // Calcular similaridade para cada documento
  const results = docsWithTerms.map(doc => {
    const docTermSet = new Set(doc.terms);

    // === BOOST PARA CORRESPONDÊNCIA EXATA NO TÍTULO ===
    // Se a query contém um número (ex: "Súmula 100") e o título contém esse número, dar boost
    const queryLower = query.toLowerCase();
    const titleLower = doc.title.toLowerCase();

    // Extrair números da query (ex: "100" de "Súmula 100 do STJ")
    const queryNumbers = query.match(/\d+/g) || [];
    let titleBoost = 0;

    for (const num of queryNumbers) {
      // Se o título contém exatamente esse número (ex: "Súmula 100 do STJ" contém "100")
      if (titleLower.includes(`súmula ${num}`) || titleLower.includes(`sumula ${num}`)) {
        titleBoost = 10; // Boost alto para correspondência exata
        break;
      }
    }

    // Também verificar se a query está contida no título (busca substring)
    if (titleBoost === 0 && titleLower.includes(queryLower.replace(/\s+/g, ' ').trim())) {
      titleBoost = 5;
    }
    // === FIM DO BOOST ===

    // Contar quantos termos da query aparecem no documento
    let matchCount = 0;
    let weightedScore = 0;

    for (const queryTerm of queryTerms) {
      if (docTermSet.has(queryTerm)) {
        matchCount++;
        // Peso inversamente proporcional à frequência no documento
        const termFreq = doc.terms.filter(t => t === queryTerm).length;
        weightedScore += 1 / Math.log(termFreq + 2); // +2 para evitar log(1) = 0
      }
    }

    // Similaridade = (termos encontrados / total de termos da query) * peso
    // Normalizado pelo tamanho do documento para favorecer documentos menores e mais relevantes
    let similarity = queryTerms.length > 0
      ? (matchCount / queryTerms.length) * (weightedScore / queryTerms.length)
      : 0;

    // Aplicar boost de título (adiciona ao score base)
    similarity += titleBoost;

    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      documentType: doc.documentType,
      similarity,
    };
  });

  // Filtrar, ordenar e limitar resultados
  return results
    .filter(r => r.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
