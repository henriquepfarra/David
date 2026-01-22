/// <reference types="node" />
/**
 * Script de Seeding: Enunciados FONAJE e FOJESP
 * 
 * Lê os arquivos em docs/db/ e insere/atualiza no banco de dados.
 * - FONAJE: Forum Nacional dos Juizados Especiais
 * - FOJESP: Forum dos Juizados Especiais de São Paulo
 * 
 * Executar: pnpm tsx scripts/seed-enunciados-jec.ts
 */

import "dotenv/config";
import { execSync } from "node:child_process";
import { getDb } from "../server/db.js";
import { knowledgeBase } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { generateEmbedding } from "../server/_core/embeddings.js";

interface Enunciado {
    id: string;
    numero: number;
    titulo: string;
    conteudo: string;
    fonte: "FONAJE" | "FOJESP";
    status: "vigente" | "cancelado" | "renumerado";
}

// Extrai texto do PDF usando pdftotext
function extractPdfText(pdfPath: string): string {
    try {
        return execSync(`pdftotext -layout "${pdfPath}" -`, { encoding: "utf-8" });
    } catch (error) {
        console.error(`Erro ao extrair PDF: ${pdfPath}`, error);
        return "";
    }
}

// Extrai texto do DOCX usando unzip
function extractDocxText(docxPath: string): string {
    try {
        const xml = execSync(`unzip -p "${docxPath}" word/document.xml`, { encoding: "utf-8" });
        return xml.replace(/<[^>]*>/g, "");
    } catch (error) {
        console.error(`Erro ao extrair DOCX: ${docxPath}`, error);
        return "";
    }
}

// Parse enunciados FOJESP (formato: "número. texto")
function parseFojesp(text: string): Enunciado[] {
    const enunciados: Enunciado[] = [];
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    let currentNum = 0;
    let currentText = "";

    for (const line of lines) {
        // Match: número seguido de ponto e texto
        const match = line.match(/^(\d+)\.\s+(.*)$/);

        if (match) {
            // Salvar enunciado anterior se existir
            if (currentNum > 0 && currentText) {
                const statusLower = currentText.toLowerCase();
                let status: "vigente" | "cancelado" | "renumerado" = "vigente";
                if (statusLower.includes("cancelado")) status = "cancelado";
                else if (statusLower.includes("renumerado")) status = "renumerado";

                enunciados.push({
                    id: `FOJESP_${currentNum}`,
                    numero: currentNum,
                    titulo: `Enunciado ${currentNum} do FOJESP`,
                    conteudo: currentText.trim(),
                    fonte: "FOJESP",
                    status,
                });
            }

            currentNum = parseInt(match[1]);
            currentText = match[2];
        } else if (currentNum > 0) {
            // Continuação do enunciado anterior
            currentText += " " + line;
        }
    }

    // Último enunciado
    if (currentNum > 0 && currentText) {
        const statusLower = currentText.toLowerCase();
        let status: "vigente" | "cancelado" | "renumerado" = "vigente";
        if (statusLower.includes("cancelado")) status = "cancelado";
        else if (statusLower.includes("renumerado")) status = "renumerado";

        enunciados.push({
            id: `FOJESP_${currentNum}`,
            numero: currentNum,
            titulo: `Enunciado ${currentNum} do FOJESP`,
            conteudo: currentText.trim(),
            fonte: "FOJESP",
            status,
        });
    }

    return enunciados;
}

// Parse enunciados FONAJE (formato: "ENUNCIADO número – texto")
function parseFonaje(text: string): Enunciado[] {
    const enunciados: Enunciado[] = [];

    // Split por "ENUNCIADO" mantendo o delimitador
    const parts = text.split(/(?=ENUNCIADO\s+\d+)/);

    for (const part of parts) {
        const match = part.match(/ENUNCIADO\s+(\d+)\s*[–-]\s*(.*)/s);

        if (match) {
            const numero = parseInt(match[1]);
            let conteudo = match[2].trim()
                .replace(/\s+/g, " ") // Normaliza espaços
                .replace(/ENUNCIADO\s+\d+.*$/g, ""); // Remove início do próximo enunciado

            // Detectar status
            const statusLower = conteudo.toLowerCase();
            let status: "vigente" | "cancelado" | "renumerado" = "vigente";
            if (statusLower.includes("cancelado")) status = "cancelado";
            else if (statusLower.includes("renumerado")) status = "renumerado";

            enunciados.push({
                id: `FONAJE_${numero}`,
                numero,
                titulo: `Enunciado ${numero} do FONAJE`,
                conteudo: conteudo.trim(),
                fonte: "FONAJE",
                status,
            });
        }
    }

    return enunciados;
}

