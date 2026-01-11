import { defineConfig } from "vitest/config";
import path from "path";
import { config } from "dotenv";

// Carregar variáveis de ambiente do .env para testes
config();

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.spec.ts"
    ],
    globals: true,
    testTimeout: 30000, // 30s default (alguns testes LLM podem demorar)
    hookTimeout: 10000, // 10s para setup/teardown
  },
});
