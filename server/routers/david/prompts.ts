import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import {
  createSavedPrompt,
  getUserSavedPrompts,
  getSavedPromptsPaginated,
  getSavedPromptById,
  updateSavedPrompt,
  deleteSavedPrompt,
  getUniqueCategories,
  createMessage,
} from "../../db";

export const davidPromptsRouter = router({
  // Coleções de Prompts
  promptCollections: router({
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { createPromptCollection } = await import("../../db");
        const id = await createPromptCollection({
          userId: ctx.user.id,
          name: input.name,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserPromptCollections } = await import("../../db");
      return await getUserPromptCollections(ctx.user.id);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deletePromptCollection } = await import("../../db");
        await deletePromptCollection(input.id);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(100) }))
      .mutation(async ({ input }) => {
        const { updatePromptCollection } = await import("../../db");
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
        cursor: z.number().optional(),
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
});