async function seedEnunciados(): Promise<void> {
    console.log("🌱 Iniciando Semeadura de Enunciados JEC...\n");

    const db = await getDb();
    if (!db) {
        throw new Error("❌ Conexão com banco de dados não disponível!");
    }

    // 1. Extrair textos
    console.log("📄 Extraindo textos dos arquivos...");
    const fojespText = extractPdfText("docs/db/ENUNCIADOS FOJESP.pdf");
    const fonajeText = extractDocxText("docs/db/enunciados fonaje.docx");

    // 2. Parse enunciados
    console.log("🔍 Parseando enunciados...");
    const fojespEnunciados = parseFojesp(fojespText);
    const fonajeEnunciados = parseFonaje(fonajeText);

    console.log(`   FOJESP: ${fojespEnunciados.length} enunciados`);
    console.log(`   FONAJE: ${fonajeEnunciados.length} enunciados`);

    const allEnunciados = [...fojespEnunciados, ...fonajeEnunciados];
    console.log(`\n📚 Total: ${allEnunciados.length} enunciados para processar.\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // 3. Inserir/Atualizar no banco
    for (const enunciado of allEnunciados) {
        try {
            // Busca existente
            const existing = await db.query.knowledgeBase.findFirst({
                where: eq(knowledgeBase.systemId, enunciado.id),
            });

            // Tags baseadas na fonte e status
            const tags = [
                "jec",
                enunciado.fonte.toLowerCase(),
                enunciado.status,
                "juizados especiais",
            ].join(", ");

            if (existing) {
                // Verifica se precisa atualizar
                const needsUpdate = existing.content !== enunciado.conteudo || !existing.embedding;

                if (needsUpdate) {
                    // Gerar embedding
                    let embedding: number[] | null = null;
                    try {
                        const textToEmbed = `${enunciado.titulo}\n${enunciado.conteudo}\nFonte: ${enunciado.fonte}`;
                        embedding = await generateEmbedding(textToEmbed);
                    } catch {
                        console.warn(`   ⚠️ Embedding falhou para ${enunciado.id}`);
                    }

                    await db.update(knowledgeBase)
                        .set({
                            title: enunciado.titulo,
                            content: enunciado.conteudo,
                            tags,
                            embedding,
                            updatedAt: new Date(),
                        })
                        .where(eq(knowledgeBase.id, existing.id));

                    console.log(`🔄 Atualizado: ${enunciado.titulo}`);
                    updated++;
                } else {
                    skipped++;
                }
            } else {
                // Gerar embedding
                let embedding: number[] | null = null;
                try {
                    const textToEmbed = `${enunciado.titulo}\n${enunciado.conteudo}\nFonte: ${enunciado.fonte}`;
                    embedding = await generateEmbedding(textToEmbed);
                } catch {
                    console.warn(`   ⚠️ Embedding falhou para ${enunciado.id}`);
                }

                // Inserir novo
                await db.insert(knowledgeBase).values({
                    userId: 1, // System user
                    systemId: enunciado.id,
                    title: enunciado.titulo,
                    content: enunciado.conteudo,
                    documentType: "enunciado",
                    source: "sistema",
                    category: "jec",
                    tags,
                    embedding,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                console.log(`✅ Criado: ${enunciado.titulo}`);
                created++;
            }
        } catch (error) {
            console.error(`❌ Erro ao processar ${enunciado.id}:`, error);
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`🌱 Semeadura concluída!`);
    console.log(`   ✅ Criados: ${created}`);
    console.log(`   🔄 Atualizados: ${updated}`);
    console.log(`   💤 Ignorados: ${skipped}`);
    console.log("=".repeat(50));
}

seedEnunciados()
    .then(() => {
        console.log("\n✅ Script finalizado com sucesso");
        process.exit(0);
    })
    .catch((err) => {
        console.error("\n❌ Script falhou:", err);
        process.exit(1);
    });
