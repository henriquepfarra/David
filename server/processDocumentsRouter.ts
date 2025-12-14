import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { createProcessDocument, getProcessDocuments, deleteProcessDocument } from "./db";
import { storagePut } from "./storage";
import mammoth from "mammoth";
import { TRPCError } from "@trpc/server";

/**
 * Router para gerenciar documentos vinculados a processos específicos
 */
export const processDocumentsRouter = router({
  /**
   * Upload de documento do processo
   * Recebe arquivo em base64, faz upload para S3, extrai texto e salva no banco
   */
  upload: protectedProcedure
    .input(
      z.object({
        processId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // Base64
        fileType: z.string(), // pdf, docx, txt, jpg
        documentType: z.enum(["inicial", "prova", "peticao", "sentenca", "recurso", "outro"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Decodificar base64
        const buffer = Buffer.from(input.fileData, "base64");

        // Upload para S3
        const fileKey = `process-docs/${ctx.user.id}/${input.processId}/${Date.now()}-${input.fileName}`;
        const mimeType = getMimeType(input.fileType);
        const { url: fileUrl } = await storagePut(fileKey, buffer, mimeType);

        // Extrair texto do documento
        let extractedText = "";
        try {
          if (input.fileType === "txt") {
            extractedText = buffer.toString("utf-8");
          } else if (input.fileType === "docx") {
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
          } else if (input.fileType === "pdf") {
            // Para PDFs, usar o novo extrator
            const { extractTextFromPdfBuffer } = await import("./_core/pdfExtractor");
            extractedText = await extractTextFromPdfBuffer(buffer);
          } else {
            extractedText = "[Arquivo de imagem - sem extração de texto]";
          }
        } catch (error) {
          console.error("[ProcessDocuments] Erro ao extrair texto:", error);
          extractedText = "[Erro na extração de texto]";
        }

        // Salvar no banco
        await createProcessDocument({
          userId: ctx.user.id,
          processId: input.processId,
          title: input.fileName,
          content: extractedText,
          fileType: input.fileType,
          fileUrl,
          documentType: input.documentType || "outro",
        });

        return {
          success: true,
          fileUrl,
          extractedLength: extractedText.length,
        };
      } catch (error) {
        console.error("[ProcessDocuments] Erro no upload:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao fazer upload do documento",
        });
      }
    }),

  /**
   * Listar documentos de um processo
   */
  list: protectedProcedure
    .input(
      z.object({
        processId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const docs = await getProcessDocuments(input.processId, ctx.user.id);
      return docs;
    }),

  /**
   * Deletar documento
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await deleteProcessDocument(input.id, ctx.user.id);
      return { success: true };
    }),
});

/**
 * Helper para obter MIME type baseado na extensão
 */
function getMimeType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  };

  return mimeTypes[fileType.toLowerCase()] || "application/octet-stream";
}
