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
import { getModulePrompt } from "../prompts/modules"; // ✅ Módulos dinâmicos

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
  writingStyleContext: string;
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
    let writingStyleContext = "";

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
      }
    }

    // ============================================
    // BUSCA DE MEMÓRIA (TESES E ESTILO)
    // ============================================
    // Tenta usar assunto do processo, fallback para query do usuário
    const searchTerm = processId && processContext ? (await getProcessForContext(processId))?.subject || query : query;

    if (searchTerm) {
      // 1. Motor C - Argumentação (Teses Jurídicas)
      const legalTheses = await ragService.searchLegalTheses(
        searchTerm,
        userId,
        { limit: 3, threshold: 0.5 }
      );

      if (legalTheses.length > 0) {
        similarCasesContext = `\n\n## 📚 TESES DO GABINETE (Memória do Juiz Titular)\n\n**INSTRUÇÃO CRÍTICA:** As teses abaixo foram firmadas pelo juiz titular. Prioridade ABSOLUTA sobre jurisprudência externa.\n\n`;

        legalTheses.forEach((thesis, index) => {
          similarCasesContext += `### Tese ${index + 1} (Similaridade: ${(thesis.similarity * 100).toFixed(0)}%)\n`;
          similarCasesContext += `**Ratio Decidendi:** ${thesis.legalThesis}\n`;
          if (thesis.legalFoundations) similarCasesContext += `**Fundamentos:** ${thesis.legalFoundations}\n`;
          if (thesis.keywords) similarCasesContext += `**Palavras-chave:** ${thesis.keywords}\n`;
          similarCasesContext += `\n`;
        });
      }

      // 2. Motor B - Redação (Estilo)
      // Buscar estilo se o termo de busca for relevante (evitar em "oi", "ola")
      if (searchTerm.length > 3) {
        const writingStyles = await ragService.searchWritingStyle(
          searchTerm,
          userId,
          { limit: 2, threshold: 0.5 }
        );

        if (writingStyles.length > 0) {
          writingStyleContext = `\n\n## ✍️ PADRÃO DE REDAÇÃO DO GABINETE\n\n**INSTRUÇÃO:** Replique o estilo de escrita abaixo (tom, estrutura, formalidade).\n\n`;

          writingStyles.forEach((style, index) => {
            writingStyleContext += `### Amostra ${index + 1}\n${style.writingStyleSample}\n\n`;
            if (style.writingCharacteristics) {
              writingStyleContext += `**Características:**\n`;
              if (style.writingCharacteristics.formality) writingStyleContext += `- Formalidade: ${style.writingCharacteristics.formality}\n`;
              if (style.writingCharacteristics.tone) writingStyleContext += `- Tom: ${style.writingCharacteristics.tone}\n`;
            }
            writingStyleContext += `\n`;
          });
        }
      }
    }

    return {
      knowledgeBaseContext,
      processContext,
      processDocsContext,
      similarCasesContext,
      writingStyleContext,
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
    fileUri?: string | null, // Novo argumento opcional
    moduleSlug?: string // ✅ Módulo especializado ativo
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
    // Core (Universal) + Módulo (Dinâmico) + Orquestrador + Motores Ativos
    const modulePrompt = getModulePrompt((moduleSlug || 'default') as any); // ✅ Módulo dinâmico

    const baseSystemPrompt = `
${CORE_IDENTITY}
${CORE_TONE}
${CORE_GATEKEEPER}
${CORE_TRACEABILITY}
${CORE_ZERO_TOLERANCE}
${CORE_TRANSPARENCY}
${CORE_STYLE}
${CORE_THINKING}
${modulePrompt}
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

    // ⚡ VALIDAÇÃO TÉCNICA: Instruções imperativas quando há arquivo anexado
    const fileValidationInstruction = fileUri
      ? `\n\n⚡ ALERTA DE ARQUIVO DETECTADO ⚡
Há um arquivo anexado nesta conversa (URI: ${fileUri}).

VOCÊ DEVE EXECUTAR OBRIGATORIAMENTE:
1️⃣ IMEDIATAMENTE executar o CHECKPOINT 0 (Diagnóstico de Integridade)
2️⃣ Validar tecnicamente o arquivo ANTES de iniciar o <thinking>
3️⃣ Emitir o bloco de diagnóstico padronizado conforme especificado em CORE_GATEKEEPER
4️⃣ Se arquivo ilegível/corrompido (❌), PARAR e avisar o usuário

⛔ NÃO PROSSIGA com análise até validar o arquivo.
⚠️ O CHECKPOINT 0 VEM ANTES DO <thinking>. Esta ordem é INVIOLÁVEL.
`
      : "";

    const systemPrompt =
      baseSystemPrompt + stylePreferences + analysisInstruction + fileValidationInstruction;

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
    // 🔥 IMPORTANTE: Incluir similarCasesContext e writingStyleContext aqui!
    const fullSystemPrompt =
      systemPrompt +
      contexts.knowledgeBaseContext +
      contexts.processContext +
      contexts.processDocsContext +
      contexts.similarCasesContext +
      contexts.writingStyleContext; // Nova injeção de estilo

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
