import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function main() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    const db = drizzle(connection);

    // Verificar settings do usuário 6 (Desenvolvedor Local)
    const settings = await db.execute(sql`
        SELECT userId, llmModel, llmProvider, llmApiKey 
        FROM userSettings 
        WHERE userId = 6
    `);

    console.log("Settings do usuário 6:");
    console.log(settings[0]);

    await connection.end();
    process.exit(0);
}

main().catch(console.error);
