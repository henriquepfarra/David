/**
 * thesisRouter - Router TRPC dedicado para Active Learning
 * 
 * Endpoints:
 * - getPendingCount: Badge no menu (cache 1 min)
 * - getPendingTheses: Lista teses PENDING_REVIEW
 * - getActiveTheses: Lista teses ACTIVE
 * - approveThesis: Promove PENDING → ACTIVE
 * - editThesis: Edita + promove para ACTIVE
 * - rejectThesis: Marca como REJECTED
 * - getThesisStats: Métricas para StatsWidget
 * - checkSimilarTheses: Verifica teses similares antes de aprovar
 * - approveWithResolution: Aprovar com resolução de conflito
 * - getCurationSuggestions: Sugestões de curadoria (não usadas + clusters)
 * - deleteThesis: Deletar tese (com ownership check)
 * - updateActiveThesis: Editar tese ativa (com ownership check)
 * - listApprovedDrafts: Listar minutas aprovadas
 * - deleteApprovedDraft: Deletar minuta (com ownership check)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { learnedTheses, approvedDrafts } from "../../drizzle/schema";
import { eq, and, sql, desc, gte, lt } from "drizzle-orm";
import { getThesisLearningService } from "../services/ThesisLearningService";
import { getRagService } from "../services/RagService";

export const thesisRouter = router({
    /**
     * Endpoint 1: getPendingCount (Para Badge)
     * Cache: 1 minuto (configurado no React Query no frontend)
     */
    getPendingCount: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return { count: 0 };

        const result = await db
            .select({ count: sql<number>`count(*)` })
            .from(learnedTheses)
            .where(
                and(
                    eq(learnedTheses.userId, ctx.user.id),
                    eq(learnedTheses.status, "PENDING_REVIEW" as any)
                )
            );

        return { count: Number(result[0]?.count || 0) };
    }),

    /**
     * Endpoint 2: getPendingTheses (Lista de Teses Pendentes)
     */
    getPendingTheses: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        const theses = await db
            .select()
            .from(learnedTheses)
            .where(
                and(
                    eq(learnedTheses.userId, ctx.user.id),
                    eq(learnedTheses.status, "PENDING_REVIEW" as any)
                )
            )
            .orderBy(desc(learnedTheses.createdAt));

        return theses.map((t) => ({
            id: t.id,
            legalThesis: t.legalThesis,
            writingStyleSample: t.writingStyleSample || "",
            writingCharacteristics: t.writingCharacteristics as any,
            legalFoundations: t.legalFoundations || "",
            keywords: t.keywords || "",
            approvedDraftId: t.approvedDraftId,
            processId: t.processId,
            createdAt: t.createdAt,
        }));
    }),

    /**
     * Endpoint 3: getActiveTheses (Lista de Teses Ativas)
     */
    getActiveTheses: protectedProcedure
        .input(
            z.object({
                search: z.string().optional(),
                limit: z.number().default(20),
                offset: z.number().default(0),
            })
        )
        .query(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return { theses: [], total: 0 };

            let query = db
                .select()
                .from(learnedTheses)
                .where(
                    and(
                        eq(learnedTheses.userId, ctx.user.id),
                        eq(learnedTheses.status, "ACTIVE" as any),
                        eq(learnedTheses.isObsolete, 0)
                    )
                )
                .orderBy(desc(learnedTheses.createdAt));

            const theses = await query.limit(input.limit).offset(input.offset);

            const total = await db
                .select({ count: sql<number>`count(*)` })
                .from(learnedTheses)
                .where(
                    and(
                        eq(learnedTheses.userId, ctx.user.id),
                        eq(learnedTheses.status, "ACTIVE" as any),
                        eq(learnedTheses.isObsolete, 0)
                    )
                );

            return {
                theses: theses.map((t) => ({
                    id: t.id,
                    legalThesis: t.legalThesis,
                    writingStyleSample: t.writingStyleSample || "",
                    legalFoundations: t.legalFoundations || "",
                    keywords: t.keywords || "",
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt,
                })),
                total: Number(total[0]?.count || 0),
            };
        }),

    /**
     * Endpoint 4: approveThesis (Promover para ACTIVE)
     */
    approveThesis: protectedProcedure
        .input(z.object({ thesisId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const service = getThesisLearningService();
            await service.approveThesis(input.thesisId, ctx.user.id);
            return { success: true };
        }),

    /**
     * Endpoint 5: editThesis (Editar + Aprovar)
     */
    editThesis: protectedProcedure
        .input(
            z.object({
                thesisId: z.number(),
                editedLegalThesis: z.string().optional(),
                editedWritingStyle: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const service = getThesisLearningService();
            await service.editAndApproveThesis(
                input.thesisId,
                ctx.user.id,
                input.editedLegalThesis,
                input.editedWritingStyle
            );
            return { success: true };
        }),

    /**
     * Endpoint 6: rejectThesis (Rejeitar com motivo)
     */
    rejectThesis: protectedProcedure
        .input(
            z.object({
                thesisId: z.number(),
                rejectionReason: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const service = getThesisLearningService();
            await service.rejectThesis(
                input.thesisId,
                ctx.user.id,
                input.rejectionReason
            );
            return { success: true };
        }),



    /**
     * Endpoint 7: getThesisStats (Métricas para StatsWidget)
     */
    getThesisStats: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db)
            return {
                activeCount: 0,
                approvedDraftsCount: 0,
                lastLearningDate: null,
            };

        // Contar teses ativas
        const activeResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(learnedTheses)
            .where(
                and(
                    eq(learnedTheses.userId, ctx.user.id),
                    eq(learnedTheses.status, "ACTIVE" as any)
                )
            );

        // Contar minutas aprovadas este mês
        const approvedResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(approvedDrafts)
            .where(
                and(
                    eq(approvedDrafts.userId, ctx.user.id),
                    gte(
                        approvedDrafts.createdAt,
                        sql`DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')`
                    )
                )
            );

        // Última tese aprendida
        const lastLearningResult = await db
            .select({ createdAt: learnedTheses.createdAt })
            .from(learnedTheses)
            .where(eq(learnedTheses.userId, ctx.user.id))
            .orderBy(desc(learnedTheses.createdAt))
            .limit(1);

        return {
            activeCount: Number(activeResult[0]?.count || 0),
            approvedDraftsCount: Number(approvedResult[0]?.count || 0),
            lastLearningDate: lastLearningResult[0]?.createdAt || null,
        };
    }),

    /**
     * Endpoint 8: checkSimilarTheses (Deduplicação antes de aprovar)
     * Retorna teses ativas similares para o usuário decidir
     */
    checkSimilarTheses: protectedProcedure
        .input(z.object({ thesisId: z.number() }))
        .query(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return { similarTheses: [] };

            // Buscar a tese pendente
            const result = await db
                .select()
                .from(learnedTheses)
                .where(
                    and(
                        eq(learnedTheses.id, input.thesisId),
                        eq(learnedTheses.userId, ctx.user.id)
                    )
                )
                .limit(1);

            if (result.length === 0 || !result[0].thesisEmbedding) {
                return { similarTheses: [] };
            }

            const thesis = result[0];
            const ragService = getRagService();

            const similar = await ragService.findSimilarTheses(
                thesis.thesisEmbedding as number[],
                ctx.user.id,
                { threshold: 0.85, excludeId: thesis.id }
            );

            return {
                similarTheses: similar.map(s => ({
                    id: s.id,
                    legalThesis: s.legalThesis,
                    legalFoundations: s.legalFoundations,
                    keywords: s.keywords,
                    similarity: Math.round(s.similarity * 100),
                })),
            };
        }),

    /**
     * Endpoint 8b: approveWithResolution (Aprovar com resolução de conflito)
     * Ações: "keep_both" | "replace" | "merge"
     */
    approveWithResolution: protectedProcedure
        .input(
            z.object({
                thesisId: z.number(),
                resolution: z.enum(["keep_both", "replace", "merge"]),
                replaceThesisId: z.number().optional(), // ID da tese a substituir/mesclar
            })
        )
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database não disponível");

            const service = getThesisLearningService();

            if (input.resolution === "replace" && input.replaceThesisId) {
                // Marcar tese antiga como obsoleta
                await db
                    .update(learnedTheses)
                    .set({ isObsolete: 1 })
                    .where(
                        and(
                            eq(learnedTheses.id, input.replaceThesisId),
                            eq(learnedTheses.userId, ctx.user.id)
                        )
                    );
            }

            if (input.resolution === "merge" && input.replaceThesisId) {
                // Buscar tese antiga para mesclar fundamentos
                const oldThesis = await db
                    .select()
                    .from(learnedTheses)
                    .where(
                        and(
                            eq(learnedTheses.id, input.replaceThesisId),
                            eq(learnedTheses.userId, ctx.user.id)
                        )
                    )
                    .limit(1);

                if (oldThesis.length > 0) {
                    const newThesis = await db
                        .select()
                        .from(learnedTheses)
                        .where(eq(learnedTheses.id, input.thesisId))
                        .limit(1);

                    if (newThesis.length > 0) {
                        // Mesclar: combinar fundamentos e keywords da antiga com a nova
                        const mergedFoundations = [
                            newThesis[0].legalFoundations,
                            oldThesis[0].legalFoundations,
                        ]
                            .filter(Boolean)
                            .join("\n");

                        const allKeywords = [newThesis[0].keywords, oldThesis[0].keywords]
                            .filter(Boolean)
                            .join(",")
                            .split(",")
                            .map((k) => k.trim())
                            .filter(Boolean);
                        const mergedKeywords = Array.from(new Set(allKeywords)).join(", ");

                        await db
                            .update(learnedTheses)
                            .set({
                                legalFoundations: mergedFoundations,
                                keywords: mergedKeywords,
                            })
                            .where(eq(learnedTheses.id, input.thesisId));
                    }

                    // Marcar tese antiga como obsoleta
                    await db
                        .update(learnedTheses)
                        .set({ isObsolete: 1 })
                        .where(eq(learnedTheses.id, input.replaceThesisId));
                }
            }

            // Aprovar a nova tese (keep_both, replace ou merge)
            await service.approveThesis(input.thesisId, ctx.user.id);
            return { success: true };
        }),

    /**
     * Endpoint 8c: getCurationSuggestions (Sugestões de curadoria)
     * Retorna teses nunca usadas (30+ dias) e clusters de teses similares
     */
    getCurationSuggestions: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return { unusedTheses: [], clusters: [] };

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Teses nunca usadas, criadas há mais de 30 dias
        const unused = await db
            .select({
                id: learnedTheses.id,
                legalThesis: learnedTheses.legalThesis,
                keywords: learnedTheses.keywords,
                createdAt: learnedTheses.createdAt,
            })
            .from(learnedTheses)
            .where(
                and(
                    eq(learnedTheses.userId, ctx.user.id),
                    eq(learnedTheses.status, "ACTIVE" as any),
                    eq(learnedTheses.isObsolete, 0),
                    eq(learnedTheses.useCount, 0),
                    lt(learnedTheses.createdAt, thirtyDaysAgo)
                )
            )
            .orderBy(learnedTheses.createdAt);

        // Clusters de teses similares
        const ragService = getRagService();
        const clusters = await ragService.findThesisClusters(ctx.user.id, { threshold: 0.80 });

        return {
            unusedTheses: unused.map(t => ({
                id: t.id,
                legalThesis: t.legalThesis,
                keywords: t.keywords,
                daysSinceCreation: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            })),
            clusters: clusters.map(c => ({
                theses: c.theses,
                avgSimilarity: Math.round(c.avgSimilarity * 100),
            })),
        };
    }),

    /**
     * Endpoint 9: getThesisById (Visualizar tese específica)
     */
    getThesisById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database não disponível");

            const result = await db
                .select()
                .from(learnedTheses)
                .where(
                    and(
                        eq(learnedTheses.id, input.id),
                        eq(learnedTheses.userId, ctx.user.id)
                    )
                )
                .limit(1);

            if (result.length === 0) {
                throw new Error("Tese não encontrada");
            }

            const thesis = result[0];

            return {
                id: thesis.id,
                legalThesis: thesis.legalThesis,
                writingStyleSample: thesis.writingStyleSample || "",
                writingCharacteristics: thesis.writingCharacteristics as any,
                legalFoundations: thesis.legalFoundations || "",
                keywords: thesis.keywords || "",
                status: thesis.status,
                approvedDraftId: thesis.approvedDraftId,
                processId: thesis.processId,
                createdAt: thesis.createdAt,
                updatedAt: thesis.updatedAt,
                reviewedAt: thesis.reviewedAt,
                reviewedBy: thesis.reviewedBy,
                rejectionReason: thesis.rejectionReason,
            };
        }),

    /**
     * Endpoint 9: deleteThesis (Deletar tese com ownership check)
     */
    deleteThesis: protectedProcedure
        .input(z.object({ thesisId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database não disponível");

            const result = await db
                .select({ id: learnedTheses.id })
                .from(learnedTheses)
                .where(
                    and(
                        eq(learnedTheses.id, input.thesisId),
                        eq(learnedTheses.userId, ctx.user.id)
                    )
                )
                .limit(1);

            if (result.length === 0) throw new Error("Tese não encontrada");

            await db
                .delete(learnedTheses)
                .where(eq(learnedTheses.id, input.thesisId));
            return { success: true };
        }),

    /**
     * Endpoint 10: updateActiveThesis (Editar tese ativa com ownership check)
     */
    updateActiveThesis: protectedProcedure
        .input(
            z.object({
                thesisId: z.number(),
                legalThesis: z.string().optional(),
                legalFoundations: z.string().optional(),
                keywords: z.string().optional(),
                writingStyleSample: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database não disponível");

            const result = await db
                .select({ id: learnedTheses.id })
                .from(learnedTheses)
                .where(
                    and(
                        eq(learnedTheses.id, input.thesisId),
                        eq(learnedTheses.userId, ctx.user.id)
                    )
                )
                .limit(1);

            if (result.length === 0) throw new Error("Tese não encontrada");

            const { thesisId, ...updateData } = input;
            await db
                .update(learnedTheses)
                .set(updateData)
                .where(eq(learnedTheses.id, thesisId));
            return { success: true };
        }),

    /**
     * Endpoint 11: listApprovedDrafts (Listar minutas aprovadas)
     */
    listApprovedDrafts: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        const drafts = await db
            .select()
            .from(approvedDrafts)
            .where(eq(approvedDrafts.userId, ctx.user.id))
            .orderBy(desc(approvedDrafts.createdAt));

        return drafts.map((d) => ({
            id: d.id,
            originalDraft: d.originalDraft,
            editedDraft: d.editedDraft,
            draftType: d.draftType,
            approvalStatus: d.approvalStatus,
            userNotes: d.userNotes,
            createdAt: d.createdAt,
        }));
    }),

    /**
     * Endpoint 12: deleteApprovedDraft (Deletar minuta com ownership check)
     */
    deleteApprovedDraft: protectedProcedure
        .input(z.object({ draftId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database não disponível");

            const result = await db
                .select({ id: approvedDrafts.id })
                .from(approvedDrafts)
                .where(
                    and(
                        eq(approvedDrafts.id, input.draftId),
                        eq(approvedDrafts.userId, ctx.user.id)
                    )
                )
                .limit(1);

            if (result.length === 0) throw new Error("Minuta não encontrada");

            await db
                .delete(approvedDrafts)
                .where(eq(approvedDrafts.id, input.draftId));
            return { success: true };
        }),
});
