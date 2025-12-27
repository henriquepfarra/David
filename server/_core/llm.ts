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

  try {
    const response = await fetch(resolveApiUrl(provider), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey || ENV.geminiApiKey}`,
      },
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
    };
    finish_reason: string | null;
  }>;
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

  const response = await fetch(resolveApiUrl(provider), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey || ENV.geminiApiKey}`,
    },
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
      authorization: `Bearer ${ENV.geminiApiKey}`,
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
