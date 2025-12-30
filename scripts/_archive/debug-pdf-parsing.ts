
import fs from 'fs';
import path from 'path';
// Use dynamic import or require logic if needed, but here we try explicit path import for Node
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
    const filePath = path.join(process.cwd(), 'processos teste', '40079352520258260009.pdf');

    console.log(`[TEST] Buscando arquivo: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`[ERROR] Arquivo não encontrado!`);
        return;
    }

    const stats = fs.statSync(filePath);
    console.log(`[TEST] Tamanho do arquivo: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    const dataBuffer = fs.readFileSync(filePath);
    const data = new Uint8Array(dataBuffer);

    try {
        console.log(`[TEST] Carregando PDF (Legacy Build)...`);
        const loadingTask = pdfjsLib.getDocument({
            data: data,
            isEvalSupported: false,
            useWorkerFetch: false,
            isOffscreenCanvasSupported: false
        });

        const doc = await loadingTask.promise;
        console.log(`[TEST] Sucesso! PDF carregado.`);
        console.log(`[TEST] Número de páginas: ${doc.numPages}`);

        console.log(`[TEST] Extraindo texto das primeiras 5 páginas...`);

        for (let i = 1; i <= Math.min(doc.numPages, 5); i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map((item: any) => item.str).join(' ');
            console.log(`\n--- PÁGINA ${i} ---`);
            console.log(text.substring(0, 200) + "...");
            console.log(`(Caracteres: ${text.length})`);
        }

    } catch (err: any) {
        console.error(`[ERROR] Falha ao processar PDF:`, err);
    }
}

main();
