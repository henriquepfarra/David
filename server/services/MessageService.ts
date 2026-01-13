/**
 * MessageService
 *
 * Serviço responsável por operações relacionadas a mensagens:
 * - Salvar mensagens do usuário
 * - Salvar mensagens do assistente
 * - Buscar histórico de conversas
 */

import { createMessage, getConversationMessages } from "../db";

export interface SaveUserMessageParams {
  conversationId: number;
  content: string;
}

export interface SaveAssistantMessageParams {
  conversationId: number;
  content: string;
  thinking?: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string | null;
  createdAt: Date;
}

export class MessageService {
  /**
   * Salva uma mensagem do usuário no banco de dados
   */
  async saveUserMessage(params: SaveUserMessageParams): Promise<void> {
    const { conversationId, content } = params;

    if (!content || content.trim().length === 0) {
      throw new Error("Conteúdo da mensagem não pode estar vazio");
    }

    await createMessage({
      conversationId,
      role: "user",
      content,
    });
  }

  /**
   * Salva uma mensagem do assistente no banco de dados
   */
  async saveAssistantMessage(params: SaveAssistantMessageParams): Promise<void> {
    const { conversationId, content, thinking } = params;

    if (!content || content.trim().length === 0) {
      throw new Error("Conteúdo da mensagem não pode estar vazio");
    }

    await createMessage({
      conversationId,
      role: "assistant",
      content,
      thinking,
    });
  }

  /**
   * Busca o histórico de mensagens de uma conversa
   * @param conversationId ID da conversa
   * @param limit Número máximo de mensagens a retornar (padrão: todas)
   * @returns Lista de mensagens ordenadas por data de criação
   */
  async getConversationHistory(
    conversationId: number,
    limit?: number
  ): Promise<Message[]> {
    const messages = await getConversationMessages(conversationId);

    if (limit && limit > 0) {
      // Retornar as últimas N mensagens
      return messages.slice(-limit);
    }

    return messages;
  }
}

// Singleton instance
let messageServiceInstance: MessageService | null = null;

/**
 * Retorna a instância singleton do MessageService
 */
export function getMessageService(): MessageService {
  if (!messageServiceInstance) {
    messageServiceInstance = new MessageService();
  }
  return messageServiceInstance;
}
