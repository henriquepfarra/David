import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

import { fetchDriveContentCached } from "./driveHelper";
import { listAvailableModels } from "./llmModels";
import { davidRouter } from "./davidRouter";
import { processDocumentsRouter } from "./processDocumentsRouter";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

export const appRouter = router({
  system: systemRouter,
  david: davidRouter,
  processDocuments: processDocumentsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Limpar cookie com todas as opções necessárias
      ctx.res.clearCookie(COOKIE_NAME, {
        ...cookieOptions,
        maxAge: 0,
        expires: new Date(0)
      });
      console.log("[Logout] Cookie cleared:", COOKIE_NAME);
      return {
        success: true,
      } as const;
    }),
    localLogin: publicProcedure.mutation(async ({ ctx }) => {
      // Segurança: Esta rota SÓ deve funcionar em desenvolvimento
      if (process.env.NODE_ENV === "production") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Local login is only available in development environment",
        });
      }

      // Create a dummy user session for local development
      const mockUser = {
        openId: "dev-user-id",
        appId: ENV.appId || "dev-app-id",
        name: "Desenvolvedor Local",
        email: "dev@local.test",
        loginMethod: "local",
        role: "admin" as const,
      };

      // Ensure user exists in DB to prevent OAuth sync failure
      const { appId, ...userForDb } = mockUser;
      await db.upsertUser(userForDb);

      const sessionToken = await sdk.signSession({
        openId: mockUser.openId,
        appId: mockUser.appId,
        name: mockUser.name,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);

      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      return { success: true };
    }),
  }),

  // Processos
  processes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProcesses(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getProcessById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        processNumber: z.string(),
        court: z.string().optional(),
        judge: z.string().optional(),
        plaintiff: z.string().optional(),
        defendant: z.string().optional(),
        subject: z.string().optional(),
        facts: z.string().optional(),
        evidence: z.string().optional(),
        requests: z.string().optional(),
        status: z.string().optional(),
        distributionDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createProcess({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        processNumber: z.string().optional(),
        court: z.string().optional(),
        judge: z.string().optional(),
        plaintiff: z.string().optional(),
        defendant: z.string().optional(),
        subject: z.string().optional(),
        facts: z.string().optional(),
        evidence: z.string().optional(),
        requests: z.string().optional(),
        status: z.string().optional(),
        distributionDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateProcess(id, ctx.user.id, data);
        return { success: true };
      }),

    extractFromPDF: protectedProcedure
      .input(z.object({
        text: z.string(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { extractProcessData, extractProcessDataFromImages } = await import("./processExtractor");

        console.log('[extractFromPDF] Texto recebido (primeiros 500 chars):', input.text?.substring(0, 500));
        console.log('[extractFromPDF] Tamanho do texto:', input.text?.length);
        console.log('[extractFromPDF] Número de imagens:', input.images?.length || 0);

        // Se tiver texto, tentar extrair do texto primeiro
        if (input.text && input.text.length > 100) {
          const result = await extractProcessData(input.text);
          console.log('[extractFromPDF] Resultado da extração:', JSON.stringify(result, null, 2));
          return result;
        }

        // Se não tiver texto suficiente mas tiver imagens, usar extração multimodal
        if (input.images && input.images.length > 0) {
          return await extractProcessDataFromImages(input.images);
        }

        throw new Error("Nenhum conteúdo válido fornecido para extração");
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProcess(input.id, ctx.user.id);
        return { success: true };
      }),

    registerFromUpload: protectedProcedure
      .input(z.object({
        text: z.string(),
        images: z.array(z.string()).optional(),
        filename: z.string().optional(),
        fileData: z.string().optional(), // Base64 do arquivo
        fileType: z.string().optional(), // pdf, docx, etc
      }))
      .mutation(async ({ ctx, input }) => {
        const { extractProcessData, extractProcessDataFromImages } = await import("./processExtractor");

        // Buscar configurações customizadas do usuário (API Key)
        const settings = await db.getUserSettings(ctx.user.id);

        // Validação: usuário DEVE configurar sua própria chave de API para o Cérebro
        if (!settings?.llmApiKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "⚙️ Configuração necessária: Você precisa configurar sua Chave de API do Cérebro. Vá em Configurações → Chaves de API e adicione sua chave."
          });
        }

        const llmConfig = {
          apiKey: settings.llmApiKey,
          model: settings?.llmModel || undefined,
          provider: settings?.llmProvider || undefined
        };

        let textToAnalyze = input.text;

        // SE não tem texto extraído (ou é muito curto) E foi enviado o arquivo bruto (fallback)
        if ((!textToAnalyze || textToAnalyze.length < 100) && input.fileData && input.fileType) {
          console.log(`[registerFromUpload] Texto insuficiente. Iniciando extração no servidor para ${input.filename}...`);
          try {
            const buffer = Buffer.from(input.fileData, "base64");

            if (input.fileType === "pdf") {
              // Usar File API para leitura visual do PDF
              const { readPdfWithVision } = await import("./_core/fileApi");
              const result = await readPdfWithVision(buffer, {
                apiKey: settings?.readerApiKey || ENV.geminiApiKey || undefined,
                model: settings?.readerModel || "gemini-2.0-flash-lite",
              });
              textToAnalyze = result.content;
              console.log(`[registerFromUpload] File API: Leitura visual concluída. Tokens: ${result.tokensUsed}`);
            } else if (input.fileType === "docx") {
              const mammoth = await import("mammoth");
              const result = await mammoth.extractRawText({ buffer });
              textToAnalyze = result.value;
            } else if (input.fileType === "txt") {
              textToAnalyze = buffer.toString("utf-8");
            } else {
              console.warn(`[registerFromUpload] Tipo de arquivo não suportado para extração no servidor: ${input.fileType}`);
            }

            console.log(`[registerFromUpload] Extração concluída. Tamanho: ${textToAnalyze.length} chars`);
          } catch (err) {
            console.error("[registerFromUpload] Erro na extração server-side:", err);
            // Não falha aqui, tenta seguir com o que tem (pode cair no erro abaixo ou tentar OCR das imagens se houver)
          }
        }

        // 1. Extrair dados
        let extractedData;
        if (textToAnalyze && textToAnalyze.length > 100) {
          extractedData = await extractProcessData(textToAnalyze, llmConfig);
        } else if (input.images && input.images.length > 0) {
          extractedData = await extractProcessDataFromImages(input.images, llmConfig);
        } else {
          throw new Error("Conteúdo insuficiente para análise (Falha na extração local e remota)");
        }

        // 2. Criar Processo no BD
        // Usa "Processo s/n..." se não conseguir extrair o número
        const processNumber = extractedData.numeroProcesso || `Processo Importado ${new Date().toLocaleDateString()}`;

        const process = await db.createProcess({
          userId: ctx.user.id,
          processNumber,
          court: extractedData.vara || undefined,
          judge: undefined, // Geralmente não extrai bem, deixa quieto
          plaintiff: extractedData.autor || undefined,
          defendant: extractedData.reu || undefined,
          subject: extractedData.assunto || input.filename || undefined,
          facts: extractedData.resumoFatos || undefined,
          evidence: undefined,
          requests: extractedData.pedidos || undefined,
          status: "Importado via Chat",
          notes: "Processo cadastrado automaticamente via upload no chat.",
        });

        // 3. Salvar o conteúdo do documento para acesso posterior pelo DAVID
        if (textToAnalyze && textToAnalyze.length > 100) {
          try {
            await db.createProcessDocument({
              userId: ctx.user.id,
              processId: process.id,
              title: input.filename || `Documento Principal - ${processNumber}`,
              content: textToAnalyze,
              fileType: input.fileType || "pdf",
              documentType: "inicial", // Assume que é a petição inicial
            });
            console.log(`[registerFromUpload] Documento salvo em processDocuments. Tamanho: ${textToAnalyze.length} chars`);
          } catch (err) {
            console.error("[registerFromUpload] Erro ao salvar documento:", err);
            // Não falha - o processo foi criado, só o documento não foi salvo
          }
        }

        return {
          processId: process.id,
          processNumber,
          extractedData
        };
      }),
  }),

  // Minutas
  drafts: router({
    listByProcess: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getProcessDrafts(input.processId, ctx.user.id);
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserDrafts(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        processId: z.number(),
        draftType: z.enum(["sentenca", "decisao", "despacho", "acordao"]),
        title: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createDraft({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateDraft(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDraft(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Jurisprudência
  jurisprudence: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserJurisprudence(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        court: z.string(),
        caseNumber: z.string().optional(),
        title: z.string(),
        summary: z.string().optional(),
        content: z.string(),
        decisionDate: z.date().optional(),
        keywords: z.string().optional(),
        url: z.string().optional(),
        isFavorite: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createJurisprudence({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        court: z.string().optional(),
        caseNumber: z.string().optional(),
        title: z.string().optional(),
        summary: z.string().optional(),
        content: z.string().optional(),
        decisionDate: z.date().optional(),
        keywords: z.string().optional(),
        url: z.string().optional(),
        isFavorite: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateJurisprudence(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteJurisprudence(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Configurações do usuário
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserSettings(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        llmApiKey: z.string().optional(),
        llmProvider: z.string().optional(),
        llmModel: z.string().optional(),
        readerApiKey: z.string().optional(),
        readerModel: z.string().optional(),
        customSystemPrompt: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserSettings(ctx.user.id, input);
        return { success: true };
      }),

    listModels: protectedProcedure
      .input(z.object({
        provider: z.string(),
        apiKey: z.string(),
      }))
      .query(async ({ input }) => {
        const models = await listAvailableModels(input.provider, input.apiKey);
        return models;
      }),
  }),

  // Base de Conhecimento
  knowledgeBase: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserKnowledgeBase(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        content: z.string(),
        fileType: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createKnowledgeBase({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateKnowledgeBase(input.id, ctx.user.id, { content: input.content });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteKnowledgeBase(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
