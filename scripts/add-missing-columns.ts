import { createConnection } from "mysql2/promise";
import "dotenv/config";

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("❌ DATABASE_URL missing in .env or arguments");
        process.exit(1);
    }

    console.log("🔌 Connecting to database...");
    const connection = await createConnection(url);

    try {
        console.log("🔍 Checking 'users' table columns...");

        // Check if columns already exist to avoid errors
        const [columns] = await connection.query("SHOW COLUMNS FROM users");
        const columnNames = (columns as any[]).map(c => c.Field);

        if (!columnNames.includes("loginMethod")) {
            console.log("🛠️ Adding 'loginMethod' column...");
            await connection.query("ALTER TABLE users ADD COLUMN loginMethod varchar(64)");
            console.log("✅ 'loginMethod' added.");
        } else {
            console.log("ℹ️ 'loginMethod' already exists.");
        }

        if (!columnNames.includes("lastSignedIn")) {
            console.log("🛠️ Adding 'lastSignedIn' column...");
            await connection.query("ALTER TABLE users ADD COLUMN lastSignedIn timestamp NOT NULL DEFAULT (now())");
            console.log("✅ 'lastSignedIn' added.");
        } else {
            console.log("ℹ️ 'lastSignedIn' already exists.");
        }

        console.log("🎉 Database schema update complete!");
    } catch (error) {
        console.error("❌ Error running script:", error);
    } finally {
        await connection.end();
    }
}

main();
