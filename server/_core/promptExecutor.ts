import { db } from "../db";
import { savedPrompts, userSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getProcessContext } from "./processContext";
import { invokeLLM } from "./llm";

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
    // Substituir variáveis se houver (futuro), por enquanto concatena
    const finalSystemPrompt = `Você é um assistente jurídico avançado.
CONTEXTO DO PROCESSO:
${context}

Sua tarefa é executar rigorosamente o seguinte protocolo de análise:
${matchedPrompt.content}`;

    // 4. Invocar LLM
    // Buscar config de API do usuário
    const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, input.userId)
    });

    try {
        const response = await invokeLLM({
            messages: [{ role: "system", content: finalSystemPrompt }],
            apiKey: settings?.llmApiKey || undefined,
            model: settings?.llmModel || undefined,
            provider: (settings?.llmProvider as any) || undefined
        });

        return response.choices[0]?.message?.content || "Erro: Resposta vazia da IA.";

    } catch (error) {
        console.error("Erro ao executar prompt salvo:", error);
        throw new Error("Falha na execução do prompt.");
    }
}
