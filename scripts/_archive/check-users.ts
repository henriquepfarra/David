
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";

async function main() {
    console.log("🔍 Checking Users Table...");

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not found");
    }

    // Force 127.0.0.1 to avoid localhost DNS issues
    const dbUrl = process.env.DATABASE_URL.replace("localhost", "127.0.0.1");
    console.log(`🔌 Connecting to database at ${dbUrl.replace(/:[^:@]*@/, ":***@")}...`);

    const connection = await mysql.createConnection(dbUrl);
    const db = drizzle(connection, { schema, mode: "default" });

    try {
        const users = await db.select().from(schema.users);
        console.log("Users found:", users);

        if (users.length > 0) {
            console.log(`✅ VALID USER ID FOUND: ${users[0].id}`);
        } else {
            console.log("❌ NO USERS FOUND");
        }

    } catch (error) {
        console.error("❌ ERROR checking users:", error);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

main().catch(console.error);
