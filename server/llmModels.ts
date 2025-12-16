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
      case "groq":
        return await listGroqModels(apiKey);
      case "deepseek":
        // DeepSeek API is OpenAI compatible
        return await listDeepSeekModels(apiKey);
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

  // PERMISSIVO: Retornar todos os modelos Gemini relevantes
  return data.models
    .filter((model: any) => model.supportedGenerationMethods?.includes("generateContent"))
    .map((model: any) => {
      const id = model.name.replace("models/", "");
      return {
        id: id,
        name: model.displayName || id,
        description: model.description,
        supportsVision: id.includes("vision") || id.includes("gemini"),
      }
    })
    .filter((model: LLMModel) => {
      // A regra agora é: Se tem 'gemini' no nome, mostre.
      // O usuário quer ver tudo, incluindo 'experimental' e '3.0' se existir.
      // Apenas filtramos 'paLM' ou coisas muito legadas se não forem Gemini.
      return model.id.toLowerCase().includes("gemini");
    })
    .sort((a: LLMModel, b: LLMModel) => {
      // Ordenação inteligente: 
      // 1. Tenta extrair versão (1.5, 2.0, 3.0)
      const getVersion = (id: string) => {
        const match = id.match(/(\d+\.\d+)/);
        return match ? parseFloat(match[0]) : 0;
      };

      const verA = getVersion(a.id);
      const verB = getVersion(b.id);

      if (verA !== verB) return verB - verA; // Decrescente (3.0 > 2.0 > 1.5)

      // 2. Se versões iguais, priorize 'experimental' ou 'pro' sobre 'flash'
      const score = (id: string) => {
        // Dê prioridade para "exp" ou "experimental" se o usuário quer ver novidades
        if (id.includes("exp")) return 4;
        if (id.includes("pro")) return 3;
        if (id.includes("flash")) return 2;
        return 1;
      };

      return score(b.id) - score(a.id);
    });
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

  const chatModels = data.data.filter((model: any) =>
    model.id.startsWith("gpt-4o") ||
    model.id.startsWith("o1-")
  );

  return chatModels.map((model: any) => ({
    id: model.id,
    name: model.id,
    supportsVision: true,
  }));
}

/**
 * Lista modelos da Groq
 */
async function listGroqModels(apiKey: string): Promise<LLMModel[]> {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Falha ao listar modelos Groq");
  }

  const data = await response.json();

  // Filtrar apenas Llama 3/3.1 e Mixtral (ignorar whisper/gemma se quiser focar em chat potente)
  const validModels = data.data.filter((m: any) =>
    !m.id.includes("whisper") && (m.id.includes("llama-3") || m.id.includes("mixtral"))
  );

  return validModels.map((model: any) => ({
    id: model.id,
    name: model.id,
    supportsVision: false, // Groq vision support varies, assume false for safety or check ID
  }));
}

/**
 * Lista modelos da DeepSeek
 */
async function listDeepSeekModels(apiKey: string): Promise<LLMModel[]> {
  // DeepSeek endpoint
  return [
    { id: "deepseek-chat", name: "DeepSeek V3 (Chat)", description: "Modelo econômico e incrivelmente inteligente", supportsVision: false },
    { id: "deepseek-coder", name: "DeepSeek Coder V2", description: "Especializado em código", supportsVision: false },
    { id: "deepseek-reasoner", name: "DeepSeek R1 (Reasoner)", description: "Raciocínio avançado (similar ao o1)", supportsVision: false }
  ];
}

/**
 * Lista modelos da Anthropic
 */
async function listAnthropicModels(apiKey: string): Promise<LLMModel[]> {
  return getFallbackModels("anthropic");
}

/**
 * Retorna lista estática de fallback quando API falha
 */
function getFallbackModels(provider: string): LLMModel[] {
  const fallbacks: Record<string, LLMModel[]> = {
    google: [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", supportsVision: true },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", supportsVision: true },
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Exp)", supportsVision: true },
    ],
    openai: [
      { id: "gpt-4o", name: "GPT-4o", supportsVision: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", supportsVision: true },
      { id: "o1-preview", name: "o1 Preview", supportsVision: true },
    ],
    anthropic: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", supportsVision: true },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", supportsVision: true },
    ],
    groq: [
      { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", supportsVision: false },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", supportsVision: false },
    ],
    deepseek: [
      { id: "deepseek-chat", name: "DeepSeek V3", supportsVision: false },
      { id: "deepseek-reasoner", name: "DeepSeek R1", supportsVision: false },
    ]
  };

  return fallbacks[provider] || [];
}
