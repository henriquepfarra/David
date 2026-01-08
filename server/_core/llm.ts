import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  apiKey?: string;
  model?: string;
  provider?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const VALID_PROVIDERS = ["openai", "google", "groq", "deepseek", "anthropic"] as const;
type ValidProvider = typeof VALID_PROVIDERS[number];

const resolveApiUrl = (provider?: string) => {
  const normalizedProvider = provider?.toLowerCase() as ValidProvider | undefined;

  switch (normalizedProvider) {
    case "openai":
      return "https://api.openai.com/v1/chat/completions";
    case "google":
      // Google's OpenAI-compatible endpoint
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    case "groq":
      return "https://api.groq.com/openai/v1/chat/completions";
    case "deepseek":
      return "https://api.deepseek.com/chat/completions";
    case "anthropic":
      return "https://api.anthropic.com/v1/messages";
    case undefined:
      // No provider specified, use default Google
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    default:
      throw new Error(`Invalid LLM provider: "${provider}". Valid providers are: ${VALID_PROVIDERS.join(", ")}`);
  }
};

const assertApiKey = (apiKey?: string) => {
  if (!apiKey && !ENV.geminiApiKey) {
    throw new Error("LLM API Key is not configured. Please configure your API key in Settings.");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!params.apiKey) {
    assertApiKey();
  }

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    apiKey,
    model,
    provider
  } = params;

  const payload: Record<string, unknown> = {
    model: model || "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768


  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  console.log(`[invokeLLM] Connecting to ${resolveApiUrl(provider)} with model ${payload.model}...`);

  // Build headers based on provider (Anthropic uses different auth)
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (provider === "anthropic") {
    // Anthropic requires x-api-key header, not Bearer token
    headers["x-api-key"] = apiKey || "";
    headers["anthropic-version"] = "2023-06-01";
  } else {
    // OpenAI, Google, Groq, DeepSeek use Bearer token
    headers["authorization"] = `Bearer ${apiKey || ENV.geminiApiKey}`;
  }

  try {
    const response = await fetch(resolveApiUrl(provider), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[invokeLLM] API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(
        `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
      );
    }

    return (await response.json()) as InvokeResult;
  } catch (error: any) {
    console.error(`[invokeLLM] Network/Fetch Error:`, error);
    if (error.cause) console.error(`[invokeLLM] Cause:`, error.cause);
    throw new Error(`LLM Connection Failed: ${error.message}`);
  }
}

export type StreamChunk = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: Role;
      content?: string;
      reasoning_content?: string; // OpenAI o1 thinking
    };
    finish_reason: string | null;
  }>;
  // Gemini thinking fields
  thought?: string;
  thinkingContent?: string;
};

// Tipo de retorno do stream - pode ser thinking ou content
export type StreamYield = {
  type: "thinking" | "content";
  text: string;
};

export async function* invokeLLMStream(params: InvokeParams): AsyncGenerator<string, void, unknown> {


  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    apiKey,
    model,
    provider
  } = params;

  const payload: Record<string, unknown> = {
    model: model || "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
    stream: true,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;


  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  // Build headers based on provider (Anthropic uses different auth)
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey || "";
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["authorization"] = `Bearer ${apiKey || ENV.geminiApiKey}`;
  }

  const response = await fetch(resolveApiUrl(provider), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM stream failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6)) as StreamChunk;
          const content = json.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch (e) {
          console.error("Failed to parse SSE chunk:", e, trimmed);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream com suporte a Thinking (Multi-Provider)
 * 
 * Extrai thinking de diferentes providers:
 * - Gemini: campos thought/thinkingContent
 * - OpenAI o1: campo reasoning_content
 * - Claude: tags <thinking>...</thinking> no content
 * 
 * Retorna objetos StreamYield com type: "thinking" | "content"
 */
export async function* invokeLLMStreamWithThinking(
  params: InvokeParams
): AsyncGenerator<StreamYield, void, unknown> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    apiKey,
    model,
    provider
  } = params;

  const normalizedProvider = provider?.toLowerCase() || "google";

  // === GOOGLE: USAR API NATIVA PARA SUPORTE A THINKING ===
  if (normalizedProvider === "google") {
    const geminiApiKey = apiKey || ENV.geminiApiKey;
    const geminiModel = model || "gemini-2.5-flash";

    console.log(`[LLM] Usando API nativa do Gemini para modelo: ${geminiModel}`);

    // Delegar para função de streaming nativa do Gemini
    yield* geminiNativeStreamWithThinking(messages, geminiModel, geminiApiKey);
    return;
  }

  // === OUTROS PROVIDERS: USAR API OPENAI-COMPATIBLE ===
  const payload: Record<string, unknown> = {
    model: model || "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
    stream: true,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  // Build headers based on provider
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey || "";
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["authorization"] = `Bearer ${apiKey || ENV.geminiApiKey}`;
  }

  const response = await fetch(resolveApiUrl(provider), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM stream failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inThinkingTag = false;
  let thinkingBuffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6)) as StreamChunk;

          // === EXTRAIR THINKING ===

          // 1. Gemini thinking fields
          const geminiThinking = json.thought || json.thinkingContent;
          if (geminiThinking) {
            yield { type: "thinking", text: geminiThinking };
            continue;
          }

          // 2. OpenAI o1 reasoning_content
          const o1Reasoning = json.choices[0]?.delta?.reasoning_content;
          if (o1Reasoning) {
            yield { type: "thinking", text: o1Reasoning };
            continue;
          }

          // 3. Claude <thinking> tags no content
          const content = json.choices[0]?.delta?.content;
          if (content && normalizedProvider === "anthropic") {
            // Processar tags <thinking>
            for (let i = 0; i < content.length; i++) {
              const remaining = content.slice(i);

              if (!inThinkingTag && remaining.startsWith("<thinking>")) {
                inThinkingTag = true;
                i += 9; // Pular "<thinking>"
                continue;
              }

              if (inThinkingTag && remaining.startsWith("</thinking>")) {
                inThinkingTag = false;
                if (thinkingBuffer) {
                  yield { type: "thinking", text: thinkingBuffer };
                  thinkingBuffer = "";
                }
                i += 10; // Pular "</thinking>"
                continue;
              }

              if (inThinkingTag) {
                thinkingBuffer += content[i];
              } else {
                yield { type: "content", text: content[i] };
              }
            }
          } else if (content) {
            // Provider sem thinking especial - tudo é content
            yield { type: "content", text: content };
          }

        } catch (e) {
          console.error("Failed to parse SSE chunk:", e, trimmed);
        }
      }
    }

    // Flush remaining thinking buffer
    if (thinkingBuffer) {
      yield { type: "thinking", text: thinkingBuffer };
    }

  } finally {
    reader.releaseLock();
  }
}

/**
 * Streaming nativo do Google Gemini com suporte a Thinking
 * 
 * Usa a API nativa do Gemini (não OpenAI-compatible) para:
 * - Expor campos de thinking/reasoning
 * - Suporte a modelos Gemini 2.0/3.0 com thinking nativo
 */
async function* geminiNativeStreamWithThinking(
  messages: Message[],
  model: string,
  apiKey: string
): AsyncGenerator<StreamYield, void, unknown> {
  // Converter formato OpenAI para formato Gemini
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  let systemInstruction = "";

  for (const msg of messages) {
    if (msg.role === "system") {
      // System messages viram system instruction
      const content = typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.map(c => typeof c === "string" ? c : (c as any).text || "").join("\n")
          : "";
      systemInstruction += content + "\n";
    } else {
      const role = msg.role === "assistant" ? "model" : "user";
      const content = typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content.map(c => typeof c === "string" ? c : (c as any).text || "").join("\n")
          : "";
      contents.push({
        role,
        parts: [{ text: content }]
      });
    }
  }

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: 32768,
    }
  };

  // Adicionar system instruction se existir
  if (systemInstruction.trim()) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction.trim() }]
    };
  }

  // URL da API nativa com streaming
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  console.log(`[Gemini Native] Starting stream with model: ${model}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini Native stream failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));

          // Formato da resposta Gemini nativa:
          // { candidates: [{ content: { parts: [{ text: "..." }] }, groundingSupport: {...} }] }

          const candidates = json.candidates;
          if (!candidates || candidates.length === 0) continue;

          const candidate = candidates[0];

          // Extrair thinking/reasoning se presente
          // Gemini pode usar thoughtParts ou reasoning field em modelos experimentais
          const thoughtParts = candidate.thoughtParts || candidate.reasoning || json.thoughtParts;
          if (thoughtParts) {
            const thinkingText = Array.isArray(thoughtParts)
              ? thoughtParts.map((p: any) => p.text || p).join("")
              : typeof thoughtParts === "string" ? thoughtParts : "";
            if (thinkingText) {
              yield { type: "thinking", text: thinkingText };
            }
          }

          // Extrair conteúdo normal
          const parts = candidate.content?.parts;
          const role = candidate.content?.role;

          if (parts && parts.length > 0) {
            for (const part of parts) {
              // Gemini 3.0 com includeThoughts nativa: 
              // - part.thought === true indica que part.text é o pensamento
              if (part.text) {
                // DEBUG: Log primeiros caracteres para ver se tem tag thinking
                if (part.text.includes("<thinking") || part.text.includes("</thinking")) {
                  console.log("[Gemini Native DEBUG] Tag thinking detectada no conteúdo!");
                }

                const isThinkingNative = part.thought === true;
                if (isThinkingNative) {
                  yield { type: "thinking", text: part.text };
                } else {
                  // Para Prompt Injection: parsing será feito no frontend
                  yield { type: "content", text: part.text };
                }
              }
            }
          }

        } catch (e) {
          console.error("[Gemini Native] Failed to parse chunk:", e, trimmed);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ... existing code ...

export async function transcribeAudio(audioBase64: string): Promise<string> {
  assertApiKey();

  // Whisper transcription uses OpenAI API
  const url = "https://api.openai.com/v1/audio/transcriptions";

  // Converter Base64 para Blob/File
  const buffer = Buffer.from(audioBase64, 'base64');
  const blob = new Blob([buffer], { type: 'audio/webm' });

  const formData = new FormData();
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${ENV.openaiApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Audio transcription failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const json = await response.json() as { text: string };
  return json.text;
}

// ============================================
// RETRY, FALLBACK E CIRCUIT BREAKER
// ============================================

/**
 * Erros que podem ser recuperados com retry
 */
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Circuit Breaker - Desativa providers com falhas consecutivas
 */
interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitState>();
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_RESET_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

function getCircuitState(provider: string): CircuitState {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, { failures: 0, lastFailure: 0, isOpen: false });
  }
  return circuitBreakers.get(provider)!;
}

function recordFailure(provider: string): void {
  const state = getCircuitState(provider);
  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    state.isOpen = true;
    console.warn(`[Circuit Breaker] Provider "${provider}" ABERTO após ${state.failures} falhas consecutivas`);
  }
}

