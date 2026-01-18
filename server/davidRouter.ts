import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { logger } from "./_core/logger";
import {
  createConversation,
  getUserConversations,
  getConversationById,
  updateConversationProcess,
  updateConversationTitle,
  updateConversationGoogleFile,
  getConversationGoogleFile,
  deleteConversation,
  toggleConversationPin,
  createMessage,
  getConversationMessages,
  createSavedPrompt,
  getUserSavedPrompts,
  getSavedPromptsPaginated,
  getSavedPromptById,
  updateSavedPrompt,
  deleteSavedPrompt,
  getUniqueCategories,
  getProcessForContext,
  getDavidConfig,
  upsertDavidConfig,
  createApprovedDraft,
  getUserApprovedDrafts,
  getApprovedDraftById,
  updateApprovedDraft,
  deleteApprovedDraft,
  createLearnedThesis,
  getUserLearnedTheses,
  getLearnedThesisByDraftId,
  updateLearnedThesis,
  deleteLearnedThesis,
  searchSimilarTheses,
  getProcessDocuments,
  findConversationsByProcessNumber,
  getUserSettings,
} from "./db";
import { IntentService } from "./services/IntentService";
import { invokeLLM, invokeLLMStream, transcribeAudio } from "./_core/llm";
import { observable } from "@trpc/server/observable";
import { extractThesisFromDraft } from "./thesisExtractor";
import { generateConversationTitle } from "./titleGenerator";

// System prompt padrão do DAVID (mantido para fallback em config.get)
import { DEFAULT_DAVID_SYSTEM_PROMPT } from "@shared/defaultPrompts";
import { executeSavedPrompt } from "./_core/promptExecutor";

// Core do DAVID (Identidade + Estilo + Segurança - Universal)
import {
  CORE_IDENTITY,
  CORE_TONE,
  CORE_GATEKEEPER,
  CORE_TRACEABILITY,
  CORE_ZERO_TOLERANCE,
  CORE_TRANSPARENCY,
  CORE_STYLE
} from "./prompts/core";
// Orquestrador + Motores
import {
  CORE_ORCHESTRATOR,
  CORE_MOTOR_A,
  CORE_MOTOR_B,
  CORE_MOTOR_C,
  CORE_MOTOR_D
} from "./prompts/engines";
// Módulo específico (Cartucho JEC)
import { JEC_CONTEXT } from "./modules/jec/context";
import { getRagService } from "./services/RagService";

