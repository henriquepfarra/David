/**
 * Rate Limiter com suporte a planos de usuário e burst protection.
 *
 * Duas camadas de proteção:
 * 1. Quota diária (por plano): requests/dia e tokens/dia
 * 2. Burst protection (in-memory): requests/minuto anti-flood
 */

// ============================================
// PLANOS E LIMITES
// ============================================

export interface PlanLimits {
  /** Nome exibido ao usuário */
  label: string;
  /** Requests por dia */
  dailyRequests: number;
  /** Tokens totais (input+output) por dia */
  dailyTokens: number;
  /** Requests por minuto (burst protection) */
  requestsPerMinute: number;
  /** Providers permitidos */
  allowedProviders: string[];
}

/** Fator de conversão: 1 crédito = 1.000 tokens */
export const TOKENS_PER_CREDIT = 1_000;

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  tester: {
    label: "Tester (Beta)",
    dailyRequests: 50,
    dailyTokens: 250_000, // 250 créditos
    requestsPerMinute: 10,
    allowedProviders: ["google", "openai", "anthropic"],
  },
  free: {
    label: "Gratuito",
    dailyRequests: 20,
    dailyTokens: 100_000, // 100 créditos
    requestsPerMinute: 5,
    allowedProviders: ["google"],
  },
  pro: {
    label: "Profissional",
    dailyRequests: 500,
    dailyTokens: 2_000_000, // 2.000 créditos
    requestsPerMinute: 20,
    allowedProviders: ["google", "openai", "anthropic"],
  },
  avancado: {
    label: "Avançado (API Própria)",
    dailyRequests: 999_999,
    dailyTokens: 999_999_999, // sem limite prático (user paga)
    requestsPerMinute: 20,
    allowedProviders: ["google", "openai", "anthropic", "groq", "deepseek"],
  },
};

/** Admin tem limites efetivamente ilimitados */
const ADMIN_LIMITS: PlanLimits = {
  label: "Admin",
  dailyRequests: 999_999,
  dailyTokens: 999_999_999,
  requestsPerMinute: 60,
  allowedProviders: ["google", "openai", "anthropic", "groq", "deepseek"],
};

export function getPlanLimits(plan: string, role?: string): PlanLimits {
  if (role === "admin") return ADMIN_LIMITS;
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

// ============================================
// BURST PROTECTION (in-memory, per-minute)
// ============================================

interface BurstEntry {
  count: number;
  windowStart: number;
}

const burstMap = new Map<number, BurstEntry>();

// Limpar entradas expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  burstMap.forEach((entry, userId) => {
    if (now - entry.windowStart > 120_000) { // 2min de expiração
      burstMap.delete(userId);
    }
  });
}, 5 * 60 * 1000);

export function checkBurstLimit(userId: number, maxPerMinute: number): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = burstMap.get(userId);

  if (!entry || now - entry.windowStart > 60_000) {
    // Nova janela
    burstMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= maxPerMinute) {
    const retryAfter = Math.ceil((60_000 - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// ============================================
// CHECK COMBINADO (quota diária + burst)
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  plan: string;
  limits: PlanLimits;
  usage?: {
    requestCount: number;
    totalTokens: number;
  };
}

/**
 * Verificação completa: burst (in-memory) + quota diária (banco).
 * Chamado antes de cada request LLM.
 */
export async function checkRateLimitWithPlan(
  userId: number,
  plan: string,
  role: string | undefined,
  getDailyUsage: (userId: number) => Promise<{ requestCount: number; inputTokens: number; outputTokens: number }>
): Promise<RateLimitResult> {
  const limits = getPlanLimits(plan, role);

  // 1. Burst protection (rápido, in-memory)
  const burst = checkBurstLimit(userId, limits.requestsPerMinute);
  if (!burst.allowed) {
    return {
      allowed: false,
      reason: `Muitas requisições em sequência. Aguarde ${burst.retryAfterSeconds}s.`,
      plan,
      limits,
    };
  }

  // 2. Quota diária (banco)
  const usage = await getDailyUsage(userId);
  const totalTokens = usage.inputTokens + usage.outputTokens;

  if (usage.requestCount >= limits.dailyRequests) {
    return {
      allowed: false,
      reason: `Você atingiu o limite diário de uso (plano ${limits.label}). Seus créditos serão renovados amanhã.`,
      plan,
      limits,
      usage: { requestCount: usage.requestCount, totalTokens },
    };
  }

  const creditsUsed = Math.ceil(totalTokens / TOKENS_PER_CREDIT);
  const creditsLimit = Math.ceil(limits.dailyTokens / TOKENS_PER_CREDIT);

  if (totalTokens >= limits.dailyTokens) {
    return {
      allowed: false,
      reason: `Você usou todos os seus ${creditsLimit} créditos de hoje (plano ${limits.label}). Seus créditos serão renovados amanhã.`,
      plan,
      limits,
      usage: { requestCount: usage.requestCount, totalTokens },
    };
  }

  return {
    allowed: true,
    plan,
    limits,
    usage: { requestCount: usage.requestCount, totalTokens },
  };
}

/**
 * Verifica se o provider é permitido no plano do usuário.
 */
export function isProviderAllowed(plan: string, role: string | undefined, provider: string): boolean {
  const limits = getPlanLimits(plan, role);
  return limits.allowedProviders.includes(provider.toLowerCase());
}
