
import "dotenv/config";
import fs from "fs";
import { resolve } from "node:path";
import { getDb } from "../server/db.js";
import { knowledgeBase } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { generateEmbedding } from "../server/_core/embeddings.js";
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function seedStfComuns(): Promise<void> {
    console.log("🌱 Iniciando Semeadura de Súmulas Comuns (STF) via PDF...\n");

    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const pdfPath = resolve("arquivos teste", "STF", "Enunciados_Sumulas_STF_1_a_736_Completo.pdf");
    console.log(`Open PDF: ${pdfPath}`);

    const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument(dataBuffer);
    const doc = await loadingTask.promise;

    let fullText = "";
    console.log(`📄 Extraindo texto de ${doc.numPages} páginas...`);

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        // Adicionar espaço, mas tentar manter quebras de linha lógicas se possível
        // O padrão SÚMULA N parece ser o separador mais forte
        fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
    }

    // Regex para identificar súmulas
    // Padrão: SÚMULA N ... texto ... (até a próxima SÚMULA ou fim)
    // Atenção: O texto contém o índice no final também.
    // O PDF parece ter estrutura: "SÚMULA 1 ...texto... Data de Aprovação..."

    // Vamos usar split por "SÚMULA", mas cuidado com falso positivo.
    // Melhor: regex global

    // O texto extraído do PDF pode ter espaços extras "S   ÚMULA   422"
    // Vamos normalizar espaços múltiplos
    const normalizedText = fullText.replace(/\s+/g, " ");

    // Regex para capturar "SÚMULA <numero> <conteudo>"
    // O conteúdo vai até encontrar "Data de Aprovação" ou outra "SÚMULA"
    const sumulaRegex = /S\s*Ú\s*M\s*U\s*L\s*A\s+(\d+)\s+(.*?)(?=Data de Aprovação|S\s*Ú\s*M\s*U\s*L\s*A\s+\d+|$)/gi;

    let match;
    let counts = { created: 0, updated: 0, skipped: 0, embeddingErrors: 0 };

    const sumulasEncontradas = [];

    while ((match = sumulaRegex.exec(normalizedText)) !== null) {
        const numero = match[1]; // 422
        let conteudo = match[2]; // Texto

        // Limpeza básica do conteúdo
        conteudo = conteudo.trim();

        // Cuidado com sujeira do PDF (números de página etc)
        // Se o conteúdo for muito curto ou parecer lixo, ignorar?
        if (conteudo.length < 10) continue;

        sumulasEncontradas.push({ numero, conteudo });
    }

    console.log(`📚 Identificadas ${sumulasEncontradas.length} potenciais súmulas.`);

    for (const item of sumulasEncontradas) {
        const { numero, conteudo } = item;
        const systemId = `SUMULA_STF_${numero}`;
        const titulo = `Súmula ${numero} do STF`;

        const tags = ["stf", "sumula_stf", "sumula"];

        // Detecção de status
        let isCancelada = false;

        if (conteudo.toLowerCase().includes("cancelada") || conteudo.toLowerCase().includes("revogada")) {
            tags.push("cancelada");
            isCancelada = true;
        }

        // Verificação no banco
        const existing = await db.query.knowledgeBase.findFirst({
            where: eq(knowledgeBase.systemId, systemId),
        });

        if (existing) {
            // Lógica de update simplificada
            if (existing.content !== conteudo) {
                // Update
                const textToEmbed = `${titulo}\n${conteudo}\nStatus: ${tags.join(", ")}`;
                let embedding = null;
                try {
                    embedding = await generateEmbedding(textToEmbed);
                } catch (error) {
                    console.warn(`⚠️  Falha ao gerar embedding para ${titulo}:`, error instanceof Error ? error.message : String(error));
                    console.warn(`   Documento será atualizado sem embedding (busca semântica não funcionará)`);
                    counts.embeddingErrors++;
                }

                await db.update(knowledgeBase).set({
                    content: conteudo,
                    tags: tags.join(", "),
                    embedding,
                    updatedAt: new Date()
                }).where(eq(knowledgeBase.id, existing.id));
                console.log(`🔄 Atualizado: ${titulo}`);
                counts.updated++;
            } else {
                counts.skipped++;
            }
        } else {
            // Insert
            const textToEmbed = `${titulo}\n${conteudo}\nStatus: ${tags.join(", ")}`;
            let embedding = null;
            try {
                embedding = await generateEmbedding(textToEmbed);
            } catch (error) {
                console.warn(`⚠️  Falha ao gerar embedding para ${titulo}:`, error instanceof Error ? error.message : String(error));
                console.warn(`   Documento será criado sem embedding (busca semântica não funcionará)`);
                counts.embeddingErrors++;
            }

            await db.insert(knowledgeBase).values({
                userId: 1,
                systemId: systemId,
                title: titulo,
                content: conteudo,
                documentType: "sumula_stf",
                source: "sistema",
                tags: tags.join(", "),
                embedding,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Criado: ${titulo}`);
            counts.created++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`🌱 Semeadura Súmulas Comuns (STF) concluída!`);
    console.log(`   ✅ Criados: ${counts.created}`);
    console.log(`   🔄 Atualizados: ${counts.updated}`);
    console.log(`   💤 Ignorados: ${counts.skipped}`);
    if (counts.embeddingErrors > 0) {
        console.log(`   ⚠️  Erros de Embedding: ${counts.embeddingErrors}`);
    }
    console.log("=".repeat(50));
}

seedStfComuns()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
