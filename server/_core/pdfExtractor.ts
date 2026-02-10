export interface ExtractedPage {
    pageNumber: number;
    text: string;
}

/**
 * Resultado da validação de qualidade da extração
 */
export interface ExtractionQualityResult {
    isValid: boolean;
    confidence: "high" | "medium" | "low";
    reason?: string;
    metrics: {
        totalChars: number;
        totalWords: number;
        avgCharsPerPage: number;
        avgWordsPerPage: number;
        alphabeticRatio: number;
        pageCount: number;
    };
}

/**
 * Thresholds conservadores para validação
 * Na dúvida, preferimos File API (valores baixos = mais exigente)
 */
const QUALITY_THRESHOLDS = {
    // Mínimo de caracteres por página (média)
    MIN_CHARS_PER_PAGE: 50,
    // Mínimo de palavras por página (média)
    MIN_WORDS_PER_PAGE: 8,
    // Mínimo de caracteres alfabéticos no texto (%)
    MIN_ALPHABETIC_RATIO: 0.5,
    // Mínimo de páginas com conteúdo válido (%)
    MIN_VALID_PAGES_RATIO: 0.6,
};

/**
 * Valida a qualidade da extração de texto
 * Usa thresholds conservadores - na dúvida, recomenda File API
 *
 * @param pages Páginas extraídas do PDF
 * @returns Resultado da validação com métricas
 */
export function validateExtractionQuality(pages: ExtractedPage[]): ExtractionQualityResult {
    if (!pages || pages.length === 0) {
        return {
            isValid: false,
            confidence: "low",
            reason: "Nenhuma página extraída",
            metrics: {
                totalChars: 0,
                totalWords: 0,
                avgCharsPerPage: 0,
                avgWordsPerPage: 0,
                alphabeticRatio: 0,
                pageCount: 0,
            },
        };
    }

    // Calcular métricas
    const pageCount = pages.length;
    const allText = pages.map((p) => p.text).join(" ");
    const totalChars = allText.length;
    const totalWords = allText.split(/\s+/).filter((w) => w.length > 0).length;

    // Contar caracteres alfabéticos (incluindo acentuados)
    const alphabeticChars = (allText.match(/[a-záàâãéèêíïóôõöúçñ]/gi) || []).length;
    const alphabeticRatio = totalChars > 0 ? alphabeticChars / totalChars : 0;

    // Médias por página
    const avgCharsPerPage = totalChars / pageCount;
    const avgWordsPerPage = totalWords / pageCount;

    // Contar páginas com conteúdo válido (> 20 chars)
    const validPages = pages.filter((p) => p.text.length > 20).length;
    const validPagesRatio = validPages / pageCount;

    const metrics = {
        totalChars,
        totalWords,
        avgCharsPerPage: Math.round(avgCharsPerPage),
        avgWordsPerPage: Math.round(avgWordsPerPage * 10) / 10,
        alphabeticRatio: Math.round(alphabeticRatio * 100) / 100,
        pageCount,
    };

    // Validar contra thresholds
    const issues: string[] = [];

    if (avgCharsPerPage < QUALITY_THRESHOLDS.MIN_CHARS_PER_PAGE) {
        issues.push(`Poucos caracteres por página (${metrics.avgCharsPerPage} < ${QUALITY_THRESHOLDS.MIN_CHARS_PER_PAGE})`);
    }

    if (avgWordsPerPage < QUALITY_THRESHOLDS.MIN_WORDS_PER_PAGE) {
        issues.push(`Poucas palavras por página (${metrics.avgWordsPerPage} < ${QUALITY_THRESHOLDS.MIN_WORDS_PER_PAGE})`);
    }

    if (alphabeticRatio < QUALITY_THRESHOLDS.MIN_ALPHABETIC_RATIO) {
        issues.push(`Baixo ratio alfabético (${metrics.alphabeticRatio} < ${QUALITY_THRESHOLDS.MIN_ALPHABETIC_RATIO})`);
    }

    if (validPagesRatio < QUALITY_THRESHOLDS.MIN_VALID_PAGES_RATIO) {
        issues.push(`Muitas páginas vazias (${Math.round(validPagesRatio * 100)}% válidas)`);
    }

    // Determinar resultado
    if (issues.length === 0) {
        return {
            isValid: true,
            confidence: "high",
            metrics,
        };
    } else if (issues.length === 1) {
        // Um problema apenas - ainda pode ser válido, mas com confiança média
        return {
            isValid: true,
            confidence: "medium",
            reason: issues[0],
            metrics,
        };
    } else {
        // Múltiplos problemas - não é confiável
        return {
            isValid: false,
            confidence: "low",
            reason: issues.join("; "),
            metrics,
        };
    }
}

/**
 * Extrai texto de PDF com validação de qualidade integrada
 * Retorna informações sobre se a extração é confiável ou precisa de fallback
 */
export async function extractPdfWithQualityCheck(buffer: Buffer): Promise<{
    pages: ExtractedPage[];
    fullText: string;
    quality: ExtractionQualityResult;
}> {
    const pages = await extractPagesFromPdfBuffer(buffer);
    const fullText = pages.map((p) => p.text).join("\n\n");
    const quality = validateExtractionQuality(pages);

    console.log(`[PDFExtractor] Extração local: ${pages.length} páginas, ${quality.metrics.totalChars} chars, qualidade: ${quality.confidence}${quality.reason ? ` (${quality.reason})` : ""}`);

    return { pages, fullText, quality };
}

/**
 * Extrai texto de um buffer PDF (texto corrido)
 * @param buffer Buffer do arquivo PDF
 * @returns Texto extraído de todas as páginas
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    // Import dinâmico para evitar erro no build/startup do servidor
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    let fullText = "";

    // Iterar por todas as páginas
    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n\n";
    }

    return fullText.trim();
}

/**
 * Versão avançada que retorna objeto estruturado por página
 * Ideal para criar chunks atrelados à paginação original (para citação: "fls. 25")
 */
export async function extractPagesFromPdfBuffer(buffer: Buffer): Promise<ExtractedPage[]> {
    try {
        // Import dinâmico para evitar erro no build/startup do servidor
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

        const data = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({
            data,
            useSystemFonts: true,
            disableFontFace: true,
        });

        const pdfDocument = await loadingTask.promise;
        const results: ExtractedPage[] = [];

        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();

            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(" ");

            results.push({
                pageNumber: i,
                text: pageText.replace(/\s+/g, " ").trim(), // Limpeza básica de espaços
            });
        }

        return results;
    } catch (error) {
        console.error("Erro na extração paginada de PDF:", error);
        throw error;
    }
}
