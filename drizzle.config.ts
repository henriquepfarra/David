import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Auto-detect dialect based on DATABASE_URL
const isSQLite = connectionString.startsWith("file:");
const dialect = isSQLite ? "sqlite" : "mysql";

console.log(`[Drizzle] Using ${dialect.toUpperCase()} dialect`);

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: dialect as "mysql" | "sqlite",
  dbCredentials: {
    url: connectionString,
  },
});
