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
        id: "gemini-2.0-flash-exp",
        name: "Gemini 2.0 Flash (Experimental)",
        description: "Modelo mais recente e rápido com suporte a visão",
        supportsVision: true,
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        description: "Rápido e eficiente com suporte a visão",
        supportsVision: true,
      },
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        description: "Modelo avançado com grande contexto",
        supportsVision: true,
      },
    ],
    openai: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        description: "Modelo mais recente com suporte a visão",
        supportsVision: true,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "Versão mais rápida e econômica",
        supportsVision: true,
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "Modelo avançado com grande contexto",
        supportsVision: true,
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Rápido e econômico",
        supportsVision: false,
      },
    ],
    anthropic: [
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        description: "Modelo mais recente e equilibrado",
        supportsVision: true,
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        description: "Modelo mais poderoso",
        supportsVision: true,
      },
      {
        id: "claude-3-sonnet-20240229",
        name: "Claude 3 Sonnet",
        description: "Equilibrado entre velocidade e qualidade",
        supportsVision: true,
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        description: "Mais rápido e econômico",
        supportsVision: true,
      },
    ],
  };

  return fallbacks[provider] || [];
}
