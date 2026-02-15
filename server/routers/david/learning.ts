import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import {
  createApprovedDraft,
  getUserApprovedDrafts,
  getApprovedDraftById,
  updateApprovedDraft,
  deleteApprovedDraft,
  createLearnedThesis,
  getUserLearnedTheses,
  searchSimilarTheses,
  updateLearnedThesis,
  deleteLearnedThesis,
  getDavidConfig,
  upsertDavidConfig,
} from "../../db";
import { DEFAULT_DAVID_SYSTEM_PROMPT } from "@shared/defaultPrompts";

export const davidLearningRouter = router({
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
          const { getThesisLearningService } = await import("../../services/ThesisLearningService");
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
