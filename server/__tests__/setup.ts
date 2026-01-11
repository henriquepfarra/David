/**
 * Setup global para testes
 * Carrega variáveis de ambiente ANTES de qualquer teste rodar
 */

import { config } from "dotenv";
import path from "path";

// Prioridade: .env.test > .env
// Isso permite ter configuração separada para testes
const envTestPath = path.resolve(process.cwd(), ".env.test");
const envPath = path.resolve(process.cwd(), ".env");

// Tentar carregar .env.test primeiro
config({ path: envTestPath });

// Se não existir, carregar .env
if (!process.env.DATABASE_URL) {
  config({ path: envPath });
}

// Validar variáveis críticas
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(
    `⚠️  [Test Setup] Missing environment variables: ${missingVars.join(", ")}\n` +
    `   Alguns testes podem falhar.\n` +
    `   Opções:\n` +
    `   1. Criar .env.test com configuração de teste\n` +
    `   2. Usar .env existente (certifique-se que é seguro para testes!)\n`
  );
}

const dbUrl = process.env.DATABASE_URL || "";
const isRailway = dbUrl.includes("railway") || dbUrl.includes("proxy");
const isSQLite = dbUrl.startsWith("file:");

console.log(`✅ [Test Setup] Environment loaded`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "✓ configured" : "✗ missing"}`);
console.log(`   Database type: ${isSQLite ? "SQLite (local)" : isRailway ? "Railway (remote)" : "MySQL/other"}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? "✓ configured" : "✗ missing"}`);

if (isRailway) {
  console.warn(
    `\n⚠️  [Test Setup] Detectado banco Railway!\n` +
    `   Recomendação: Criar .env.test com banco separado para testes\n` +
    `   Exemplo: DATABASE_URL="file:./test.db" (SQLite local)\n`
  );
}
