import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Extrai texto de um buffer PDF
 * @param buffer Buffer do arquivo PDF
 * @returns Texto extraído de todas as páginas
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    // Converter buffer para Uint8Array que a lib espera
    const data = new Uint8Array(buffer);

    // Carregar documento
    // Nota: Em ambiente Node, algumas funcionalidades de fontes podem ser limitadas
    // sem configuração extra de standard fonts, mas para extração de texto básico costuma funcionar.
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

        // Concatenar itens de texto da página
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");

        fullText += pageText + "\n\n";
    }

    return fullText.trim();
}
