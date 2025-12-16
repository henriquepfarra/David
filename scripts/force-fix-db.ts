
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users } from "../drizzle/schema.ts";
import * as schema from "../drizzle/schema.ts";

async function main() {
    console.log("🔌 Connecting to database...");

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not found");
    }

    const dbUrl = process.env.DATABASE_URL.replace("localhost", "127.0.0.1");
    console.log(`🔌 Connecting to database at ${dbUrl.replace(/:[^:@]*@/, ":***@")}...`);

    const connection = await mysql.createConnection(dbUrl);
    const db = drizzle(connection, { schema, mode: "default" });

    console.log("🛠️ Forcing insertion of Dev User (ID 999999)...");

    try {
        // Direct raw query to ensure no ORM magic interferes with the ID
        await connection.execute(`
      INSERT INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
      VALUES (999999, 'dev-user-id', 'Desenvolvedor Local', 'dev@local.test', 'local', 'admin', NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE name='Desenvolvedor Local', lastSignedIn=NOW();
    `);

        console.log("✅ SUCCESS: User 999999 inserted/updated.");
    } catch (error) {
        console.error("❌ ERROR inserting user:", error);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

main().catch(console.error);
