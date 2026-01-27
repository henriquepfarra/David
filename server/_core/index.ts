// Polyfill for crypto in Node.js (required for jose library)
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// Load environment variables first
import "dotenv/config";

// Initialize Sentry BEFORE any other imports (must be first!)
import * as Sentry from "@sentry/node";

const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || "development",
    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",
    // Sample rate for performance monitoring
    tracesSampleRate: 0.1,
    // Don't send PII
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
      return event;
    },
  });
  console.log("🛡️ Sentry initialized for error monitoring");
}

console.log("🚀 Server process starting...");
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);

import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
import cors from "cors";
import { getConversationById, getConversationMessages, createMessage, getProcessForContext, getUserSettings, getUserKnowledgeBase, getProcessDocuments } from "../db";
import { invokeLLMStreamWithThinking as streamFn } from "../_core/llm";
import { sdk } from "./sdk";

// Novos serviços refatorados
import { getRagService } from "../services/RagService";
import { createAbstractBuilder, createConcreteBuilder } from "../services/ContextBuilder";
import { classify, formatDebugBadge } from "../services/IntentService";
import type { IntentResult } from "../services/IntentService";

// Cartucho JEC (mantido para compatibilidade)
import { JEC_CONTEXT } from "../modules/jec/context";
// Módulos dinâmicos
import { getModulePrompt } from "../prompts/modules";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      console.log(`✅ Port ${port} is available`);
      return port;
    }
  }
  console.error(`❌ No available port found starting from ${startPort}`);
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  console.log("startServer called");
  const app = express();
  const server = createServer(app);

  // Enable CORS with credentials support
  // Em produção, restringe origens permitidas para segurança
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean);

  app.use(cors({
    origin: process.env.NODE_ENV === 'production' && allowedOrigins && allowedOrigins.length > 0
      ? allowedOrigins  // Produção: apenas origens especificadas
      : true,           // Desenvolvimento: aceita qualquer origem
    credentials: true
  }));

  console.log(`🔒 CORS configured for ${process.env.NODE_ENV}: ${process.env.NODE_ENV === 'production' && allowedOrigins
    ? allowedOrigins.join(', ')
    : 'all origins (development mode)'
    }`);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Sentry request handler (must be first middleware)
  if (sentryDsn && process.env.NODE_ENV === "production") {
    Sentry.setupExpressErrorHandler(app);
  }

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Streaming endpoint para DAVID
  app.post("/api/david/stream", async (req, res) => {
    try {
      // Imports moved to top-level for performance

      console.log(`[Stream] Incoming request. Origin: ${req.headers.origin}, Cookie present: ${!!req.headers.cookie}`);

      let user;
      try {
        // Usar SDK real para autenticação (mesmo em desenvolvimento)
        // Isso garante consistência com o tRPC context
        user = await sdk.authenticateRequest(req);
      } catch (error: any) {
        console.error("[Stream] Auth failed:", error);
        res.status(401).json({ error: "Unauthorized", details: error.message });
        return;
      }

      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }


      const { conversationId, content, systemPromptOverride, googleFileUri: bodyFileUri } = req.body;

      // Buscar configurações de LLM do usuário
      const settings = await getUserSettings(user.id);

      // Módulo especializado do usuário (configuração fixa, não por conversa)
      const moduleSlug = (settings as any)?.defaultModule || 'default';
      console.log(`[Stream-Module] Módulo ativo: ${moduleSlug}`);

      // Validação: usuário DEVE configurar sua própria chave de API para o Cérebro
      if (!settings?.llmApiKey) {
        res.status(400).json({
          error: "⚙️ Configuração necessária: Você precisa configurar sua Chave de API do Cérebro. Vá em Configurações → Chaves de API e adicione sua chave.",
          code: "API_KEY_REQUIRED"
        });
        return;
      }

      const llmConfig = {
        apiKey: settings.llmApiKey,
        model: settings?.llmModel || undefined,
        provider: settings?.llmProvider || undefined
      };

      const conversation = await getConversationById(conversationId);
      console.log(`[Stream] conversationId: ${conversationId}, userId: ${user.id}, found: ${!!conversation}, ownerId: ${conversation?.userId}`);
      if (!conversation || conversation.userId !== user.id) {
        res.status(404).json({ error: "Conversa não encontrada" });
        return;
      }

      // Salvar mensagem do usuário
      await createMessage({
        conversationId,
        role: "user",
        content,
      });

      // Buscar histórico
      const history = await getConversationMessages(conversationId);

      // Contexto do processo
      let processContext = "";
      if (conversation.processId) {
        const process = await getProcessForContext(conversation.processId);
        if (process) {
          processContext = `\n\n## PROCESSO SELECIONADO\n\n**Número:** ${process.processNumber}\n**Autor:** ${process.plaintiff}\n**Réu:** ${process.defendant}\n**Vara:** ${process.court}\n**Assunto:** ${process.subject}\n**Fatos:** ${process.facts}\n**Pedidos:** ${process.requests}\n**Status:** ${process.status}\n`;

          // Buscar documentos do processo (PDFs extraídos)
          const processDocsList = await getProcessDocuments(conversation.processId, user.id);
          if (processDocsList.length > 0) {
            console.log(`[Stream-Process] Documentos do processo encontrados: ${processDocsList.length}`);
            processContext += `\n### DOCUMENTOS DOS AUTOS (${processDocsList.length} arquivos)\n\n`;
            processContext += `**IMPORTANTE:** Você tem acesso ao conteúdo completo dos documentos abaixo. Use-os para análise.\n\n`;

            for (const doc of processDocsList) {
              // Limitar tamanho do conteúdo por documento para não estourar contexto
              const contentPreview = doc.content.length > 15000
                ? doc.content.substring(0, 15000) + `\n\n[... conteúdo truncado. Total: ${doc.content.length} caracteres ...]`
                : doc.content;

              processContext += `---\n#### 📄 ${doc.title} (${doc.documentType})\n\n${contentPreview}\n\n`;
            }
          } else {
            console.log(`[Stream-Process] Nenhum documento encontrado para processo ${conversation.processId}`);
          }
        }
      }

      // === CLASSIFICAÇÃO DE INTENÇÃO (v7.1) ===
      let intentResult: IntentResult;
      try {
        intentResult = await classify(content, {
          processId: conversation.processId,
          history: history.map(m => ({ role: m.role, content: m.content })),
        }, llmConfig.apiKey);
        console.log(`[Stream-Intent] ${formatDebugBadge(intentResult)}`);
      } catch (error) {
        console.error("[Stream-Intent] Erro ao classificar, usando fallback:", error);
        // Fallback conservador
        intentResult = {
          intent: conversation.processId ? "CASE_ANALYSIS" : "JURISPRUDENCE",
          path: conversation.processId ? "CONCRETE" : "ABSTRACT",
          motors: conversation.processId ? ["A", "B", "C", "D"] : ["C"],
          ragScope: conversation.processId ? "ALL" : "STF_STJ",
          confidence: 0.5,
          method: "heuristic",
        };
      }

      // === BUSCA RAG CONDICIONAL (baseada no intent) ===
      let knowledgeBaseContext = "";
      if (intentResult.ragScope !== "OFF") {
        try {
          const ragService = getRagService();

          // Converter ragScope para filterTypes
          let filterTypes: string[] | undefined;
          if (intentResult.ragScope === "STF_STJ") {
            filterTypes = ["sumula_stf", "sumula_stj", "sumula_vinculante"];
          } else if (intentResult.ragScope === "FILTERED" && intentResult.ragFilter) {
            // Filtros específicos como FONAJE, VINCULANTE, STJ, STF etc
            const filterMap: Record<string, string[]> = {
              "STJ": ["sumula_stj"],
              "STF": ["sumula_stf"],
              "FONAJE": ["enunciado"],
              "VINCULANTE": ["sumula_vinculante"],
              "ENUNCIADOS": ["enunciado"],
              "REPETITIVOS": ["tema_repetitivo"],
            };
            filterTypes = filterMap[intentResult.ragFilter];
          }
          // ragScope === "ALL" ou "USER" não filtra por tipo

          console.log(`[Stream-RAG] filterTypes: ${filterTypes?.join(",") || "ALL"}`);

          const ragResults = await ragService.searchWithHierarchy(content, {
            userId: user.id,
            limit: 12,
            filterTypes,
          });

          console.log(`[Stream-RAG] Documentos encontrados: ${ragResults.length}`);
          ragResults.forEach(d => console.log(`  - ${d.title} (${d.documentType}) sim=${d.similarity.toFixed(3)} [${d.searchMethod}] auth=${d.authorityLevel}`));

          if (ragResults.length > 0) {
            const citableDocs = ragResults.filter(d =>
              d.documentType === 'enunciado' ||
              d.documentType === 'sumula' ||
              d.documentType === 'sumula_stj' ||
              d.documentType === 'sumula_stf' ||
              d.documentType === 'sumula_vinculante'
            );
            const referenceDocs = ragResults.filter(d => !citableDocs.includes(d));

            knowledgeBaseContext = `\n\n## BASE DE CONHECIMENTO\n\n`;

            if (citableDocs.length > 0) {
              knowledgeBaseContext += `### Súmulas e Enunciados Aplicáveis\n\n`;
              citableDocs.forEach((doc) => {
                const contentPreview = doc.content.length > 3000 ? doc.content.substring(0, 3000) + "..." : doc.content;
                knowledgeBaseContext += `**${doc.title}**\n${contentPreview}\n\n`;
              });
              knowledgeBaseContext += `**INSTRUÇÃO:** Cite essas súmulas/enunciados EXPLICITAMENTE. São fontes oficiais.\n\n`;
            }

            if (referenceDocs.length > 0) {
              knowledgeBaseContext += `### Referências Internas\n\n`;
              referenceDocs.forEach((doc) => {
                const contentPreview = doc.content.length > 2000 ? doc.content.substring(0, 2000) + "..." : doc.content;
                knowledgeBaseContext += `${contentPreview}\n\n`;
              });
            }
          }
        } catch (error) {
          console.error("[Stream-RAG] Erro ao buscar documentos:", error);
        }
      } else {
        console.log(`[Stream-RAG] Busca desativada para intent: ${intentResult.intent}`);
      }

      // === MONTAGEM DINÂMICA DO CÉREBRO (usando ContextBuilder v7.1) ===
      const builder = intentResult.path === "ABSTRACT"
        ? createAbstractBuilder(intentResult.intent, intentResult.motors)
        : createConcreteBuilder(intentResult.intent, intentResult.motors);

      // Injetar contexto do processo se houver e se for Caminho Concreto
      if (conversation.processId && intentResult.path === "CONCRETE") {
        const process = await getProcessForContext(conversation.processId);
        if (process) {
          builder.injectProcess({
            processNumber: process.processNumber || undefined,
            plaintiff: process.plaintiff || undefined,
            defendant: process.defendant || undefined,
            court: process.court || undefined,
            subject: process.subject || undefined,
            facts: process.facts || undefined,
            requests: process.requests || undefined,
          });
        }
      }

      // Injetar contexto RAG (se buscou)
      if (knowledgeBaseContext) {
        builder.addSection("RAG", knowledgeBaseContext);
      }

      // Injetar contexto do processo (documentos) se Motor A está ativo
      if (processContext && intentResult.motors.includes("A")) {
        builder.addSection("PROCESSO", processContext);
      }

      // Preferências de estilo
      if (systemPromptOverride) {
        builder.injectStylePreferences(systemPromptOverride);
      }

      // Injetar prompt do módulo especializado
      const modulePrompt = getModulePrompt((moduleSlug || 'default') as any);
      if (modulePrompt) {
        builder.addSection("MODULO", modulePrompt);
      }

      const systemPrompt = builder.build();
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      // Adicionar histórico
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          llmMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Configurar SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // Desabilita buffering do Nginx/proxies
      res.flushHeaders(); // Força envio imediato dos headers

      let fullResponse = "";
      let fullThinking = ""; // Acumular thinking separadamente
      let chunkCount = 0;
      const startTime = Date.now();
      console.log(`[Stream] Starting LLM stream with model: ${llmConfig.model || 'default'}, provider: ${llmConfig.provider || 'default'}`);

      try {
        // PRIORITIZAR o URI do body (enviado pelo frontend) sobre o do banco (pode ter race condition)
        const fileUri = bodyFileUri || conversation.googleFileUri || undefined;
        if (fileUri) {
          console.log(`[Stream] Incluindo arquivo PDF no contexto: ${fileUri}${bodyFileUri ? ' (via body)' : ' (via banco)'}`);
        }

        for await (const yieldData of streamFn({
          messages: llmMessages,
          apiKey: llmConfig.apiKey,
          model: llmConfig.model,
          provider: llmConfig.provider,
          fileUri
        })) {
          if (chunkCount === 0) {
            console.log(`[Stream] First chunk received after ${Date.now() - startTime}ms`);
          }
          chunkCount++;

          if (yieldData.type === "thinking") {
            // Acumular e enviar evento de thinking
            fullThinking += yieldData.text;
            res.write(`data: ${JSON.stringify({ type: "thinking", content: yieldData.text })}\n\n`);
          } else {
            // Enviar conteúdo normal
            fullResponse += yieldData.text;
            res.write(`data: ${JSON.stringify({ type: "chunk", content: yieldData.text })}\n\n`);
          }
        }
        console.log(`[Stream] Completed. Total chunks: ${chunkCount}, Total time: ${Date.now() - startTime}ms`);

        // Extrair thinking do conteúdo se veio junto (Prompt Injection)
        let thinkingToSave = fullThinking;
        let contentToSave = fullResponse;

        // Se thinking veio dentro do conteúdo via tags (Prompt Injection), extrair
        const thinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/);
        if (thinkingMatch) {
          thinkingToSave = thinkingMatch[1].trim();
          contentToSave = fullResponse.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, "").trim();
        }

        // Salvar resposta completa com thinking
        await createMessage({
          conversationId,
          role: "assistant",
          content: contentToSave,
          thinking: thinkingToSave || null, // Salvar thinking se existir
        });

        // Enviar done com thinking para o frontend poder exibir
        res.write(`data: ${JSON.stringify({ type: "done", content: contentToSave, thinking: thinkingToSave })}\n\n`);
        res.end();
      } catch (error: any) {
        console.error("Stream error:", error);
        // Report LLM errors to Sentry
        if (sentryDsn) {
          Sentry.captureException(error, {
            tags: { type: "llm_stream", conversationId },
          });
        }
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        res.write(`data: ${JSON.stringify({ type: "error", content: `Erro na IA: ${errorMessage}` })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("Endpoint error:", error);
      // Report endpoint errors to Sentry
      if (sentryDsn) {
        Sentry.captureException(error, {
          tags: { type: "stream_endpoint" },
        });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Cleanup endpoint para sendBeacon (chamado ao fechar navegador)
  app.post("/api/david/cleanup", async (req, res) => {
    try {
      const { conversationId } = req.body;

      if (!conversationId) {
        res.status(400).json({ error: "conversationId required" });
        return;
      }

      // Importar funções necessárias
      const { getConversationGoogleFile, updateConversationGoogleFile } = await import("../db");
      const { deleteFileFromGoogle } = await import("./fileApi");

      const googleFile = await getConversationGoogleFile(parseInt(conversationId));

      if (googleFile?.googleFileName) {
        try {
          await deleteFileFromGoogle(googleFile.googleFileName);
          console.log(`[Cleanup/Beacon] Arquivo ${googleFile.googleFileName} deletado`);
        } catch (deleteError) {
          console.error("[Cleanup/Beacon] Erro ao deletar:", deleteError);
        }
      }

      // Limpar referências no banco
      await updateConversationGoogleFile(parseInt(conversationId), null, null);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Cleanup/Beacon] Erro:", error);
      res.status(500).json({ error: "Cleanup failed" });
    }
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("[Unhandled Error]", err);

    // Report to Sentry (only 5xx errors to avoid noise)
    if (status >= 500 && sentryDsn) {
      Sentry.captureException(err, {
        tags: {
          endpoint: req.path,
          method: req.method,
        },
      });
    }

    res.status(status).json({ message });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    // await setupVite(app, server); // DISABLED TO AVOID CONFLICT WITH dev:client
    console.log("Vite middleware disabled in dev mode (use npm run dev:client)");
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3001");
  const port = preferredPort;

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/ (bound to 0.0.0.0)`);
  });
}

startServer().catch(console.error);
