/**
 * Setup global para testes
 * Carrega variáveis de ambiente ANTES de qualquer teste rodar
 */

import { config } from "dotenv";
import path from "path";

// Carregar .env da raiz do projeto
config({ path: path.resolve(process.cwd(), ".env") });

// Validar variáveis críticas
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(
    `⚠️  [Test Setup] Missing environment variables: ${missingVars.join(", ")}\n` +
    `   Alguns testes podem falhar. Certifique-se de ter um arquivo .env na raiz do projeto.\n`
  );
}

console.log(`✅ [Test Setup] Environment loaded from .env`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "✓ configured" : "✗ missing"}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? "✓ configured" : "✗ missing"}`);