function recordSuccess(provider: string): void {
  const state = getCircuitState(provider);
  state.failures = 0;
  state.isOpen = false;
}

function isCircuitOpen(provider: string): boolean {
  const state = getCircuitState(provider);

  // Se aberto, verificar se já passou tempo suficiente para tentar novamente
  if (state.isOpen) {
    const elapsed = Date.now() - state.lastFailure;
    if (elapsed > CIRCUIT_RESET_TIMEOUT_MS) {
      console.log(`[Circuit Breaker] Provider "${provider}" - Tentando reset (half-open)`);
      state.isOpen = false;
      state.failures = 0;
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Sleep com backoff exponencial
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, baseMs = 1000): number {
  // Backoff exponencial com jitter: 1s, 2s, 4s...
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * 500; // Adiciona 0-500ms de jitter
  return Math.min(exponential + jitter, 30000); // Max 30 segundos
}

/**
 * Opções para retry com fallback
 */
export interface RetryOptions {
  maxRetries?: number;
  baseBackoffMs?: number;
  fallbackProviders?: string[];
  fallbackApiKeys?: Record<string, string>;
}

/**
 * invokeLLM com Retry e Fallback
 * 
 * Tenta o provider principal com retry exponencial.
 * Se esgotar retries, tenta fallback providers.
 */
export async function invokeLLMWithRetry(
  params: InvokeParams,
  options: RetryOptions = {}
): Promise<InvokeResult> {
  const {
    maxRetries = 3,
    baseBackoffMs = 1000,
    fallbackProviders = [],
    fallbackApiKeys = {},
  } = options;

  const primaryProvider = params.provider || "google";
  const allProviders = [primaryProvider, ...fallbackProviders.filter(p => p !== primaryProvider)];

  let lastError: Error | null = null;

  for (const provider of allProviders) {
    // Verificar circuit breaker
    if (isCircuitOpen(provider)) {
      console.log(`[Retry] Pulando provider "${provider}" - Circuit Breaker ABERTO`);
      continue;
    }

    // Pegar API key do provider
    const apiKey = fallbackApiKeys[provider] || params.apiKey;
    if (!apiKey && provider !== "google") {
      console.log(`[Retry] Pulando provider "${provider}" - Sem API key`);
      continue;
    }

    const providerParams = {
      ...params,
      provider,
      apiKey: apiKey || params.apiKey,
    };

    // Tentar com retry
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[Retry] Tentativa ${attempt + 1}/${maxRetries} com provider "${provider}"`);

        const result = await invokeLLM(providerParams);
        recordSuccess(provider);

        console.log(`[Retry] Sucesso com provider "${provider}" na tentativa ${attempt + 1}`);
        return result;

      } catch (error: any) {
        lastError = error;

        // Extrair status code do erro
        const statusMatch = error.message?.match(/(\d{3})/);
        const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

        console.error(`[Retry] Erro ${statusCode} com provider "${provider}":`, error.message);

        // Se não for erro recuperável, não fazer retry
        if (!RETRYABLE_STATUS_CODES.includes(statusCode)) {
          console.log(`[Retry] Erro ${statusCode} não é recuperável, pulando provider`);
          recordFailure(provider);
          break; // Vai para próximo provider
        }

        // Se for última tentativa, vai para próximo provider
        if (attempt === maxRetries - 1) {
          recordFailure(provider);
          console.log(`[Retry] Esgotadas tentativas com provider "${provider}"`);
          break;
        }

        // Calcular backoff e esperar
        const backoff = calculateBackoff(attempt, baseBackoffMs);
        console.log(`[Retry] Aguardando ${backoff}ms antes da próxima tentativa...`);
        await sleep(backoff);
      }
    }
  }

  // Se chegou aqui, todos os providers falharam
  throw lastError || new Error("Todos os providers LLM falharam");
}

/**
 * Stream com Retry
 * 
 * Para streaming, não faz retry mid-stream (complicado).
 * Apenas tenta fallback se o provider inicial falhar ao conectar.
 */
export async function* invokeLLMStreamWithRetry(
  params: InvokeParams,
  options: RetryOptions = {}
): AsyncGenerator<string, void, unknown> {
  const {
    maxRetries = 2, // Menos retries para stream
    fallbackProviders = [],
    fallbackApiKeys = {},
  } = options;

  const primaryProvider = params.provider || "google";
  const allProviders = [primaryProvider, ...fallbackProviders.filter(p => p !== primaryProvider)];

  let lastError: Error | null = null;

  for (const provider of allProviders) {
    if (isCircuitOpen(provider)) {
      console.log(`[Stream Retry] Pulando provider "${provider}" - Circuit Breaker ABERTO`);
      continue;
    }

    const apiKey = fallbackApiKeys[provider] || params.apiKey;
    if (!apiKey && provider !== "google") {
      continue;
    }

    const providerParams = {
      ...params,
      provider,
      apiKey: apiKey || params.apiKey,
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[Stream Retry] Tentativa ${attempt + 1}/${maxRetries} com provider "${provider}"`);

        // Iniciar stream - erros de conexão acontecem aqui
        const stream = invokeLLMStream(providerParams);

        // Se conseguiu iniciar, fazer yield e marcar sucesso
        let hasYielded = false;
        for await (const chunk of stream) {
          hasYielded = true;
          yield chunk;
        }

        if (hasYielded) {
          recordSuccess(provider);
          return;
        }

      } catch (error: any) {
        lastError = error;
        console.error(`[Stream Retry] Erro com provider "${provider}":`, error.message);
        recordFailure(provider);

        // Para stream, não faz retry se já conectou
        // Apenas tenta próximo provider
        break;
      }
    }
  }

  throw lastError || new Error("Todos os providers LLM falharam no streaming");
}

/**
 * Reseta todos os circuit breakers (para testes/admin)
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
  console.log("[Circuit Breaker] Todos os circuit breakers resetados");
}

/**
 * Retorna estado dos circuit breakers (para debug/monitoring)
 */
export function getCircuitBreakerStatus(): Record<string, CircuitState> {
  const status: Record<string, CircuitState> = {};
  for (const [provider, state] of Array.from(circuitBreakers.entries())) {
    status[provider] = { ...state };
  }
  return status;
}
