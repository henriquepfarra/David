/**
 * Router tRPC para gerenciar módulos especializados
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getAvailableModules, getAllModules, getModule, type ModuleSlug } from "./prompts/modules";
import { getDb } from "./db";
import { userSettings, conversations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const modulesRouter = router({
    /**
     * Lista todos os módulos (incluindo indisponíveis)
     */
    list: protectedProcedure.query(async () => {
        return getAllModules();
    }),

    /**
     * Lista apenas módulos disponíveis
     */
    listAvailable: protectedProcedure.query(async () => {
        return getAvailableModules();
    }),

    /**
     * Obtém o módulo padrão do usuário
     */
    getUserDefault: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return 'default';

        const settings = await db
            .select({ defaultModule: userSettings.defaultModule })
            .from(userSettings)
            .where(eq(userSettings.userId, ctx.user.id))
            .limit(1);

        return (settings[0]?.defaultModule as ModuleSlug) || 'default';
    }),

    /**
     * Define o módulo padrão do usuário
     */
    setUserDefault: protectedProcedure
        .input(z.object({
            moduleSlug: z.enum(['default', 'jec', 'familia', 'criminal', 'fazenda']),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return { success: false };

            // Verificar se o módulo está disponível
            const module = getModule(input.moduleSlug);
            if (!module?.isAvailable && input.moduleSlug !== 'default') {
                throw new Error('Módulo não disponível');
            }

            // Atualizar ou inserir configuração
            const existing = await db
                .select()
                .from(userSettings)
                .where(eq(userSettings.userId, ctx.user.id))
                .limit(1);

            if (existing.length > 0) {
                await db
                    .update(userSettings)
                    .set({ defaultModule: input.moduleSlug })
                    .where(eq(userSettings.userId, ctx.user.id));
            } else {
                await db.insert(userSettings).values({
                    userId: ctx.user.id,
                    defaultModule: input.moduleSlug,
                });
            }

            return { success: true, moduleSlug: input.moduleSlug };
        }),

    /**
     * Define o módulo para uma conversa específica
     */
    setConversationModule: protectedProcedure
        .input(z.object({
            conversationId: z.number(),
            moduleSlug: z.enum(['default', 'jec', 'familia', 'criminal', 'fazenda']).nullable(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return { success: false };

            await db
                .update(conversations)
                .set({ moduleSlug: input.moduleSlug })
                .where(eq(conversations.id, input.conversationId));

            return { success: true };
        }),

    /**
     * Obtém informações de um módulo específico
     */
    getModule: protectedProcedure
        .input(z.object({
            slug: z.enum(['default', 'jec', 'familia', 'criminal', 'fazenda']),
        }))
        .query(async ({ input }) => {
            return getModule(input.slug);
        }),
});
