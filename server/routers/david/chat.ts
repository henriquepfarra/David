import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { logger } from "../../_core/logger";
import {
  getConversationById,
  updateConversationProcess,
  updateConversationTitle,
  getUserSettings,
} from "../../db";
import { IntentService } from "../../services/IntentService";
import { invokeLLM, invokeLLMStream, transcribeAudio, resolveApiKeyForProvider } from "../../_core/llm";
import { ENV } from "../../_core/env";

export const davidChatRouter = router({
  // Melhorar prompt com IA (usa chave do sistema - feature grátis de baixo custo)
  enhancePrompt: protectedProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Você é um especialista em Prompt Engineering otimizado para tarefas jurídicas. Sua missão é reescrever o prompt do usuário para torná-lo mais claro, estruturado e eficaz para uma LLM jurídica (DAVID). Mantenha a intenção original, mas adicione detalhes se necessário. Responda APENAS com o prompt melhorado, sem aspas e sem explicações."
          },
          { role: "user", content: input.prompt }
        ],
        apiKey: ENV.geminiApiKey, // Usa chave do sistema (feature grátis)
      });

      const content = typeof response.choices[0]?.message?.content === 'string'
        ? response.choices[0].message.content
        : input.prompt;

      return { content };
    }),

  // Transcrever áudio (Whisper)
  transcribeAudio: protectedProcedure
    .input(z.object({ audio: z.string() }))
    .mutation(async ({ input }) => {
      const text = await transcribeAudio(input.audio);
      return { text };
    }),

  // Enviar mensagem e receber resposta do DAVID
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string(),
        systemPromptOverride: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Importar services
      const { getConversationService } = await import("../../services/ConversationService");
      const { getMessageService } = await import("../../services/MessageService");
      const { getPromptBuilder } = await import("../../services/PromptBuilder");

      const conversationService = getConversationService();
      const messageService = getMessageService();
      const promptBuilder = getPromptBuilder();

      // 0. Buscar configurações do usuário
      const settings = await getUserSettings(ctx.user.id);

      // 1. Validar acesso à conversa
      const conversation = await conversationService.validateAccess({
        conversationId: input.conversationId,
        userId: ctx.user.id,
      });

      // 2. Salvar mensagem do usuário
      await messageService.saveUserMessage({
        conversationId: input.conversationId,
        content: input.content,
      });

      // 3. Tentar executar comando (se houver)
      const commandResult = await conversationService.tryExecuteCommand({
        content: input.content,
        conversationId: input.conversationId,
        userId: ctx.user.id,
        processId: conversation.processId,
        fileUri: conversation.googleFileUri,
      });

      if (commandResult) {
        // Salvar resposta do comando
        await messageService.saveAssistantMessage({
          conversationId: input.conversationId,
          content: commandResult,
        });
        return { content: commandResult };
      }

      // 4. Buscar histórico de mensagens
      const history = await messageService.getConversationHistory(
        input.conversationId
      );

      // 5. Ações da primeira mensagem (título em background)
      const isFirstMessage = history.length === 1;
      if (isFirstMessage) {
        await conversationService.handleFirstMessageActions({
          conversationId: input.conversationId,
          content: input.content,
          processId: conversation.processId,
        });
      }

      // 6. Construir contextos (RAG, processo, documentos, casos similares)
      const contexts = await promptBuilder.buildContexts({
        userId: ctx.user.id,
        query: input.content,
        processId: conversation.processId,
      });

      // 7. Construir system prompt e classificar intenção
      const { systemPrompt, intentResult } = await promptBuilder.buildSystemPrompt(
        input.content,
        conversation.processId,
        history.slice(-5).map(m => ({ role: m.role, content: m.content })),
        ctx.user.id,
        input.systemPromptOverride,
        conversation.googleFileUri,
        undefined // sendMessage não usa módulos (apenas sendMessageStream)
      );

      logger.info(`[DavidRouter] Intent: ${IntentService.formatDebugBadge(intentResult)}`);

      // 8. Montar mensagens para a LLM
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: systemPrompt +
            contexts.knowledgeBaseContext +
            contexts.processContext +
            contexts.processDocsContext +
            contexts.similarCasesContext
        },
      ];

      // Adicionar histórico (últimas 10 mensagens)
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          llmMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // 9. Invocar LLM
      const response = await invokeLLM({
        messages: llmMessages,
        apiKey: resolveApiKeyForProvider(settings?.llmProvider, settings?.llmApiKey),
        model: settings?.llmModel || "gemini-3-flash-preview",
        provider: settings?.llmProvider || "google",
      });

      const assistantMessage =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "Desculpe, não consegui gerar uma resposta.";

      // 10. Salvar resposta do assistente
      await messageService.saveAssistantMessage({
        conversationId: input.conversationId,
        content: assistantMessage,
      });

      return {
        content: assistantMessage,
      };
    }),

  // Enviar mensagem com streaming
  sendMessageStream: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string(),
        systemPromptOverride: z.string().optional(),
        moduleSlug: z.string().optional(),
      })
    )
    .subscription(async function* ({ ctx, input }) {
      // Importar services
      const { getConversationService } = await import("../../services/ConversationService");
      const { getMessageService } = await import("../../services/MessageService");
      const { getPromptBuilder } = await import("../../services/PromptBuilder");

      const conversationService = getConversationService();
      const messageService = getMessageService();
      const promptBuilder = getPromptBuilder();

      // 1. Validar acesso à conversa
      const conversation = await conversationService.validateAccess({
        conversationId: input.conversationId,
        userId: ctx.user.id,
      });

      // 2. Salvar mensagem do usuário
      await messageService.saveUserMessage({
        conversationId: input.conversationId,
        content: input.content,
      });

      // 3. Tentar executar comando (se houver)
      console.log(`[Stream] Verificando comando: "${input.content.substring(0, 30)}..." (fileUri: ${conversation.googleFileUri ? 'presente' : 'null'})`);
      const commandResult = await conversationService.tryExecuteCommand({
        content: input.content,
        conversationId: input.conversationId,
        userId: ctx.user.id,
        processId: conversation.processId,
        fileUri: conversation.googleFileUri,
      });
      console.log(`[Stream] tryExecuteCommand retornou: ${commandResult ? 'resultado' : 'null'}`);

      if (commandResult) {
        // Salvar resposta do comando
        await messageService.saveAssistantMessage({
          conversationId: input.conversationId,
          content: commandResult,
        });

        // Emular stream (envia tudo de uma vez por enquanto)
        yield { type: "chunk", content: commandResult };
        yield { type: "done", content: commandResult };
        return;
      }

      // 4. Buscar histórico de mensagens
      const history = await messageService.getConversationHistory(
        input.conversationId
      );

      // 5. Ações da primeira mensagem (título + metadata extraction)
      const isFirstMessage = history.length === 1;
      if (isFirstMessage) {
        // ⚡ LAZY LOADING: Extrair metadados de processo se houver PDF anexado
        if (conversation.googleFileUri && !conversation.processId) {
          console.log("[LazyMetadata] Primeira mensagem com PDF - extraindo metadados...");

          try {
            const { extractProcessMetadata } = await import("../../services/ProcessMetadataExtractor");
            const settings = await getUserSettings(ctx.user.id);

            // Extrair metadados do PDF
            const { readPdfWithVision } = await import("../../_core/fileApi");
            const pdfAnalysis = await readPdfWithVision(conversation.googleFileUri, {
              apiKey: settings?.readerApiKey || undefined,
              model: "gemini-2.0-flash-lite",
              instruction: `Leia apenas as PRIMEIRAS 2 PÁGINAS e extraia:
- Número do processo
- Nome das partes (autor/réu)
- Vara/Tribunal
- Assunto/Tipo da ação

Retorne APENAS essas informações de forma objetiva.`,
            });

            const metadata = await extractProcessMetadata(pdfAnalysis.content, settings?.llmApiKey || undefined);

            if (metadata.processNumber) {
              const { upsertProcessMetadata } = await import("../../db");
              const result = await upsertProcessMetadata(
                {
                  processNumber: metadata.processNumber,
                  plaintiff: metadata.plaintiff,
                  defendant: metadata.defendant,
                  court: metadata.court,
                  subject: metadata.subject,
                },
                ctx.user.id
              );

              // Vincular processo à conversa
              await updateConversationProcess(input.conversationId, result.processId);

              // Atualizar título da conversa
              await updateConversationTitle(input.conversationId, metadata.processNumber);

              // Atualizar referência local para uso posterior
              conversation.processId = result.processId;

              console.log(`[LazyMetadata] ✅ ${result.isNew ? 'Novo processo criado' : 'Processo atualizado'}: ${metadata.processNumber}`);
            }
          } catch (error) {
            console.error("[LazyMetadata] Erro ao extrair metadados:", error);
            // Não falha a resposta se extração falhar
          }
        }

        // Gerar título em background
        await conversationService.handleFirstMessageActions({
          conversationId: input.conversationId,
          content: input.content,
          processId: conversation.processId,
        });
      }

      // 6. Construir contextos (RAG, processo, documentos, casos similares)
      const contexts = await promptBuilder.buildContexts({
        userId: ctx.user.id,
        query: input.content,
        processId: conversation.processId,
      });

      // 7. Construir system prompt e classificar intenção
      logger.info(`[Stream-Module] Módulo ativo: ${input.moduleSlug || 'default'}`);
      const { systemPrompt, intentResult } = await promptBuilder.buildSystemPrompt(
        input.content,
        conversation.processId,
        history.slice(-5).map(m => ({ role: m.role, content: m.content })),
        ctx.user.id,
        input.systemPromptOverride,
        conversation.googleFileUri,
        input.moduleSlug
      );

      logger.info(`[DavidRouter] Intent (Stream): ${IntentService.formatDebugBadge(intentResult)}`);

      // 8. Montar mensagens para a LLM
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content: systemPrompt +
            contexts.knowledgeBaseContext +
            contexts.processContext +
            contexts.processDocsContext +
            contexts.similarCasesContext
        },
      ];

      // Adicionar histórico (últimas 10 mensagens)
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          llmMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // 9. Stream da resposta
      let fullResponse = "";
      try {
        for await (const chunk of invokeLLMStream({ messages: llmMessages })) {
          fullResponse += chunk;
          yield { type: "chunk" as const, content: chunk };
        }

        // 10. Salvar resposta completa do DAVID
        await messageService.saveAssistantMessage({
          conversationId: input.conversationId,
          content: fullResponse,
        });

        yield { type: "done" as const, content: fullResponse };
      } catch (error) {
        console.error("Stream error:", error);
        yield { type: "error" as const, content: "Erro ao gerar resposta" };
      }
    }),
});
