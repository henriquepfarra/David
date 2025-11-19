import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateDraft } from "./ghostwriter";
import { fetchDriveContentCached } from "./driveHelper";
import { listAvailableModels } from "./llmModels";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
        
        // Se tiver texto, tentar extrair do texto primeiro
        if (input.text && input.text.length > 100) {
          return await extractProcessData(input.text);
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteKnowledgeBase(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Ghostwriter - Geração de minutas com IA
  ghostwriter: router({
    generate: protectedProcedure
      .input(z.object({
        processId: z.number(),
        draftType: z.enum(["sentenca", "decisao", "despacho", "acordao"]),
        title: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Buscar dados do processo
        const process = await db.getProcessById(input.processId, ctx.user.id);
        if (!process) {
          throw new Error("Processo não encontrado");
        }

        // Buscar configurações do usuário
        const settings = await db.getUserSettings(ctx.user.id);

        // Buscar conteúdo do Google Drive (Teses e Diretrizes)
        const driveContent = await fetchDriveContentCached();

        // Buscar base de conhecimento do usuário
        const knowledgeBase = await db.getUserKnowledgeBase(ctx.user.id);
        const knowledgeBaseContent = knowledgeBase
          .map(kb => `[${kb.title}]\n${kb.content}`)
          .join("\n\n---\n\n");

        // Gerar minuta com IA
        const content = await generateDraft({
          draftType: input.draftType,
          processNumber: process.processNumber,
          court: process.court || undefined,
          judge: process.judge || undefined,
          plaintiff: process.plaintiff || undefined,
          defendant: process.defendant || undefined,
          subject: process.subject || undefined,
          facts: process.facts || undefined,
          evidence: process.evidence || undefined,
          requests: process.requests || undefined,
          customApiKey: settings?.llmApiKey || undefined,
          customModel: settings?.llmModel || undefined,
          customSystemPrompt: settings?.customSystemPrompt || undefined,
          knowledgeBase: knowledgeBaseContent || undefined,
          driveContent: driveContent || undefined,
        });

        // Salvar minuta no banco
        await db.createDraft({
          processId: input.processId,
          userId: ctx.user.id,
          draftType: input.draftType,
          title: input.title,
          content,
        });

        return { success: true, content };
      }),
  }),
});

export type AppRouter = typeof appRouter;
