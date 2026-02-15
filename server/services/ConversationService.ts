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
  getConversationModuleSlug,
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
  pdfExtractedText: string | null;
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
  fileUri?: string | null;  // Google File URI (PDF anexado)
  pdfExtractedText?: string | null;  // Texto extraído localmente via pdf.js
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
    const { content, conversationId, userId, processId, fileUri, pdfExtractedText } = params;

    // Verificar se é um comando (começa com /)
    if (!content.startsWith("/")) {
      return null;
    }

    console.log(`[ConversationService] Detectado comando: ${content} (processId: ${processId}, fileUri: ${fileUri ? 'presente' : 'null'})`);

    // 1️⃣ PRIMEIRO: Tentar comandos do sistema (CommandResolver)
    try {
      console.log('[ConversationService] Importando CommandResolver...')
      const { commandResolver } = await import("../commands/CommandResolver");

      // Get module from conversation or user default
      const moduleSlug = await getConversationModuleSlug(conversationId, userId);
      console.log(`[ConversationService] Module slug: ${moduleSlug}`);

      const plan = await commandResolver.resolve(content, {
        userId: String(userId),
        activeModule: moduleSlug as any,
      });

      console.log(`[ConversationService] Plan type: ${plan.type}, definition: ${plan.type === 'SYSTEM_COMMAND' ? plan.definition.slug : 'N/A'}`)

      if (plan.type === 'SYSTEM_COMMAND') {
        logger.info(
          `[ConversationService] Executando comando do sistema: /${plan.definition.slug}`
        );

        // NOTA: Não validamos requiresProcess aqui - deixamos o handler decidir
        // pois o handler pode usar fileUri ao invés de processId

        // Criar contexto para o handler
        const commandCtx = {
          userId: String(userId),
          conversationId: String(conversationId),
          processId: processId ? String(processId) : undefined,
          fileUri: fileUri || undefined,
          pdfExtractedText: pdfExtractedText || undefined,
          moduleSlug: moduleSlug as any,
          argument: plan.argument,
          history: [],
          signal: new AbortController().signal,
        };

        // Executar handler e coletar resultado
        // NOTA: Para sendMessage (não-streaming), coletamos todo o output
        let finalOutput = '';
        let thinkingOutput = '';

        for await (const event of plan.definition.handler(commandCtx)) {
          if (event.type === 'content_complete') {
            finalOutput = event.content;
            if ((event as any).thinking) {
              thinkingOutput = (event as any).thinking;
            }
          } else if (event.type === 'command_complete') {
            finalOutput = event.result.finalOutput;
            if (event.result.thinking) {
              thinkingOutput = event.result.thinking;
            }
          } else if (event.type === 'command_error') {
            return `❌ Erro: ${event.error}`;
          }
        }

        // Se NÃO capturamos thinking diretamente, tentar extrair das tags no conteúdo
        // (Prompt Injection: modelo gera <thinking>...</thinking> no texto)
        if (!thinkingOutput && finalOutput.includes('<thinking>')) {
          const thinkingMatch = finalOutput.match(/<thinking>([\s\S]*?)<\/thinking>/);
          if (thinkingMatch) {
            thinkingOutput = thinkingMatch[1].trim();
            // Remover as tags do conteúdo final
            finalOutput = finalOutput.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, '').trim();
          }
        }

        // ⚠️ IMPORTANTE: NÃO re-encapsular thinking nas tags!
        // O frontend processa thinking separadamente via MessageList.tsx
        // Se re-encapsulássemos, stripThinking() removeria tudo se finalOutput estiver vazio

        // Se finalOutput está vazio mas temos thinking, retornar fallback
        if (!finalOutput && thinkingOutput) {
          console.warn(`[ConversationService] finalOutput vazio mas thinking existe - resposta incompleta`);
          return '⚠️ O comando foi processado mas a resposta ficou incompleta. Por favor, tente novamente.';
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
      console.error(`[ConversationService] ERRO ao processar comando:`, error);
      if (error instanceof Error && error.name === 'CommandModuleError') {
        return `⚠️ ${error.message}`;
      }
      if (error instanceof Error && error.name === 'CommandArgumentError') {
        return `⚠️ ${error.message}`;
      }
      // ⚠️ Para outros erros em comandos do sistema, retornar mensagem de erro
      // ao invés de engolir e cair no fallback (LLM regular), porque:
      // 1. O comando foi reconhecido mas falhou durante execução
      // 2. O fallback para LLM regular também pode falhar
      // 3. O usuário deve saber que o comando falhou, não receber resposta vazia
      if (content.startsWith('/')) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`[ConversationService] Comando falhou com erro não tratado:`, errorMsg);
        return `❌ Erro ao executar comando: ${errorMsg}`;
      }
      // Log other errors but continue to fallback (only for non-commands)
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
