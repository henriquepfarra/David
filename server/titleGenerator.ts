import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

/**
 * Gera um título descritivo para uma conversa baseado na primeira mensagem do usuário
 *
 * NOTA: Esta função usa a chave do sistema (ENV.geminiApiKey) pois é uma
 * feature auxiliar de baixo custo que melhora a UX.
 *
 * @param userMessage - Primeira mensagem do usuário
 * @param processInfo - Informações do processo (opcional)
 * @returns Título gerado (máximo 60 caracteres)
 */
export async function generateConversationTitle(
  userMessage: string,
  processInfo?: {
    processNumber?: string;
    subject?: string;
    plaintiff?: string;
    defendant?: string;
  }
): Promise<string> {
  try {
    const contextParts: string[] = [];
    
    if (processInfo?.processNumber) {
      contextParts.push(`Processo: ${processInfo.processNumber}`);
    }
    if (processInfo?.subject) {
      contextParts.push(`Assunto: ${processInfo.subject}`);
    }
    if (processInfo?.plaintiff && processInfo?.defendant) {
      contextParts.push(`Partes: ${processInfo.plaintiff} vs ${processInfo.defendant}`);
    }
    
    const context = contextParts.length > 0 
      ? `\n\nContexto do processo:\n${contextParts.join('\n')}`
      : '';

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Você é um assistente especializado em gerar títulos descritivos para conversas jurídicas.

REGRAS:
1. Gere um título curto e descritivo (máximo 60 caracteres)
2. Use linguagem profissional e objetiva
3. Capture a essência do pedido/assunto
4. Evite artigos desnecessários ("o", "a", "um", "uma")
5. Use formato: "[Tipo] - [Assunto Principal] - [Contexto]"

EXEMPLOS:
- "Análise Tutela - Gravame Santander"
- "Sentença Cobrança - INSS vs Silva"
- "Decisão Liminar - Busca e Apreensão"
- "Análise Contestação - Danos Morais"

Retorne APENAS o título, sem aspas ou explicações.`
        },
        {
          role: "user",
          content: `Mensagem do usuário: "${userMessage}"${context}`
        }
      ],
      apiKey: ENV.geminiApiKey, // Usa chave do sistema (feature grátis)
      response_format: {
        type: "text"
      }
    });

    const content = response.choices[0]?.message?.content;
    let title = typeof content === 'string' ? content.trim() : "Nova conversa";
    
    // Remove aspas se houver
    title = title.replace(/^["']|["']$/g, '');
    
    // Limita a 60 caracteres
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }
    
    return title;
    
  } catch (error) {
    console.error('[TitleGenerator] Erro ao gerar título:', error);
    // Fallback: usar primeiras palavras da mensagem
    const words = userMessage.split(' ').slice(0, 6).join(' ');
    return words.length > 60 ? words.substring(0, 57) + '...' : words;
  }
}
