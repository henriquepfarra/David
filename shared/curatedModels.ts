/**
 * Modelos curados disponíveis para seleção rápida pelos usuários.
 * Cada opção mapeia para um provider + model específico.
 */

export interface CuratedModel {
  id: string;
  label: string;
  shortLabel: string;
  provider: "google" | "anthropic" | "openai";
  model: string;
  tier: "fast" | "pro";
  color: string;
  description: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

export const CURATED_MODELS: CuratedModel[] = [
  // === Rápidos (fast) ===
  {
    id: "gemini-flash",
    label: "Gemini 3 Flash",
    shortLabel: "GEMINI 3 FLASH",
    provider: "google",
    model: "gemini-3-flash-preview",
    tier: "fast",
    color: "bg-blue-500",
    description: "Rápido e eficiente. Padrão recomendado.",
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
  },
  {
    id: "claude-haiku",
    label: "Claude 4.5 Haiku",
    shortLabel: "CLAUDE 4.5 HAIKU",
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    tier: "fast",
    color: "bg-orange-500",
    description: "Rápido com boa qualidade de redação.",
    inputPricePer1M: 1.00,
    outputPricePer1M: 5.00,
  },
  {
    id: "gpt-mini",
    label: "GPT-5 Mini",
    shortLabel: "GPT-5 MINI",
    provider: "openai",
    model: "gpt-5-mini",
    tier: "fast",
    color: "bg-emerald-600",
    description: "Modelo leve e econômico da OpenAI.",
    inputPricePer1M: 0.25,
    outputPricePer1M: 2.00,
  },
  // === Pro (robustos) ===
  {
    id: "gemini-pro",
    label: "Gemini 3 Pro",
    shortLabel: "GEMINI 3 PRO",
    provider: "google",
    model: "gemini-3-pro-preview",
    tier: "pro",
    color: "bg-blue-500",
    description: "Máxima capacidade do Google.",
    inputPricePer1M: 1.25,
    outputPricePer1M: 10.00,
  },
  {
    id: "claude-sonnet",
    label: "Claude 4.5 Sonnet",
    shortLabel: "CLAUDE 4.5 SONNET",
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    tier: "pro",
    color: "bg-orange-500",
    description: "Excelente em redação jurídica complexa.",
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
  },
  {
    id: "gpt-5",
    label: "GPT-5.2",
    shortLabel: "GPT-5.2",
    provider: "openai",
    model: "gpt-5.2",
    tier: "pro",
    color: "bg-emerald-600",
    description: "Modelo mais avançado da OpenAI.",
    inputPricePer1M: 1.75,
    outputPricePer1M: 14.00,
  },
];

export const DEFAULT_CURATED_MODEL = CURATED_MODELS[0]; // Gemini 3 Flash

export function findCuratedModel(modelId: string): CuratedModel | undefined {
  return CURATED_MODELS.find((m) => m.id === modelId);
}

export function findCuratedModelByApiModel(apiModel: string): CuratedModel | undefined {
  return CURATED_MODELS.find((m) => m.model === apiModel);
}
