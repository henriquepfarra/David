/**
 * Script para converter o PDF de Súmulas STJ em JSON
 * e popular a base de conhecimento
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface SumulaEntry {
    id: string;
    titulo: string;
    conteudo: string;
    tipo: "sumula";
    tags: string[];
}

// Ler o arquivo de texto extraído do PDF
const txtPath = "/tmp/sumulas_stj.txt";
const content = readFileSync(txtPath, "utf-8");

// Regex para extrair cada súmula
// Formato: ● SÚMULA XXX ... texto até a próxima súmula
const sumulaRegex = /● SÚMULA (\d+)\s*\n*\s*VEJA MAIS\s*\n*([\s\S]*?)(?=● SÚMULA \d+|scon\.stj\.jus\.br|$)/gi;

const sumulas: SumulaEntry[] = [];
let match;

while ((match = sumulaRegex.exec(content)) !== null) {
    const numero = match[1];
    let texto = match[2]
        .replace(/scon\.stj\.jus\.br\/SCON\/sumstj\/\s*\d+/g, "") // Remove rodapé
        .replace(/\n{2,}/g, "\n") // Remove múltiplas quebras de linha
        .trim();

    // Remover informações de sessão/julgamento se ficarem muito longas
    // Manter apenas o conteúdo principal

    if (texto.length > 0) { // Incluir TODAS as súmulas, sem filtro
        // Gerar tags a partir de palavras-chave do texto
        const palavrasComuns = ["o", "a", "de", "da", "do", "em", "que", "para", "com", "não", "é", "se", "os", "as", "no", "na", "por", "ao", "ou"];
        const palavras = texto.toLowerCase()
            .replace(/[^\w\sáéíóúâêîôûãõç]/g, " ")
            .split(/\s+/)
            .filter(p => p.length > 3 && !palavrasComuns.includes(p))
            .slice(0, 8);

        sumulas.push({
            id: `SUMULA_STJ_${numero}`,
            titulo: `Súmula ${numero} do STJ`,
            conteudo: texto,
            tipo: "sumula",
            tags: [...new Set(palavras)]
        });
    }
}

// Ordenar por número
sumulas.sort((a, b) => {
    const numA = parseInt(a.id.replace("SUMULA_STJ_", ""));
    const numB = parseInt(b.id.replace("SUMULA_STJ_", ""));
    return numA - numB;
});

console.log(`\n📊 Estatísticas da conversão:`);
console.log(`   Total de súmulas convertidas: ${sumulas.length}`);
console.log(`   Primeira: ${sumulas[0]?.titulo}`);
console.log(`   Última: ${sumulas[sumulas.length - 1]?.titulo}`);

// Salvar no arquivo JSON
const outputPath = resolve("server", "data", "system_knowledge.json");
writeFileSync(outputPath, JSON.stringify(sumulas, null, 2), "utf-8");

console.log(`\n✅ Arquivo salvo em: ${outputPath}`);
console.log(`\n🚀 Agora rode: pnpm run seed:knowledge`);
