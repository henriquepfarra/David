/**
 * PromptBuilder
 *
 * Serviço responsável por construir prompts e mensagens para a LLM:
 * - Montar system prompt com módulos Core + JEC + Motores
 * - Construir contextos (RAG, processo, documentos, casos similares)
 * - Montar array de mensagens para enviar à LLM
 */

import {
  getProcessForContext,
  getProcessDocuments,
  getUserSettings,
} from "../db";
import { getRagService } from "./RagService";
import { IntentService } from "./IntentService";
import { logger } from "../_core/logger";

// Imports dos prompts
import {
  CORE_IDENTITY,
  CORE_TONE,
  CORE_GATEKEEPER,
  CORE_TRACEABILITY,
  CORE_ZERO_TOLERANCE,
  CORE_TRANSPARENCY,
  CORE_STYLE,
  CORE_THINKING,
} from "../prompts/core";

import {
  CORE_ORCHESTRATOR,
  CORE_MOTOR_A,
  CORE_MOTOR_B,
  CORE_MOTOR_C,
  CORE_MOTOR_D,
} from "../prompts/engines";

import { JEC_CONTEXT } from "../modules/jec/context";

export interface BuildContextsParams {
  userId: number;
  query: string;
  processId: number | null;
}

export interface ContextsResult {
  knowledgeBaseContext: string;
  processContext: string;
  processDocsContext: string;
  similarCasesContext: string;
}

