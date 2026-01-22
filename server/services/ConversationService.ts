/**
 * ConversationService
 *
 * Serviço responsável por operações relacionadas a conversas:
 * - Validar acesso do usuário à conversa
 * - Executar comandos especiais (ex: /analise)
 * - Lidar com ações da primeira mensagem (geração de título)
 */

import {
  getConversationById,
  getProcessForContext,
  updateConversationTitle,
} from "../db";
import { executeSavedPrompt } from "../_core/promptExecutor";
import { generateConversationTitle } from "../titleGenerator";
import { logger } from "../_core/logger";

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  processId: number | null;
  isPinned: number;
  googleFileUri: string | null;
  googleFileName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidateAccessParams {
  conversationId: number;
  userId: number;
}

export interface TryExecuteCommandParams {
  content: string;
  conversationId: number;
  userId: number;
  processId: number | null;
}

export interface HandleFirstMessageParams {
  conversationId: number;
  content: string;
  processId: number | null;
}

export class ConversationService {
  /**
   * Valida se o usuário tem acesso à conversa
   * @throws Error se conversa não existir ou não pertencer ao usuário
   */
  async validateAccess(params: ValidateAccessParams): Promise<Conversation> {
    const { conversationId, userId } = params;

    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      throw new Error("Conversa não encontrada");
    }

    if (conversation.userId !== userId) {
      throw new Error("Você não tem permissão para acessar esta conversa");
    }

    return conversation as Conversation;
  }

  /**
   * Tenta executar um comando especial (ex: /analise, /consultar)
   * 
   * Prioridade:
   * 1. Comandos do Sistema (CommandResolver) - /consultar, /analise1, etc.
   * 2. Prompts Salvos do Usuário
   * 
   * @returns O resultado do comando se executado com sucesso, null caso contrário
   */
  async tryExecuteCommand(
    params: TryExecuteCommandParams
  ): Promise<string | null> {
    const { content, conversationId, userId, processId } = params;

    // Verificar se é um comando (começa com /)
    if (!content.startsWith("/")) {
      return null;
    }

    logger.debug(
      `[ConversationService] Detectado comando: ${content}`
    );

    // 1️⃣ PRIMEIRO: Tentar comandos do sistema (CommandResolver)
    try {
      const { commandResolver } = await import("../commands/CommandResolver");

      // Determinar módulo ativo (default se não houver configuração)
      const moduleSlug = 'default'; // TODO: Get from conversation settings

      const plan = await commandResolver.resolve(content, {
        userId: String(userId),
        activeModule: moduleSlug as any,
      });

      if (plan.type === 'SYSTEM_COMMAND') {
        logger.info(
          `[ConversationService] Executando comando do sistema: /${plan.definition.slug}`
        );

        // Validar requisitos do comando
        if (plan.definition.requiresProcess && !processId) {
          return `⚠️ O comando /${plan.definition.slug} requer um processo vinculado à conversa.\n\nVincule um processo primeiro ou faça upload de um PDF.`;
        }

        // Criar contexto para o handler
        const commandCtx = {
          userId: String(userId),
          conversationId: String(conversationId),
          processId: processId ? String(processId) : undefined,
          moduleSlug: moduleSlug as any,
          argument: plan.argument,
          history: [], // TODO: Load conversation history if needed
          signal: new AbortController().signal,
        };

        // Executar handler e coletar resultado
        // NOTA: Para sendMessage (não-streaming), coletamos todo o output
        let finalOutput = '';

        for await (const event of plan.definition.handler(commandCtx)) {
          if (event.type === 'content_complete') {
            finalOutput = event.content;
          } else if (event.type === 'command_complete') {
            finalOutput = event.result.finalOutput;
          } else if (event.type === 'command_error') {
            return `❌ Erro: ${event.error}`;
          }
        }

        return finalOutput || null;
      }

      if (plan.type === 'SAVED_PROMPT') {
        // Prompt salvo do usuário encontrado via resolver
        logger.debug(
          `[ConversationService] Prompt salvo encontrado via resolver`
        );
        return plan.content;
      }

    } catch (error) {
      // CommandResolver errors (like module not supported)
      if (error instanceof Error && error.name === 'CommandModuleError') {
        return `⚠️ ${error.message}`;
      }
      if (error instanceof Error && error.name === 'CommandArgumentError') {
        return `⚠️ ${error.message}`;
      }
      // Log other errors but continue to fallback
      logger.debug(
        `[ConversationService] CommandResolver error, trying saved prompts:`,
        error
      );
    }

    // 2️⃣ SEGUNDO: Fallback para prompt salvo (método legado)
    if (!processId) {
      logger.debug(
        `[ConversationService] Comando ${content} não é sistema e conversa não tem processo vinculado`
      );
      return null;
    }

    // Buscar dados do processo
    const process = await getProcessForContext(processId);
    if (!process) {
      logger.debug(
        `[ConversationService] Processo ${processId} não encontrado`
      );
      return null;
    }

    // Tentar executar prompt salvo
    logger.debug(
      `[ConversationService] Tentando executar prompt salvo: ${content}`
    );

    try {
      const commandResult = await executeSavedPrompt({
        userId,
        promptCommand: content,
        processId,
        processNumber: process.processNumber,
      });

      if (commandResult) {
        logger.debug(
          `[ConversationService] Prompt salvo executado com sucesso: ${content}`
        );
        return commandResult;
      }

      logger.debug(
        `[ConversationService] Nenhum prompt encontrado para: ${content}`
      );
      return null;
    } catch (error) {
      logger.error(`[ConversationService] Erro ao executar comando:`, error);
      return null;
    }
  }

  /**
   * Executa ações necessárias quando a primeira mensagem é enviada
   * - Gera título automático baseado no conteúdo ou processo
   */
  async handleFirstMessageActions(
    params: HandleFirstMessageParams
  ): Promise<void> {
    const { conversationId, content, processId } = params;

    // Buscar informações do processo se houver
    let processInfo;
    if (processId) {
      const process = await getProcessForContext(processId);
      if (process) {
        processInfo = {
          processNumber: process.processNumber || undefined,
          subject: process.subject || undefined,
          plaintiff: process.plaintiff || undefined,
          defendant: process.defendant || undefined,
        };
      }
    }

    // Gerar título em background (não bloqueia resposta)
    generateConversationTitle(content, processInfo)
      .then(async (title) => {
        await updateConversationTitle(conversationId, title);
        logger.info(
          `[ConversationService] Título gerado automaticamente: "${title}"`
        );
      })
      .catch((error) => {
        logger.error(
          "[ConversationService] Erro ao gerar título:",
          error
        );
      });
  }
}

// Singleton instance
let conversationServiceInstance: ConversationService | null = null;

/**
 * Retorna a instância singleton do ConversationService
 */
export function getConversationService(): ConversationService {
  if (!conversationServiceInstance) {
    conversationServiceInstance = new ConversationService();
  }
  return conversationServiceInstance;
}
