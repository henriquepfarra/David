// Polyfill for crypto in Node.js (required for jose library)
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

console.log("🚀 Server process starting...");
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);

import "dotenv/config";
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
import { createChatBuilder } from "../services/ContextBuilder";

// Cartucho JEC
import { JEC_CONTEXT } from "../modules/jec/context";

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
  app.use(cors({
    origin: true, // Allow all origins (reflects the request origin)
    credentials: true
  }));

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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


      const { conversationId, content, systemPromptOverride } = req.body;

      // Buscar configurações de LLM do usuário
      const settings = await getUserSettings(user.id);

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

      // === BUSCA RAG COM HIERARQUIA (usando RagService) ===
      let knowledgeBaseContext = "";
      try {
        const ragService = getRagService();
        const ragResults = await ragService.searchWithHierarchy(content, {
          userId: user.id,
          limit: 12,
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

      // MONTAGEM DINÂMICA DO CÉREBRO (usando ContextBuilder)
      const builder = createChatBuilder();

      // Injetar contexto do processo se houver
      if (conversation.processId) {
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

      // Injetar contexto RAG
      if (knowledgeBaseContext) {
        builder.addSection("RAG", knowledgeBaseContext);
      }

      // Injetar contexto do processo (documentos)
      if (processContext) {
        builder.addSection("PROCESSO", processContext);
      }

      // Preferências de estilo
      if (systemPromptOverride) {
        builder.injectStylePreferences(systemPromptOverride);
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
        // streamFn is now statically imported

        for await (const yieldData of streamFn({
          messages: llmMessages,
          apiKey: llmConfig.apiKey,
          model: llmConfig.model,
          provider: llmConfig.provider
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
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        res.write(`data: ${JSON.stringify({ type: "error", content: `Erro na IA: ${errorMessage}` })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("Endpoint error:", error);
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
