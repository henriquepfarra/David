
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../server/db.js";
import { knowledgeBase } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { generateEmbedding } from "../server/_core/embeddings.js";

async function seedStfVinculantes(): Promise<void> {
    console.log("🌱 Iniciando Semeadura de Súmulas Vinculantes (STF)...\n");

    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // CSV Path
    const csvPath = resolve("arquivos teste", "STF", "resultados-de-sumulas.csv");
    console.log(`📂 Lendo CSV: ${csvPath}`);

    const rawData = readFileSync(csvPath, "utf-8");
    const lines = rawData.split("\n").filter(line => line.trim() !== "");

    // Ignorar header
    const dataLines = lines.slice(1);

    console.log(`📚 Encontradas ${dataLines.length} súmulas vinculantes para processar.\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const line of dataLines) {
        // Parser simples de CSV (atenção com aspas)
        // Regex para separar por vírgula mas respeitar aspas
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

        if (!matches || matches.length < 6) {
            // Tentar parse manual se regex falhar (caso complexo)
            // As colunas são: Titulo,Órgão julgador,Data de aprovação,Situação,Ramo do direito,Enunciado
            continue;
        }

        // Limpar aspas das strings
        const clean = (str: string) => str ? str.replace(/^"|"$/g, '').trim() : '';

        // O CSV fornecido parece ter as colunas bem definidas
        // Mas a regex acima pode falhar se houver vírgulas dentro do enunciado.
        // Vamos usar uma abordagem mais robusta para CSV parse line

        const cols: string[] = [];
        let inQuote = false;
        let buf = "";
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                cols.push(clean(buf));
                buf = "";
            } else {
                buf += char;
            }
        }
        cols.push(clean(buf)); // Última coluna

        const titulo = cols[0]; // Súmula vinculante 63
        // const orgao = cols[1];
        // const data = cols[2];
        const situacao = cols[3]; // Aprovada
        const ramo = cols[4]; // Penal
        const enunciado = cols[5];

        if (!titulo || !enunciado) continue;

        // Extrair número para ID
        const numMatch = titulo.match(/\d+/);
        const numero = numMatch ? numMatch[0] : "0";
        const systemId = `SUMULA_VINCULANTE_${numero}`;

        const tags = ["stf", "sumula_vinculante"];
        if (ramo) tags.push(ramo.toLowerCase());
        if (situacao && situacao.toLowerCase() !== "aprovada") {
            tags.push(situacao.toLowerCase()); // ex: cancelada
        }

        const isCancelada = situacao.toLowerCase().includes("cancelada");

        // Upsert lógica
        const existing = await db.query.knowledgeBase.findFirst({
            where: eq(knowledgeBase.systemId, systemId),
        });

        const content = enunciado;

        if (existing) {
            const needsEmbedding = !existing.embedding || (Array.isArray(existing.embedding) && existing.embedding.length === 0);

            if (existing.content !== content || existing.title !== titulo || needsEmbedding) {
                const textToEmbed = `${titulo}\n${content}\nTags: ${tags.join(", ")}`;

                // Se cancelada, talvez não queira embedding ou embedding diferente?
                // Vamos gerar igual.
                let embedding: number[] | null = null;
                try {
                    embedding = await generateEmbedding(textToEmbed);
                } catch {
                    console.warn(`   ⚠️ Embedding falhou`);
                }

                await db.update(knowledgeBase)
                    .set({
                        title: titulo,
                        content: content,
                        documentType: "sumula_vinculante",
                        tags: tags.join(", "),
                        embedding: embedding,
                        updatedAt: new Date(),
                    })
                    .where(eq(knowledgeBase.id, existing.id));

                console.log(`🔄 Atualizado: ${titulo}`);
                updated++;
            } else {
                console.log(`💤 Ignorado: ${titulo}`);
                skipped++;
            }
        } else {
            const textToEmbed = `${titulo}\n${content}\nTags: ${tags.join(", ")}`;
            let embedding: number[] | null = null;
            try {
                embedding = await generateEmbedding(textToEmbed);
            } catch {
                console.warn(`   ⚠️ Embedding falhou`);
            }

            await db.insert(knowledgeBase).values({
                userId: 1,
                systemId: systemId,
                title: titulo,
                content: content,
                documentType: "sumula_vinculante",
                source: "sistema",
                tags: tags.join(", "),
                embedding: embedding,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`✅ Criado: ${titulo}`);
            created++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`🌱 Semeadura Vinculantes concluída!`);
    console.log(`   ✅ Criados: ${created}`);
    console.log(`   🔄 Atualizados: ${updated}`);
    console.log(`   💤 Ignorados: ${skipped}`);
    console.log("=".repeat(50));
}

seedStfVinculantes()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
