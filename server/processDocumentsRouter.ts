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

        let extractedText = "";
        let pagesToProcess: { pageNumber: number, text: string }[] = [];

        // 1. Extração do Texto
        try {
          if (input.fileType === "txt") {
            extractedText = buffer.toString("utf-8");
            pagesToProcess = [{ pageNumber: 1, text: extractedText }];
          } else if (input.fileType === "docx") {
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
            pagesToProcess = [{ pageNumber: 1, text: extractedText }];
          } else if (input.fileType === "pdf") {
            // Importação dinâmica dos extratores
            const { extractPagesFromPdfBuffer } = await import("./_core/pdfExtractor");
            // Extrai páginas separadas
            pagesToProcess = await extractPagesFromPdfBuffer(buffer);
            extractedText = pagesToProcess.map(p => p.text).join("\n\n");
          } else {
            extractedText = "[Arquivo de imagem - sem extração de texto]";
          }
        } catch (error) {
          console.error("[ProcessDocuments] Erro ao extrair texto:", error);
          extractedText = "[Erro na extração de texto]";
        }

        // 2. Salvar Documento Pai no Banco
        // Aqui salvamos o registro "físico" do arquivo
        const docResult = await createProcessDocument({
          userId: ctx.user.id,
          processId: input.processId,
          title: input.fileName,
          content: extractedText, // Mantemos uma cópia bruta por segurança
          fileType: input.fileType,
          fileUrl,
          documentType: input.documentType || "outro",
        });

        const documentId = Number(docResult[0].insertId);

        // 3. Processamento Profundo (Deep Reading & Chunking)
        // Só processamos se tiver extraído texto válido
        if (extractedText.length > 50 && pagesToProcess.length > 0) {
          const { splitTextIntoChunks } = await import("./_core/chunking");
          const { generateEmbedding } = await import("./_core/embeddings");
          const { processDocumentChunks, userSettings } = await import("../drizzle/schema");
          const { db } = await import("./db");
          const { eq } = await import("drizzle-orm");

          // Buscar chave de API customizada do usuário
          let apiKey: string | undefined;
          if (db) {
            const settingsResult = await db.select().from(userSettings).where(eq(userSettings.userId, ctx.user.id)).limit(1);
            const settings = settingsResult[0];
            apiKey = settings?.readerApiKey || undefined;
          }

          // Iterar sobre cada página
          for (const page of pagesToProcess) {
            // Quebrar página em chunks inteligentes (com overlap)
            const chunks = splitTextIntoChunks(page.text, { maxSize: 1000, overlap: 200 });

            // Processar cada chunk
            for (const chunk of chunks) {
              let embedding: number[] = [];
              try {
                // Gerar vetor semântico
                embedding = await generateEmbedding(chunk.content, apiKey);
              } catch (e) {
                console.warn(`Falha ao gerar embedding para doc ${documentId} pag ${page.pageNumber}`);
              }

              // Salvar chunk no banco
              if (db) {
                await db.insert(processDocumentChunks).values({
                  processId: input.processId,
                  documentId: documentId,
                  content: chunk.content,
                  pageNumber: page.pageNumber,
                  chunkIndex: chunk.chunkIndex,
                  tokenCount: chunk.tokenCountEstimate,
                  embedding: embedding, // Drizzle cuida do JSON.stringify
                  tags: input.documentType
                });
              }
            }
          }
        }

        return {
          success: true,
          fileUrl,
          extractedLength: extractedText.length,
          pagesProcessed: pagesToProcess.length
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
