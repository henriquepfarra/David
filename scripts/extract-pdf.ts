/// <reference types="node" />
/**
 * Extrator Inteligente de Súmulas do STJ
 * 
 * Lê o PDF oficial (VerbetesSTJ.pdf) e gera JSON limpo
 * com tagueador automático por categoria jurídica.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// Caminhos
const PDF_PATH = path.join(process.cwd(), 'VerbetesSTJ.pdf');
const OUTPUT_PATH = path.join(process.cwd(), 'server', 'data', 'system_knowledge.json');

// Categorizador automático para gerar Tags sem usar LLM
function generateTags(text: string): string[] {
    const t = text.toLowerCase();
    const tags = new Set<string>();

    tags.add("stj");
    tags.add("sumula");

    if (t.includes("consumidor") || t.includes("cdc")) tags.add("consumidor");
    if (t.includes("dano moral") || t.includes("danos morais")) tags.add("dano moral");
    if (t.includes("banco") || t.includes("financeira") || t.includes("cheque") || t.includes("crédito")) tags.add("bancario");
    if (t.includes("juros") || t.includes("mora")) tags.add("juros");
    if (t.includes("plano de saúde") || t.includes("seguro")) tags.add("plano de saude");
    if (t.includes("veículo") || t.includes("trânsito") || t.includes("transito")) tags.add("transito");
    if (t.includes("imóvel") || t.includes("aluguel") || t.includes("condomínio") || t.includes("locação")) tags.add("imobiliario");
    if (t.includes("crime") || t.includes("pena") || t.includes("penal") || t.includes("prisão")) tags.add("penal");
    if (t.includes("tribut") || t.includes("imposto") || t.includes("fisco") || t.includes("icms")) tags.add("tributario");
    if (t.includes("previdenc") || t.includes("inss") || t.includes("aposentad")) tags.add("previdenciario");
    if (t.includes("processual") || t.includes("competência") || t.includes("prazo") || t.includes("recurso")) tags.add("processual civil");
    if (t.includes("trabalh") || t.includes("empregad")) tags.add("trabalhista");
    if (t.includes("família") || t.includes("aliment") || t.includes("divórc") || t.includes("guarda")) tags.add("familia");
    if (t.includes("responsabilidade civil")) tags.add("responsabilidade civil");
    if (t.includes("contrato") || t.includes("obrigaç")) tags.add("contratos");
    if (t.includes("execução") || t.includes("penhora")) tags.add("execucao");
    if (t.includes("servidor") || t.includes("concurso") || t.includes("administrativ")) tags.add("administrativo");

    return Array.from(tags);
}

async function extractSumulas() {
    console.log("📄 Lendo PDF oficial do STJ...");

    if (!fs.existsSync(PDF_PATH)) {
        console.error(`❌ Erro: Arquivo 'VerbetesSTJ.pdf' não encontrado na raiz do projeto.`);
        console.error(`Caminho esperado: ${PDF_PATH}`);
        process.exit(1);
    }

    const dataBuffer = fs.readFileSync(PDF_PATH);
    const data = await pdf(dataBuffer);

    console.log(`📃 PDF lido: ${data.numpages} páginas`);

    // 1. Limpeza do Texto
    let text = data.text;

    // Remover "VEJA MAIS" e links do site
    text = text.replace(/VEJA MAIS/g, "");
    text = text.replace(/scon\.stj\.jus\.br\/SCON\/sumstj\/\s*\d*/g, "");

    // 2. Fatiamento por Súmula
    // O PDF usa "l" como bullet antes de cada súmula
    const TOKEN = "|||SPLIT|||";
    text = text.replace(/\bl\n?SÚMULA/g, TOKEN + "SÚMULA");
    text = text.replace(/[●•]\s*SÚMULA/g, TOKEN + "SÚMULA");

    const parts = text.split(TOKEN);
    const jsonDocs: Array<{
        id: string;
        titulo: string;
        conteudo: string;
        tipo: string;
        tags: string[];
    }> = [];

    console.log(`🔍 Processando ${parts.length - 1} blocos de texto...`);

    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed.startsWith("SÚMULA")) continue;

        // Extrair Número
        const matchNumero = trimmed.match(/SÚMULA\s+(\d+)/);
        if (!matchNumero) continue;

        const numero = matchNumero[1];
        const systemId = `SUMULA_STJ_${numero}`;
        const titulo = `Súmula ${numero} do STJ`;

        // Limpar conteúdo
        let conteudo = trimmed
            .replace(/SÚMULA\s+\d+/, "")
            .replace(/\r\n/g, " ")
            .replace(/\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        // Se conteúdo está vazio, pode ser súmula cancelada
        if (!conteudo || conteudo.length < 10) {
            conteudo = `[Súmula ${numero} - Verificar status no site oficial do STJ]`;
        }

        // Gerar Tags
        const tags = generateTags(conteudo);

        jsonDocs.push({
            id: systemId,
            titulo,
            conteudo,
            tipo: "sumula",
            tags
        });
    }

    // Ordenar por número
    jsonDocs.sort((a, b) => {
        const numA = parseInt(a.id.replace("SUMULA_STJ_", ""));
        const numB = parseInt(b.id.replace("SUMULA_STJ_", ""));
        return numA - numB;
    });

    // 3. Salvar JSON
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(jsonDocs, null, 2));

    console.log(`\n✅ Sucesso! ${jsonDocs.length} Súmulas extraídas.`);
    console.log(`   Primeira: ${jsonDocs[0]?.titulo}`);
    console.log(`   Última: ${jsonDocs[jsonDocs.length - 1]?.titulo}`);
    console.log(`📁 Arquivo salvo em: ${OUTPUT_PATH}`);
    console.log(`\n👉 Próximo passo: pnpm run seed:knowledge`);
}

extractSumulas();
