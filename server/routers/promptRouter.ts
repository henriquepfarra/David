/**
 * promptRouter - Sub-router para CRUD de prompts e coleções
 * 
 * Extraído de davidRouter.ts para modularização
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
    createSavedPrompt,
    getUserSavedPrompts,
    getSavedPromptsPaginated,
    getSavedPromptById,
    updateSavedPrompt,
    deleteSavedPrompt,
    getUniqueCategories,
    createPromptCollection,
    getUserPromptCollections,
    deletePromptCollection,
    updatePromptCollection,
    createMessage,
} from "../db";

// ============================================
// COLEÇÕES DE PROMPTS
// ============================================

export const promptCollectionRouter = router({
    create: protectedProcedure
        .input(z.object({ name: z.string().min(1).max(100) }))
        .mutation(async ({ ctx, input }) => {
            const id = await createPromptCollection({
                userId: ctx.user.id,
                name: input.name,
            });
            return { id };
        }),

    list: protectedProcedure.query(async ({ ctx }) => {
        return await getUserPromptCollections(ctx.user.id);
    }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await deletePromptCollection(input.id);
            return { success: true };
        }),

    update: protectedProcedure
        .input(z.object({ id: z.number(), name: z.string().min(1).max(100) }))
        .mutation(async ({ input }) => {
            await updatePromptCollection(input.id, input.name);
            return { success: true };
        }),
});

// ============================================
// PROMPTS SALVOS
// ============================================

export const savedPromptRouter = router({
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
            await createMessage({
                conversationId: input.conversationId,
                role: "user",
                content: prompt.content,
            });

            return { success: true };
        }),

    // Seed default tutela prompt
    seedDefaultTutela: protectedProcedure.mutation(async ({ ctx }) => {
        // Verifica se já existe
        const existing = await getUserSavedPrompts(ctx.user.id);
        const hasTutela = existing.some((p) => p.category === "tutela" && p.isDefault === 1);

        if (hasTutela) {
            return { success: false, message: "Prompt padrão já existe" };
        }

        const TUTELA_PROMPT = `Analise criticamente o processo e documentos anexos para avaliar a viabilidade do pedido de tutela de urgência, com base no Art. 300 do CPC.

Estrutura da Análise:

**Contextualização Inicial**
- Síntese dos fatos relevantes (máximo 150 palavras)
- Pedido de tutela formulado
- Rito processual

**Análise dos Requisitos (Art. 300, CPC)**

A) Probabilidade do Direito (Fumus Boni Iuris)
B) Perigo de Dano (Periculum in Mora)
C) Reversibilidade da Medida

**Parecer Conclusivo**
- ☐ Deferimento Recomendado
- ☐ Indeferimento Recomendado
- ☐ Postergação da Análise`;

        const id = await createSavedPrompt({
            userId: ctx.user.id,
            title: "Análise de Tutela de Urgência (Art. 300 CPC)",
            category: "tutela",
            content: TUTELA_PROMPT,
            description: "Análise de viabilidade de tutela de urgência com base no Art. 300 do CPC.",
            isDefault: 1,
        });

        return { success: true, id };
    }),
});
