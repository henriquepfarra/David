import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createConversation,
  getUserConversations,
  getConversationById,
  deleteConversation,
  createMessage,
  getConversationMessages,
  createSavedPrompt,
  getUserSavedPrompts,
  getSavedPromptById,
  updateSavedPrompt,
  deleteSavedPrompt,
  getProcessForContext,
} from "./db";
import { invokeLLM } from "./_core/llm";

// System prompt padrão do DAVID
const DEFAULT_DAVID_SYSTEM_PROMPT = `Você é DAVID, um assistente jurídico especializado em processos judiciais brasileiros.

Sua função é auxiliar na análise de processos, geração de minutas e orientação jurídica com base em:
1. Dados do processo fornecido pelo usuário
2. Legislação brasileira (CPC, CDC, CC, etc.)
3. Jurisprudência do TJSP e tribunais superiores
4. Boas práticas jurídicas

Diretrizes:
- Seja preciso, técnico e fundamentado
- Cite sempre a base legal (artigos, leis)
- Quando sugerir jurisprudência, forneça perfis de busca específicos
- NUNCA invente jurisprudência ou dados
- Seja crítico e realista sobre pontos fortes e fracos
- Use linguagem jurídica clara e acessível
- Quando houver processo selecionado, utilize seus dados no contexto

Formato de resposta:
- Use markdown para estruturar
- Destaque pontos importantes em **negrito**
- Use listas quando apropriado
- Cite dispositivos legais entre parênteses (ex: Art. 300, CPC)`;

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
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      // Salvar mensagem do usuário
      await createMessage({
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
      });

      // Buscar histórico de mensagens
      const history = await getConversationMessages(input.conversationId);

      // Montar contexto do processo se houver
      let processContext = "";
      if (conversation.processId) {
        const process = await getProcessForContext(conversation.processId);
        if (process) {
          processContext = `\n\n## PROCESSO SELECIONADO\n\n**Número:** ${process.processNumber}\n**Autor:** ${process.plaintiff}\n**Réu:** ${process.defendant}\n**Vara:** ${process.court}\n**Assunto:** ${process.subject}\n**Fatos:** ${process.facts}\n**Pedidos:** ${process.requests}\n**Status:** ${process.status}\n`;
        }
      }

      // Montar mensagens para a IA
      const systemPrompt = input.systemPromptOverride || DEFAULT_DAVID_SYSTEM_PROMPT;
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt + processContext },
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

      // Chamar LLM
      const response = await invokeLLM({
        messages: llmMessages,
      });

      const assistantMessage = typeof response.choices[0]?.message?.content === 'string' 
        ? response.choices[0].message.content 
        : "Desculpe, não consegui gerar uma resposta.";

      // Salvar resposta do DAVID
      await createMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: assistantMessage,
      });

      return {
        content: assistantMessage,
      };
    }),

  // Prompts salvos
  savedPrompts: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          category: z.string().optional(),
          content: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createSavedPrompt({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserSavedPrompts(ctx.user.id);
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
          category: z.string().optional(),
          content: z.string().optional(),
          description: z.string().optional(),
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
  }),
});
