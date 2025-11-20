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
  getDavidConfig,
  upsertDavidConfig,
} from "./db";
import { invokeLLM, invokeLLMStream } from "./_core/llm";
import { observable } from "@trpc/server/observable";

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

      // Stream da resposta
      let fullResponse = "";
      try {
        for await (const chunk of invokeLLMStream({ messages: llmMessages })) {
          fullResponse += chunk;
          yield { type: "chunk" as const, content: chunk };
        }

        // Salvar resposta completa do DAVID
        await createMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: fullResponse,
        });

        yield { type: "done" as const, content: fullResponse };
      } catch (error) {
        console.error("Stream error:", error);
        yield { type: "error" as const, content: "Erro ao gerar resposta" };
      }
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
