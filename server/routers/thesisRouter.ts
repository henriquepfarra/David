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
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { learnedTheses, approvedDrafts } from "../../drizzle/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { getThesisLearningService } from "../services/ThesisLearningService";

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
     * Endpoint 8: getThesisById (Visualizar tese específica)
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
});
