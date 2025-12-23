import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;

// Se DATABASE_URL estiver definida, usa MySQL (produção)
// Senão, usa SQLite (desenvolvimento local)
const config = connectionString
  ? {
    schema: "./drizzle/schema.ts",
    out: "./drizzle",
    dialect: "mysql" as const,
    dbCredentials: {
      url: connectionString,
    },
  }
  : {
    schema: "./drizzle/schema.ts",
    out: "./drizzle",
    dialect: "sqlite" as const,
    dbCredentials: {
      url: "./dev.db",
    },
  };

console.log(
  connectionString
    ? "[Drizzle] Using MySQL from DATABASE_URL"
    : "[Drizzle] Using SQLite (./dev.db) for local development"
);

export default defineConfig(config);