export interface BuildLLMMessagesParams {
  systemPromptOverride?: string;
  contexts: ContextsResult;
  conversationId: number;
  userQuery: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  processId?: number | null;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class PromptBuilder {
  /**
   * Constrói todos os contextos necessários (RAG, processo, documentos, casos similares)
   */
  async buildContexts(params: BuildContextsParams): Promise<ContextsResult> {
    const { userId, query, processId } = params;

    // Buscar documentos relevantes na Base de Conhecimento (RAG)
    const ragService = getRagService();
    const knowledgeBaseContext = await ragService.buildKnowledgeBaseContext(
      userId,
      query
    );

    let processContext = "";
    let similarCasesContext = "";
    let processDocsContext = "";

    if (processId) {
      const process = await getProcessForContext(processId);
      if (process) {
        // Montar contexto do processo
        processContext = `\n\n## PROCESSO SELECIONADO\n\n**Número:** ${process.processNumber}\n**Autor:** ${process.plaintiff}\n**Réu:** ${process.defendant}\n**Vara:** ${process.court}\n**Assunto:** ${process.subject}\n**Fatos:** ${process.facts}\n**Pedidos:** ${process.requests}\n**Status:** ${process.status}\n`;

        // Buscar documentos do processo
        try {
          logger.debug(
            `[PromptBuilder] Buscando documentos para processId=${processId}, userId=${userId}`
          );
          const processDocs = await getProcessDocuments(processId, userId);
          logger.debug(
            `[PromptBuilder] Encontrados ${processDocs.length} documentos`
          );

          if (processDocs.length > 0) {
            processDocsContext = `\n\n### DOCUMENTOS DO PROCESSO\n\n`;
            processDocs.forEach((doc: any) => {
              const contentPreview =
                doc.content.length > 2000
                  ? doc.content.substring(0, 2000) + "..."
                  : doc.content;
              processDocsContext += `**${doc.title}** (${doc.documentType})\n${contentPreview}\n\n`;
            });
            processDocsContext += `**INSTRUÇÃO:** Use o conteúdo dos documentos acima como referência para suas respostas. Eles contêm informações importantes do processo.\n`;
          }
        } catch (error) {
          logger.error("[PromptBuilder] Erro ao buscar documentos:", error);
        }

        // Buscar casos similares baseados no assunto
        if (process.subject) {
          // Buscar teses jurídicas (Motor C - Argumentação)
          const legalTheses = await ragService.searchLegalTheses(
            process.subject,
            userId,
            { limit: 3, threshold: 0.6 }
          );

          if (legalTheses.length > 0) {
            similarCasesContext = `\n\n## MEMÓRIA: CASOS SIMILARES JÁ DECIDIDOS POR VOCÊ\n\n`;
            similarCasesContext += `Encontrei ${legalTheses.length} decisões suas anteriores sobre temas relacionados. Use-as como referência:\n\n`;

            legalTheses.forEach((thesis, index) => {
              similarCasesContext += `### Precedente ${index + 1} (Similaridade: ${(thesis.similarity * 100).toFixed(0)}%)\n`;
              similarCasesContext += `**Tese Firmada:** ${thesis.legalThesis}\n`;
              if (thesis.legalFoundations) {
                similarCasesContext += `**Fundamentos:** ${thesis.legalFoundations}\n`;
              }
              if (thesis.keywords) {
                similarCasesContext += `**Palavras-chave:** ${thesis.keywords}\n`;
              }
              similarCasesContext += `\n`;
            });

            similarCasesContext += `\n**INSTRUÇÃO:** Ao gerar minutas, considere essas decisões anteriores para manter consistência e aplicar teses já firmadas. Se houver divergência, mencione ao usuário.\n`;
          }
        }
      }
    }

    return {
      knowledgeBaseContext,
      processContext,
      processDocsContext,
      similarCasesContext,
    };
  }

  /**
   * Constrói o system prompt completo com motores ativos
   */
  async buildSystemPrompt(
    userQuery: string,
    processId: number | null,
    history: Array<{ role: string; content: string }>,
    userId: number,
    systemPromptOverride?: string,
    fileUri?: string | null // Novo argumento opcional
  ): Promise<{ systemPrompt: string; intentResult: any }> {
    // Classificar intenção para selecionar motores
    const settings = await getUserSettings(userId);
    const intentResult = await IntentService.classify(
      userQuery,
      {
        processId: processId || undefined,
        fileUri: fileUri || undefined, // Passar fileUri para o contexto de classificação
        history: history.slice(-5).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
      settings?.llmApiKey || "fallback"
    );

    // Helper para ativar apenas motores selecionados
    const useMotor = (motor: string, prompt: string) =>
      intentResult.motors.includes(motor as any) ? prompt : "";

    logger.info(
      `[PromptBuilder] Intent: ${IntentService.formatDebugBadge(intentResult)}`
    );

    // MONTAGEM DINÂMICA DO CÉREBRO (Brain Assembly)
    // Core (Universal) + Módulo (JEC) + Orquestrador + Motores Ativos
    const baseSystemPrompt = `
${CORE_IDENTITY}
${CORE_TONE}
${CORE_GATEKEEPER}
${CORE_TRACEABILITY}
${CORE_ZERO_TOLERANCE}
${CORE_TRANSPARENCY}
${CORE_STYLE}
${CORE_THINKING}
${JEC_CONTEXT}
${CORE_ORCHESTRATOR}
${useMotor("A", CORE_MOTOR_A)}
${useMotor("B", CORE_MOTOR_B)}
${useMotor("C", CORE_MOTOR_C)}
${useMotor("D", CORE_MOTOR_D)}
`;

    // Preferências de Estilo do Gabinete (CONCATENA, não substitui)
    const stylePreferences = systemPromptOverride
      ? `\n[PREFERÊNCIAS DE ESTILO DO GABINETE]\n${systemPromptOverride}`
      : "";

    // Instrução explícita para análise (não gerar minuta)
    const analysisInstruction =
      intentResult.intent === "CASE_ANALYSIS"
        ? `\n\n⚠️ MODO ANÁLISE ATIVADO ⚠️\nEsta é uma solicitação de ANÁLISE, não de minuta. Execute os motores A, B, C, D para análise crítica completa, mas NÃO elabore documento final. Forneça apenas a análise estruturada conforme os protocolos. O bloco CORE_STYLE (Manual de Redação Judicial) permanece INATIVO durante análises.\n`
        : "";

    const systemPrompt =
      baseSystemPrompt + stylePreferences + analysisInstruction;

    return { systemPrompt, intentResult };
  }

  /**
   * Constrói o array de mensagens para enviar à LLM
   */
  async buildLLMMessages(
    params: BuildLLMMessagesParams
  ): Promise<LLMMessage[]> {
    const {
      systemPromptOverride,
      contexts,
      conversationId,
      userQuery,
      history,
      processId,
    } = params;

    // Construir system prompt
    const { systemPrompt } = await this.buildSystemPrompt(
      userQuery,
      processId || null,
      history,
      0, // userId será passado via contexto, aqui é apenas para intent
      systemPromptOverride
    );

    // Montar mensagem do sistema com todos os contextos
    const fullSystemPrompt =
      systemPrompt +
      contexts.knowledgeBaseContext +
      contexts.processContext +
      contexts.processDocsContext +
      contexts.similarCasesContext;

    const llmMessages: LLMMessage[] = [
      { role: "system", content: fullSystemPrompt },
    ];

    // Adicionar histórico (últimas 10 mensagens para não estourar contexto)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        llmMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return llmMessages;
  }
}

// Singleton instance
let promptBuilderInstance: PromptBuilder | null = null;

/**
 * Retorna a instância singleton do PromptBuilder
 */
export function getPromptBuilder(): PromptBuilder {
  if (!promptBuilderInstance) {
    promptBuilderInstance = new PromptBuilder();
  }
  return promptBuilderInstance;
}