export const davidRouter = router({
  // Criar nova conversa
  createConversation: protectedProcedure
    .input(
      z.object({
        processId: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const title = input.title || "Nova conversa";
      const conversationId = await createConversation({
        userId: ctx.user.id,
        processId: input.processId,
        title,
      });
      return { id: conversationId, title };
    }),

  // Melhorar prompt com IA
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
      });

      const content = typeof response.choices[0]?.message?.content === 'string'
        ? response.choices[0].message.content
        : input.prompt;

      return { content };
    }),

  // 🔧 ADMIN: Rodar migration (TEMPORÁRIO - remover após uso)
  runMigration: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Apenas admin
      if (ctx.user.role !== 'admin') {
        throw new Error("Apenas admins podem rodar migrations");
      }

      const { getDb } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = [];

      try {
        // 1. Add lastActivityAt column
        await db.execute(sql`
          ALTER TABLE processes 
          ADD COLUMN lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          AFTER updatedAt
        `);
        results.push("✓ Added lastActivityAt column");
      } catch (error: any) {
        if (error.message?.includes('Duplicate column')) {
          results.push("⚠ Column lastActivityAt already exists");
        } else {
          results.push(`❌ Failed to add column: ${error.message}`);
          throw error;
        }
      }

      try {
        // 2. Create index for duplicate detection
        await db.execute(sql`
          CREATE INDEX idx_process_number_user 
          ON processes(userId, processNumber(50))
        `);
        results.push("✓ Created index idx_process_number_user");
      } catch (error: any) {
        if (error.message?.includes('Duplicate key name')) {
          results.push("⚠ Index idx_process_number_user already exists");
        } else {
          results.push(`⚠ Index creation skipped: ${error.message}`);
        }
      }

      try {
        // 3. Create index for activity timeline
        await db.execute(sql`
          CREATE INDEX idx_process_last_activity 
          ON processes(userId, lastActivityAt DESC)
        `);
        results.push("✓ Created index idx_process_last_activity");
      } catch (error: any) {
        if (error.message?.includes('Duplicate key name')) {
          results.push("⚠ Index idx_process_last_activity already exists");
        } else {
          results.push(`⚠ Index creation skipped: ${error.message}`);
        }
      }

      return { success: true, results };
    }),


  // Transcrever áudio (Whisper)
  transcribeAudio: protectedProcedure
    .input(z.object({ audio: z.string() }))
    .mutation(async ({ input }) => {
      const text = await transcribeAudio(input.audio);
      return { text };
    }),

  // Listar conversas do usuário
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserConversations(ctx.user.id);
  }),

  // Obter conversa específica com mensagens
  getConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.id);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      const messages = await getConversationMessages(input.id);

      // Se houver processo associado, buscar dados
      let processData = null;
      if (conversation.processId) {
        processData = await getProcessForContext(conversation.processId);
      }

      return {
        conversation,
        messages,
        processData,
      };
    }),

  // Atualizar processo da conversa
  updateConversationProcess: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        processId: z.number().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await updateConversationProcess(input.conversationId, input.processId);
      return { success: true };
    }),

  // Renomear conversa
  renameConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        title: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await updateConversationTitle(input.conversationId, input.title);
      return { success: true };
    }),

  // Gerar título automático da conversa
  generateTitle: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      // Se tem processo vinculado, usar número do processo
      if (conversation.processId) {
        const process = await getProcessForContext(conversation.processId);
        if (process?.processNumber) {
          await updateConversationTitle(input.conversationId, `Processo ${process.processNumber}`);
          return { title: `Processo ${process.processNumber}`, source: "process" };
        }
      }

      // Senão, gerar título com IA baseado nas mensagens
      const messages = await getConversationMessages(input.conversationId);
      if (messages.length === 0) {
        return { title: "Nova conversa", source: "default" };
      }

      // Pegar primeira mensagem do usuário para contexto
      const firstUserMessage = messages.find(m => m.role === "user");
      if (!firstUserMessage) {
        return { title: "Nova conversa", source: "default" };
      }

      // Buscar configurações de LLM do usuário
      const settings = await getUserSettings(ctx.user.id);
      if (!settings?.llmApiKey) {
        // Sem API key, usar primeiras palavras
        const words = firstUserMessage.content.split(" ").slice(0, 5).join(" ");
        await updateConversationTitle(input.conversationId, words.length > 50 ? words.substring(0, 47) + "..." : words);
        return { title: words, source: "truncate" };
      }

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Você é um gerador de títulos. Gere um título curto (máximo 5 palavras) para esta conversa jurídica. Responda APENAS com o título, sem aspas, sem explicações."
            },
            { role: "user", content: firstUserMessage.content.substring(0, 500) }
          ],
          apiKey: settings.llmApiKey,
          model: settings.llmModel || undefined,
          provider: settings.llmProvider || undefined
        });

        const title = typeof response.choices[0]?.message?.content === 'string'
          ? response.choices[0].message.content.trim().substring(0, 100)
          : "Nova conversa";

        await updateConversationTitle(input.conversationId, title);
        return { title, source: "ai" };
      } catch (error) {
        console.error("[generateTitle] Erro ao gerar título:", error);
        const words = firstUserMessage.content.split(" ").slice(0, 5).join(" ");
        await updateConversationTitle(input.conversationId, words.length > 50 ? words.substring(0, 47) + "..." : words);
        return { title: words, source: "fallback" };
      }
    }),

  // Deletar conversa
  deleteConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.id);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await deleteConversation(input.id);
      return { success: true };
    }),

  // Deletar conversa se estiver vazia (chamado ao sair)
  cleanupIfEmpty: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        return { deleted: false, reason: "not_found_or_unauthorized" };
      }

      const messages = await getConversationMessages(input.conversationId);
      if (messages.length === 0) {
        await deleteConversation(input.conversationId);
        return { deleted: true };
      }
      return { deleted: false, reason: "has_messages" };
    }),

  // Fixar/desafixar conversa
  togglePin: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.id);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await toggleConversationPin(input.id);
      return { success: true };
    }),

  // Deletar múltiplas conversas
  deleteMultiple: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      // Verificar se todas as conversas pertencem ao usuário
      for (const id of input.ids) {
        const conversation = await getConversationById(id);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error(`Conversa ${id} não encontrada ou não pertence ao usuário`);
        }
      }

      // Deletar todas as conversas
      for (const id of input.ids) {
        await deleteConversation(id);
      }

      return { success: true, deletedCount: input.ids.length };
    }),

  // Atualizar referência do arquivo Google na conversa
  updateGoogleFile: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        googleFileUri: z.string().nullable(),
        googleFileName: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await updateConversationGoogleFile(
        input.conversationId,
        input.googleFileUri,
        input.googleFileName
      );
      return { success: true };
    }),

  // Limpar arquivo Google da conversa (chamado ao sair)
  cleanupGoogleFile: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      const googleFile = await getConversationGoogleFile(input.conversationId);

      if (googleFile?.googleFileName) {
        // Importar e chamar função de delete do Google
        try {
          const { deleteFileFromGoogle } = await import("./_core/fileApi");
          await deleteFileFromGoogle(googleFile.googleFileName);
          logger.info(`[Cleanup] Arquivo ${googleFile.googleFileName} deletado do Google`);
        } catch (error) {
          console.error("[Cleanup] Erro ao deletar arquivo do Google:", error);
        }
      }

      // Limpar referências no banco
      await updateConversationGoogleFile(input.conversationId, null, null);
      return { success: true };
    }),

  // Verificar se processo já existe em outra conversa
  checkDuplicateProcess: protectedProcedure
    .input(
      z.object({
        processNumber: z.string(),
        excludeConversationId: z.number().optional(), // Excluir a conversa atual da busca
      })
    )
    .query(async ({ ctx, input }) => {
      const existingConversations = await findConversationsByProcessNumber(
        ctx.user.id,
        input.processNumber
      );

      // Filtrar a conversa atual se fornecida
      const filtered = input.excludeConversationId
        ? existingConversations.filter(c => c.conversationId !== input.excludeConversationId)
        : existingConversations;

      if (filtered.length > 0) {
        return {
          isDuplicate: true,
          existingConversations: filtered.map(c => ({
            id: c.conversationId,
            title: c.conversationTitle,
          })),
        };
      }

      return { isDuplicate: false, existingConversations: [] };
    }),

  // Enviar mensagem e receber resposta do DAVID
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string(),
        systemPromptOverride: z.string().optional(), // Prompt especializado opcional
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Importar services
      const { getConversationService } = await import("./services/ConversationService");
      const { getMessageService } = await import("./services/MessageService");
      const { getPromptBuilder } = await import("./services/PromptBuilder");

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
      const commandResult = await conversationService.tryExecuteCommand({
        content: input.content,
        conversationId: input.conversationId,
        userId: ctx.user.id,
        processId: conversation.processId,
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
        conversation.googleFileUri // Passar fileUri para classificação de intento correta
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
      })
    )
    .subscription(async function* ({ ctx, input }) {
      // Importar services
      const { getConversationService } = await import("./services/ConversationService");
      const { getMessageService } = await import("./services/MessageService");
      const { getPromptBuilder } = await import("./services/PromptBuilder");

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
      const commandResult = await conversationService.tryExecuteCommand({
        content: input.content,
        conversationId: input.conversationId,
        userId: ctx.user.id,
        processId: conversation.processId,
      });

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
            const { extractProcessMetadata } = await import("./services/ProcessMetadataExtractor");
            const settings = await getUserSettings(ctx.user.id);

            // Extrair metadados do PDF
            const { readPdfWithVision } = await import("./_core/fileApi");
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
              const { upsertProcessMetadata } = await import("./db");
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
      const { systemPrompt, intentResult } = await promptBuilder.buildSystemPrompt(
        input.content,
        conversation.processId,
        history.slice(-5).map(m => ({ role: m.role, content: m.content })),
        ctx.user.id,
        input.systemPromptOverride,
        conversation.googleFileUri // Passar fileUri para classificação de intento correta
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

  // Coleções de Prompts
  promptCollections: router({
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { createPromptCollection } = await import("./db");
        const id = await createPromptCollection({
          userId: ctx.user.id,
          name: input.name,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserPromptCollections } = await import("./db");
      return await getUserPromptCollections(ctx.user.id);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deletePromptCollection } = await import("./db");
        await deletePromptCollection(input.id);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(100) }))
      .mutation(async ({ input }) => {
        const { updatePromptCollection } = await import("./db");
        await updatePromptCollection(input.id, input.name);
        return { success: true };
      }),
  }),

  // Prompts salvos
  savedPrompts: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          collectionId: z.number().optional().nullable(),
          category: z.string().optional(), // DEPRECATED
          content: z.string(),
          description: z.string().optional(),
          executionMode: z.enum(["chat", "full_context"]).optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createSavedPrompt({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          collectionId: input.collectionId ?? undefined,
          category: input.category,
          description: input.description,
          executionMode: input.executionMode || "chat",
          tags: input.tags,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserSavedPrompts(ctx.user.id);
    }),

    getCategoryStats: protectedProcedure.query(async ({ ctx }) => {
      return await getUniqueCategories(ctx.user.id);
    }),

    listPaginated: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().optional(), // ID do último item
        search: z.string().optional(),
        category: z.string().nullable().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await getSavedPromptsPaginated({
          userId: ctx.user.id,
          ...input,
        });
      }),

    seedDefaultTutela: protectedProcedure.mutation(async ({ ctx }) => {
      // Verifica se já existe
      const existing = await getUserSavedPrompts(ctx.user.id);
      const hasTutela = existing.some((p) => p.category === "tutela" && p.isDefault === 1);

      if (hasTutela) {
        return { success: false, message: "Prompt padrão já existe" };
      }

      const TUTELA_PROMPT = `Analise criticamente o processo e documentos anexos para avaliar a viabilidade do pedido de tutela de urgência, com base no Art. 300 do CPC. Considere:

Fontes de Fundamentação (Ordem Hierárquica):

1. Parâmetros definidos em conversas anteriores desta sessão.
2. Arquivos da base de conhecimento (use RAG para extrair dados específicos, como cláusulas contratuais ou provas documentais).
3. Conhecimento jurídico consolidado e raciocínio crítico.
4. Jurisprudência do TJSP e STJ sobre o tema (apenas quando necessário; forneça perfis de busca, ex.: "precedentes do STJ sobre tutela em contratos consumeristas de 2020-2025", sem citar casos inventados).

Estrutura da Análise:

**Contextualização Inicial**

- Síntese dos fatos relevantes (máximo 150 palavras, focando em elementos chave como partes, controvérsia e provas iniciais).
- Pedido de tutela formulado (descreva o objeto específico da liminar e os efeitos pretendidos).
- Rito processual: Confirme compatibilidade com o Juizado Especial Cível (verifique ausência de complexidade probatória ou necessidade de perícia).

**Análise dos Requisitos Cumulativos (Art. 300, CPC)**

A) Probabilidade do Direito (Fumus Boni Iuris)

- A narrativa fática e provas iniciais demonstram plausibilidade jurídica? Avalie robustez dos documentos para cognição sumária.
- Há fundamento legal claro (cite artigos relevantes, ex.: CDC Art. 6º para direitos consumeristas)?
- Classificação: ☐ Forte (ex.: provas irrefutáveis) ☐ Moderada (ex.: indícios consistentes) ☐ Fraca (ex.: alegações genéricas) ☐ Ausente. Justificativa obrigatória.

B) Perigo de Dano ou Risco ao Resultado Útil (Periculum in Mora)

- Demonstração concreta de dano irreparável ou de difícil reparação se houver demora?
- Urgência é evidente, específica e temporal (ex.: risco iminente de perda financeira comprovada por extratos)?
- Classificação: ☐ Demonstrado (ex.: elementos objetivos claros) ☐ Parcialmente demonstrado (ex.: indícios, mas genéricos) ☐ Não demonstrado. Justificativa obrigatória.

C) Reversibilidade da Medida

- A tutela é reversível em caso de improcedência final? Avalie risco de lesão grave à parte contrária (ex.: impactos financeiros mensuráveis).
- Avaliação: ☐ Reversível (ex.: medida cautelar simples) ☐ Parcialmente reversível (ex.: com caução possível) ☐ Irreversível. Justificativa obrigatória.

**Parecer Conclusivo**

Baseado na análise cumulativa:
- ☐ Deferimento Recomendado: Fundamentos (presença de fumus boni iuris e periculum in mora); sugestão de jurisprudência (ex.: perfil de busca no STJ).
- ☐ Indeferimento Recomendado: Requisito(s) não preenchido(s); justificativa técnica (ex.: "ausente periculum in mora, pois dano é reparável por perdas e danos").
- ☐ Postergação da Análise: Justificativa (ex.: necessidade de contraditório); diligências sugeridas (ex.: citação prévia ou produção de prova mínima).

**Observações Complementares**

- Pontos de atenção processual (ex.: prazos para recurso).
- Riscos jurídicos identificados (ex.: possibilidade de multa por litigância de má-fé).
- Sugestões de reforço argumentativo (ex.: anexar mais provas para fortalecer fumus boni iuris).

Diretrizes de Execução:

- **Objetividade**: Análise técnica, direta e fundamentada em fatos reais (nunca invente jurisprudência ou dados).
- **Criticidade**: Avalie realisticamente pontos fortes e fracos, com exemplos concretos.
- **Pragmatismo**: Foque na viabilidade prática da concessão, considerando o contexto judicial.
- **Fundamentação**: Cite dispositivos legais e perfis de jurisprudência relevantes.
- **Clareza**: Linguagem jurídica precisa, acessível e concisa; use RAG para consultas específicas em documentos.`;

      const id = await createSavedPrompt({
        userId: ctx.user.id,
        title: "Análise de Tutela de Urgência (Art. 300 CPC)",
        category: "tutela",
        content: TUTELA_PROMPT,
        description: "Análise criteriosa de viabilidade de tutela de urgência com base no Art. 300 do CPC, avaliando fumus boni iuris, periculum in mora e reversibilidade.",
        isDefault: 1,
      });

      return { success: true, id };
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const prompt = await getSavedPromptById(input.id);
        if (!prompt || prompt.userId !== ctx.user.id) {
          throw new Error("Prompt não encontrado");
        }
        return prompt;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          collectionId: z.number().nullable().optional(),
          category: z.string().nullable().optional(), // DEPRECATED
          content: z.string().optional(),
          description: z.string().optional(),
          executionMode: z.enum(["chat", "full_context"]).optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const prompt = await getSavedPromptById(id);
        if (!prompt || prompt.userId !== ctx.user.id) {
          throw new Error("Prompt não encontrado");
        }

        await updateSavedPrompt(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const prompt = await getSavedPromptById(input.id);
        if (!prompt || prompt.userId !== ctx.user.id) {
          throw new Error("Prompt não encontrado");
        }

        await deleteSavedPrompt(input.id);
        return { success: true };
      }),

    applyToConversation: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          promptId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const prompt = await getSavedPromptById(input.promptId);
        if (!prompt || prompt.userId !== ctx.user.id) {
          throw new Error("Prompt não encontrado");
        }

        // Adicionar mensagem do usuário com o conteúdo do prompt
        const messageId = await createMessage({
          conversationId: input.conversationId,
          role: "user",
          content: prompt.content,
        });

        return { success: true, messageId };
      }),
  }),

  // Minutas Aprovadas (Aprendizado)
  approvedDrafts: router({
    create: protectedProcedure
      .input(
        z.object({
          processId: z.number().optional(),
          conversationId: z.number().optional(),
          messageId: z.number().optional(),
          originalDraft: z.string(),
          editedDraft: z.string().optional(),
          draftType: z.enum(["sentenca", "decisao", "despacho", "acordao", "outro"]),
          approvalStatus: z.enum(["approved", "edited_approved", "rejected"]),
          userNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Salvar minuta aprovada
        const draftId = await createApprovedDraft({
          userId: ctx.user.id,
          ...input,
        });

        // ✨ ACTIVE LEARNING v2.0: Trigger de extração com Quality Gate
        if (input.approvalStatus !== "rejected") {
          // Chamar ThesisLearningService em background (não bloqueia resposta)
          const { getThesisLearningService } = await import("./services/ThesisLearningService");
          getThesisLearningService()
            .processApprovedDraft(draftId)
            .then(() => {
              console.log(`[ActiveLearning] Tese extraída com sucesso para draft #${draftId}`);
            })
            .catch((error) => {
              console.error(`[ActiveLearning] Erro ao extrair tese do draft #${draftId}:`, error);
            });
        }

        return { id: draftId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserApprovedDrafts(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const draft = await getApprovedDraftById(input.id);
        if (!draft || draft.userId !== ctx.user.id) {
          throw new Error("Minuta não encontrada");
        }
        return draft;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          editedDraft: z.string().optional(),
          userNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const draft = await getApprovedDraftById(id);
        if (!draft || draft.userId !== ctx.user.id) {
          throw new Error("Minuta não encontrada");
        }

        await updateApprovedDraft(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const draft = await getApprovedDraftById(input.id);
        if (!draft || draft.userId !== ctx.user.id) {
          throw new Error("Minuta não encontrada");
        }

        await deleteApprovedDraft(input.id);
        return { success: true };
      }),
  }),

  // Teses Aprendidas
  learnedTheses: router({
    create: protectedProcedure
      .input(
        z.object({
          approvedDraftId: z.number(),
          processId: z.number().optional(),
          thesis: z.string(),
          legalFoundations: z.string().optional(),
          keywords: z.string().optional(),
          decisionPattern: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createLearnedThesis({
          userId: ctx.user.id,
          legalThesis: input.thesis,
          approvedDraftId: input.approvedDraftId,
          processId: input.processId,
          legalFoundations: input.legalFoundations,
          keywords: input.keywords,
          decisionPattern: input.decisionPattern,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserLearnedTheses(ctx.user.id);
    }),

    searchSimilar: protectedProcedure
      .input(z.object({ keywords: z.array(z.string()) }))
      .query(async ({ ctx, input }) => {
        return await searchSimilarTheses(ctx.user.id, input.keywords);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          thesis: z.string().optional(),
          legalFoundations: z.string().optional(),
          keywords: z.string().optional(),
          decisionPattern: z.string().optional(),
          isObsolete: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateLearnedThesis(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteLearnedThesis(input.id);
        return { success: true };
      }),
  }),

  // Configurações do DAVID
  config: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const config = await getDavidConfig(ctx.user.id);
      return {
        systemPrompt: config?.systemPrompt || DEFAULT_DAVID_SYSTEM_PROMPT,
      };
    }),

    save: protectedProcedure
      .input(
        z.object({
          systemPrompt: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertDavidConfig(ctx.user.id, input.systemPrompt);
        return { success: true };
      }),
  }),
});
