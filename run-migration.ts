import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function runMigration() {
    console.log("🔧 Rodando migration...\n");

    const db = await getDb();
    if (!db) {
        throw new Error("❌ Database não disponível");
    }

    try {
        console.log("1️⃣ Adicionando coluna lastActivityAt...");
        await db.execute(sql`
      ALTER TABLE processes 
      ADD COLUMN lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      AFTER updatedAt
    `);
        console.log("   ✅ Coluna adicionada!\n");
    } catch (error: any) {
        if (error.message?.includes('Duplicate column')) {
            console.log("   ⚠️  Coluna já existe, pulando\n");
        } else {
            throw error;
        }
    }

    try {
        console.log("2️⃣ Criando índice idx_process_number_user...");
        await db.execute(sql`
      CREATE INDEX idx_process_number_user 
      ON processes(userId, processNumber(50))
    `);
        console.log("   ✅ Índice criado!\n");
    } catch (error: any) {
        if (error.message?.includes('Duplicate key')) {
            console.log("   ⚠️  Índice já existe, pulando\n");
        } else {
            console.log("   ⚠️  Erro ao criar índice (continuando...)\n");
        }
    }

    try {
        console.log("3️⃣ Criando índice idx_process_last_activity...");
        await db.execute(sql`
      CREATE INDEX idx_process_last_activity 
      ON processes(userId, lastActivityAt DESC)
    `);
        console.log("   ✅ Índice criado!\n");
    } catch (error: any) {
        if (error.message?.includes('Duplicate key')) {
            console.log("   ⚠️  Índice já existe, pulando\n");
        } else {
            console.log("   ⚠️  Erro ao criar índice (continuando...)\n");
        }
    }

    console.log("4️⃣ Adicionando colunas na tabela users...");
    try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN loginMethod varchar(64)`);
        console.log("   ✅ Coluna loginMethod adicionada!");
    } catch (error: any) {
        if (error.message?.includes('Duplicate column')) {
            console.log("   ⚠️  Coluna loginMethod já existe");
        } else {
            console.log("   ❌ Erro ao adicionar loginMethod:", error.message);
        }
    }

    try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN lastSignedIn timestamp NOT NULL DEFAULT (now())`);
        console.log("   ✅ Coluna lastSignedIn adicionada!");
    } catch (error: any) {
        if (error.message?.includes('Duplicate column')) {
            console.log("   ⚠️  Coluna lastSignedIn já existe");
        } else {
            console.log("   ❌ Erro ao adicionar lastSignedIn:", error.message);
        }
    }

    console.log("\n✅ Migration concluída com sucesso!\n");
    process.exit(0);
}

runMigration().catch((error) => {
    console.error("\n❌ Erro:", error.message);
    process.exit(1);
});
