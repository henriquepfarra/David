import { z } from "zod";

const envSchema = z.object({
  // Core required
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // App config
  VITE_APP_ID: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().optional(),

  // Google OAuth (current auth method)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Legacy Manus OAuth (kept for backwards compatibility)
  OAUTH_SERVER_URL: z.string().optional(),
  OWNER_OPEN_ID: z.string().optional(),

  // Legacy Forge API (used by some features like storage, maps)
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
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

  // Google OAuth (current)
  googleClientId: env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: env.GOOGLE_CLIENT_SECRET ?? "",

  // Legacy (kept for backwards compatibility with some features)
  oAuthServerUrl: env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: env.OWNER_OPEN_ID ?? "",
  forgeApiUrl: env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: env.BUILT_IN_FORGE_API_KEY ?? "",
};
