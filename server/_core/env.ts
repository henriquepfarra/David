import { z } from "zod";

const envSchema = z.object({
  // Core required
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // App config
  VITE_APP_ID: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().optional(),

  // Google OAuth (for authentication)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Google Gemini API (for File API and LLM)
  GEMINI_API_KEY: z.string().optional(),

  // OpenAI API (para embeddings - text-embedding-3-small)
  OPENAI_API_KEY: z.string().optional(),

  // Sentry Error Monitoring
  SENTRY_DSN: z.string().optional(),
});

// Validate process.env
// We verify that required variables are present. 
// If validation fails, the server will crash immediately with a helpful error message.
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

const env = parsedEnv.data;

export const ENV = {
  // Core
  cookieSecret: env.JWT_SECRET,
  databaseUrl: env.DATABASE_URL,
  isProduction: env.NODE_ENV === "production",

  // App config
  appId: env.VITE_APP_ID ?? "",

  // Google OAuth (for authentication)
  googleClientId: env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: env.GOOGLE_CLIENT_SECRET ?? "",

  // Google Gemini API (for File API and LLM - can be overridden by user settings)
  geminiApiKey: env.GEMINI_API_KEY ?? "",

  // OpenAI API (para embeddings - chave do servidor, não do usuário)
  openaiApiKey: env.OPENAI_API_KEY ?? "",
};
