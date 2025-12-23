export interface ExtractedPage {
    pageNumber: number;
    text: string;
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
