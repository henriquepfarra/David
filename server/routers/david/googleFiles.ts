import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { logger } from "../../_core/logger";
import {
  getConversationById,
  updateConversationGoogleFile,
  getConversationGoogleFile,
} from "../../db";

export const davidGoogleFilesRouter = router({
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
          const { deleteFileFromGoogle } = await import("../../_core/fileApi");
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
});
