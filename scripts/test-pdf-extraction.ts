/**
 * Script de Teste: Comparação de Modelos para Extração de PDF
 * 
 * Testa a qualidade de extração com diferentes modelos Gemini
 * para validar se o modelo atual (flash-lite) é suficiente.
 */

import "dotenv/config";
import { readPdfWithVision } from "../server/_core/fileApi";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DIR = path.join(__dirname, "../arquivos teste");

// Modelos a testar
const MODELS = [
    { id: "gemini-2.0-flash-lite", cost: "$0.075/1M", name: "Flash Lite (atual)" },
    { id: "gemini-2.0-flash", cost: "$0.10/1M", name: "Flash" },
    { id: "gemini-2.5-flash", cost: "$0.30/1M", name: "Flash 2.5" },
];

// PDFs de teste - Processos reais
const TEST_FILES = [
    "40074606920258260009_79c4a2bf7687d5f89ecbc8a67a060565.pdf",
    "40079352520258260009.pdf",
];

async function runTest() {
    console.log("=".repeat(80));
    console.log("TESTE DE EXTRAÇÃO DE PDF - COMPARAÇÃO DE MODELOS");
    console.log("=".repeat(80));
    console.log();

    const results: any[] = [];

    for (const file of TEST_FILES) {
        const filePath = path.join(TEST_DIR, file);

        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Arquivo não encontrado: ${file}`);
            continue;
        }

        const fileSize = (fs.statSync(filePath).size / 1024).toFixed(0);
        console.log(`\n📄 Testando: ${file} (${fileSize} KB)`);
        console.log("-".repeat(60));

        for (const model of MODELS) {
            console.log(`\n  🔹 Modelo: ${model.name} (${model.cost})`);

            try {
                const startTime = Date.now();

                const result = await readPdfWithVision(filePath, {
                    model: model.id,
                    deleteAfterRead: true,
                });

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

                console.log(`     ✅ Tempo: ${elapsed}s`);
                console.log(`     📝 Caracteres extraídos: ${result.content.length}`);
                console.log(`     🎯 Tokens usados: ${result.tokensUsed || "N/A"}`);

                // Preview do conteúdo (primeiras 200 chars)
                const preview = result.content.substring(0, 200).replace(/\n/g, " ");
                console.log(`     📖 Preview: "${preview}..."`);

                results.push({
                    file,
                    model: model.id,
                    modelName: model.name,
                    cost: model.cost,
                    timeSeconds: parseFloat(elapsed),
                    charactersExtracted: result.content.length,
                    tokensUsed: result.tokensUsed,
                    success: true,
                });

            } catch (error: any) {
                console.log(`     ❌ Erro: ${error.message}`);
                results.push({
                    file,
                    model: model.id,
                    modelName: model.name,
                    error: error.message,
                    success: false,
                });
            }
        }
    }

    // Resumo final
    console.log("\n\n" + "=".repeat(80));
    console.log("RESUMO DOS RESULTADOS");
    console.log("=".repeat(80));

    const successResults = results.filter(r => r.success);

    // Agrupar por modelo
    for (const model of MODELS) {
        const modelResults = successResults.filter(r => r.model === model.id);
        if (modelResults.length === 0) continue;

        const avgTime = modelResults.reduce((a, b) => a + b.timeSeconds, 0) / modelResults.length;
        const avgChars = modelResults.reduce((a, b) => a + b.charactersExtracted, 0) / modelResults.length;

        console.log(`\n${model.name} (${model.cost}):`);
        console.log(`  Tempo médio: ${avgTime.toFixed(1)}s`);
        console.log(`  Caracteres médio: ${avgChars.toFixed(0)}`);
        console.log(`  Sucesso: ${modelResults.length}/${TEST_FILES.length}`);
    }

    // Salvar resultados em JSON
    const outputPath = path.join(__dirname, "pdf-test-results.json");
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n\n📊 Resultados salvos em: ${outputPath}`);
}

runTest().catch(console.error);
