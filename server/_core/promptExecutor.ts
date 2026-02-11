import { getDb } from "../db";
import { savedPrompts, userSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getProcessContext } from "./processContext";
import { invokeLLM, resolveApiKeyForProvider } from "./llm";
import {
  CORE_IDENTITY,
  CORE_TONE,
  CORE_GATEKEEPER,
  CORE_TRACEABILITY,
  CORE_ZERO_TOLERANCE,
  CORE_TRANSPARENCY,
  CORE_STYLE,
} from "../prompts/core";
import { JEC_CONTEXT } from "../modules/jec/context";
import {
  CORE_ORCHESTRATOR,
  CORE_MOTOR_A,
  CORE_MOTOR_B,
  CORE_MOTOR_C,
  CORE_MOTOR_D,
} from "../prompts/engines";

export interface ExecutePromptInput {
    userId: number;
    promptCommand: string; // ex: "/analise_completa"
    processId: number;
    processNumber: string;
}

/**
 * Executa um prompt complexo salvo pelo usuário
 */
export async function executeSavedPrompt(input: ExecutePromptInput): Promise<string | null> {
    // 1. Encontrar o prompt pelo comando (assumindo que o título ou um alias seja o comando)
    // Vamos buscar por título simplificado por enquanto.
    const cleanTitle = input.promptCommand.replace("/", "").replace(/_/g, " ");

    // Buscar no banco
    // Como o drizzle-orm like é chato, vamos tentar match exato ou aproximado via filtro em memória se necessário,
    // mas idealmente o usuário salva com o nome do comando "analise_completa" ou "Analise Completa"
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const prompts = await db.query.savedPrompts.findMany({
        where: eq(savedPrompts.userId, input.userId)
    });

    const matchedPrompt = prompts.find(p =>
        p.title.toLowerCase() === cleanTitle.toLowerCase() ||
        p.title.toLowerCase().replace(/ /g, "_") === cleanTitle.toLowerCase()
    );

    if (!matchedPrompt) {
        return null; // Prompt não encontrado
    }

    // 2. Determinar contexto necessário
    let context = "";
    if (matchedPrompt.executionMode === "full_context") {
        // Carregar TUDO (Modo Auditoria)
        context = await getProcessContext(input.processId, input.userId, "", "audit");
    } else {
        // Modo Chat (RAG) - Injeta o prompt como query para buscar o que é relevante
        context = await getProcessContext(input.processId, input.userId, matchedPrompt.content, "rag");
    }

    // 3. Montar Prompt Final
    // Incluir todos os prompts do sistema (como no davidRouter) para garantir que o David
    // respeite suas diretrizes principais ao executar prompts salvos
    // Para análise, ativamos os motores A, B, C (não D, que é para minutas finais)
    const baseSystemPrompt = `
${CORE_IDENTITY}
${CORE_TONE}
${CORE_GATEKEEPER}
${CORE_TRACEABILITY}
${CORE_ZERO_TOLERANCE}
${CORE_TRANSPARENCY}
${CORE_STYLE}
${JEC_CONTEXT}
${CORE_ORCHESTRATOR}
${CORE_MOTOR_A}
${CORE_MOTOR_B}
${CORE_MOTOR_C}
`;

    const finalSystemPrompt = `${baseSystemPrompt}

CONTEXTO DO PROCESSO:
${context}

Sua tarefa é executar rigorosamente o seguinte protocolo de análise:
${matchedPrompt.content}

IMPORTANTE: Este é um PROTOCOLO DE ANÁLISE, não uma solicitação de minuta. Execute a análise conforme especificado acima, sem gerar documentos finais.`;

    // 4. Invocar LLM
    // Buscar config de API do usuário
    const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, input.userId)
    });

    try {
        const response = await invokeLLM({
            messages: [{ role: "system", content: finalSystemPrompt }],
            apiKey: resolveApiKeyForProvider(settings?.llmProvider as string | undefined, settings?.llmApiKey as string | undefined),
            model: settings?.llmModel || "gemini-3-flash-preview",
            provider: (settings?.llmProvider as any) || "google"
        });

        const content = response.choices[0]?.message?.content;

        if (typeof content === 'string') {
            return content;
        } else if (Array.isArray(content)) {
            return content.map(c => c.type === 'text' ? c.text : '').join('\n');
        }

        return "Erro: Resposta vazia da IA.";

    } catch (error) {
        console.error("Erro ao executar prompt salvo:", error);
        throw new Error("Falha na execução do prompt.");
    }
}
