
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.ts";

async function main() {
    console.log("🏥 STARTING DIAGNOSIS...");

    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL missing");
        process.exit(1);
    }

    // FORCE IPv4
    const dbUrl = process.env.DATABASE_URL.replace("localhost", "127.0.0.1");
    console.log(`🔌 Connecting to: ${dbUrl.replace(/:[^:@]*@/, ":***@")}`);

    try {
        const connection = await mysql.createConnection(dbUrl);
        const db = drizzle(connection, { schema, mode: "default" });
        console.log("✅ DB Connection: OK");

        // 1. Check User 999999
        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, 999999)
        });

        if (user) {
            console.log("✅ User 999999: FOUND", { name: user.name, role: user.role });
        } else {
            console.error("❌ User 999999: MISSING");
            // Optional: Print ANY user
            const anyUser = await db.query.users.findFirst();
            if (anyUser) console.log("   (Found other user ID:", anyUser.id, ")");
        }

        // 2. Check Conversations
        const convs = await db.query.conversations.findMany({
            limit: 5
        });
        console.log(`ℹ️ Conversations found: ${convs.length}`);

        await connection.end();

    } catch (error) {
        console.error("❌ DIAGNOSIS FAILED:", error);
    }
}

main().catch(console.error);
