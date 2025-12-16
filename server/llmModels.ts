/**
 * Helper para listar modelos disponíveis de diferentes provedores de LLM
 */

export interface LLMModel {
  id: string;
  name: string;
  description?: string;
  supportsVision?: boolean;
}

/**
 * Lista modelos disponíveis do provedor especificado
 */
export async function listAvailableModels(
  provider: string,
  apiKey: string
): Promise<LLMModel[]> {
  try {
    switch (provider) {
      case "google":
        return await listGoogleModels(apiKey);
      case "openai":
        return await listOpenAIModels(apiKey);
      case "anthropic":
        return await listAnthropicModels(apiKey);
      default:
        return getFallbackModels(provider);
    }
  } catch (error) {
    console.error(`Erro ao listar modelos de ${provider}:`, error);
    return getFallbackModels(provider);
  }
}

/**
 * Lista modelos do Google Gemini
 */
async function listGoogleModels(apiKey: string): Promise<LLMModel[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error("Falha ao listar modelos Google");
  }

  const data = await response.json();

  return data.models
    .filter((model: any) => model.supportedGenerationMethods?.includes("generateContent"))
    .map((model: any) => ({
      id: model.name.replace("models/", ""),
      name: model.displayName || model.name,
      description: model.description,
      supportsVision: model.name.includes("vision") || model.name.includes("gemini-1.5") || model.name.includes("gemini-2"),
    }));
}

/**
 * Lista modelos da OpenAI
 */
async function listOpenAIModels(apiKey: string): Promise<LLMModel[]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao listar modelos OpenAI");
  }

  const data = await response.json();

  // Filtrar apenas modelos de chat relevantes
  const chatModels = data.data.filter((model: any) =>
    model.id.includes("gpt-4") ||
    model.id.includes("gpt-3.5") ||
    model.id.includes("o1")
  );

  return chatModels.map((model: any) => ({
    id: model.id,
    name: model.id,
    supportsVision: model.id.includes("vision") || model.id.includes("gpt-4o"),
  }));
}

/**
 * Lista modelos da Anthropic
 */
async function listAnthropicModels(apiKey: string): Promise<LLMModel[]> {
  // Anthropic não tem endpoint público de listagem, retornar fallback
  return getFallbackModels("anthropic");
}

/**
 * Retorna lista estática de fallback quando API falha
 */
function getFallbackModels(provider: string): LLMModel[] {
  const fallbacks: Record<string, LLMModel[]> = {
    google: [
      {
        id: "gemini-3.0-pro",
        name: "Gemini 3.0 Pro",
        description: "Modelo de última geração (2025) com raciocínio avançado",
        supportsVision: true,
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        description: "Modelo ultrarrápido e eficiente",
        supportsVision: true,
      },
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        description: "Modelo estável com contexto massivo",
        supportsVision: true,
      },
    ],
    openai: [
      {
        id: "gpt-5",
        name: "GPT-5 (Preview)",
        description: "A nova fronteira da inteligência artificial",
        supportsVision: true,
      },
      {
        id: "gpt-4o",
        name: "GPT-4o",
        description: "Modelo onipresente, rápido e inteligente",
        supportsVision: true,
      },
      {
        id: "o1",
        name: "O1 (Reasoning)",
        description: "Modelo focado em raciocínio complexo e lógica",
        supportsVision: true,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "Versão econômica e veloz",
        supportsVision: true,
      },
    ],
    anthropic: [
      {
        id: "claude-4-5-opus",
        name: "Claude 4.5 Opus",
        description: "O modelo mais inteligente do mundo (2025)",
        supportsVision: true,
      },
      {
        id: "claude-4-5-sonnet",
        name: "Claude 4.5 Sonnet",
        description: "Velocidade e inteligência inigualáveis",
        supportsVision: true,
      },
    ],
  };

  return fallbacks[provider] || [];
}
