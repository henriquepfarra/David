import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import {
  createConversation,
  getUserConversations,
  getConversationById,
  updateConversationProcess,
  updateConversationTitle,
  deleteConversation,
  toggleConversationPin,
  getConversationMessages,
  getProcessForContext,
  getUserSettings,
  findConversationsByProcessNumber,
} from "../../db";
import { invokeLLM, resolveApiKeyForProvider } from "../../_core/llm";

export const davidConversationsRouter = router({
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

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Você é um gerador de títulos. Gere um título curto (máximo 5 palavras) para esta conversa jurídica. Responda APENAS com o título, sem aspas, sem explicações."
            },
            { role: "user", content: firstUserMessage.content.substring(0, 500) }
          ],
          apiKey: resolveApiKeyForProvider(settings?.llmProvider, settings?.llmApiKey),
          model: settings?.llmModel || "gemini-3-flash-preview",
          provider: settings?.llmProvider || "google"
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

  // Verificar se processo já existe em outra conversa
  checkDuplicateProcess: protectedProcedure
    .input(
      z.object({
        processNumber: z.string(),
        excludeConversationId: z.number().optional(),
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
});
