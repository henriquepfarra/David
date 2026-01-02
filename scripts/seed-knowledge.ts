/**
 * Script de Seeding da Base de Conhecimento do Sistema
 * 
 * Lê o arquivo server/data/system_knowledge.json e sincroniza com o banco de dados.
 * - Se não existe → Cria
 * - Se mudou → Atualiza
 * - Se igual → Ignora
 * 
 * Executar: pnpm run seed:knowledge
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateEmbedding } from "../server/_core/embeddings";

// Tipo do documento no JSON
interface SystemDoc {
    id: string; // ID único para controle (ex: SUMULA_STJ_54)
    titulo: string;
    conteudo: string;
    tipo: "sumula" | "enunciado" | "tese" | "tema_repetitivo" | "minuta_modelo" | "decisao_referencia" | "jurisprudencia" | "outro";
    tags: string[];
}

async function seedSystemKnowledge() {
    console.log("🌱 Iniciando Semeadura de Conhecimento do Sistema...\n");

    if (!db) {
        console.error("❌ Conexão com banco de dados não disponível!");
        process.exit(1);
    }

    // 1. Ler o Arquivo Mestre
    const filePath = path.join(process.cwd(), "server", "data", "system_knowledge.json");

    if (!fs.existsSync(filePath)) {
        console.error("❌ Arquivo system_knowledge.json não encontrado!");
        console.log("   Esperado em:", filePath);
        process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, "utf-8");
    const docs: SystemDoc[] = JSON.parse(rawData);

    console.log(`📚 Encontrados ${docs.length} documentos para processar.\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // 2. Loop de Processamento
    for (const doc of docs) {
        try {
            // Busca pelo systemId
            const existing = await db.query.knowledgeBase.findFirst({
                where: eq(knowledgeBase.systemId, doc.id),
            });

            if (existing) {
                // Verifica se precisa atualizar
                if (existing.content !== doc.conteudo || existing.title !== doc.titulo) {
                    // Gera embedding para o texto atualizado
                    const textToEmbed = `${doc.titulo}\n${doc.conteudo}\nTags: ${doc.tags.join(", ")}`;
                    let embedding: number[] | null = null;

                    try {
                        embedding = await generateEmbedding(textToEmbed);
                    } catch {
                        console.warn(`   ⚠️ Embedding falhou, continuando sem vetor`);
                    }

                    await db.update(knowledgeBase)
                        .set({
                            title: doc.titulo,
                            content: doc.conteudo,
                            documentType: doc.tipo,
                            tags: doc.tags.join(", "),
                            embedding: embedding,
                            updatedAt: new Date(),
                        })
                        .where(eq(knowledgeBase.id, existing.id));

                    console.log(`🔄 Atualizado: ${doc.titulo}`);
                    updated++;
                } else {
                    console.log(`💤 Ignorado (idêntico): ${doc.titulo}`);
                    skipped++;
                }
            } else {
                // Gera embedding para texto novo
                const textToEmbed = `${doc.titulo}\n${doc.conteudo}\nTags: ${doc.tags.join(", ")}`;
                let embedding: number[] | null = null;

                try {
                    embedding = await generateEmbedding(textToEmbed);
                } catch {
                    console.warn(`   ⚠️ Embedding falhou, continuando sem vetor`);
                }

                // Inserção (userId = 1 = Admin/System)
                await db.insert(knowledgeBase).values({
                    userId: 1,
                    systemId: doc.id,
                    title: doc.titulo,
                    content: doc.conteudo,
                    documentType: doc.tipo,
                    source: "sistema",
                    tags: doc.tags.join(", "),
                    embedding: embedding,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                console.log(`✅ Criado: ${doc.titulo}`);
                created++;
            }

        } catch (error) {
            console.error(`❌ Erro ao processar ${doc.titulo}:`, error);
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`🌱 Semeadura concluída!`);
    console.log(`   ✅ Criados: ${created}`);
    console.log(`   🔄 Atualizados: ${updated}`);
    console.log(`   💤 Ignorados: ${skipped}`);
    console.log("=".repeat(50));

    process.exit(0);
}

seedSystemKnowledge();
