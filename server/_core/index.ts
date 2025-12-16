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
import { getConversationById, getConversationMessages, createMessage, getProcessForContext, getUserSettings } from "../db";
import { invokeLLMStream as streamFn } from "../_core/llm";
import { sdk } from "./sdk";



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

      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch (error) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }


      const { conversationId, content, systemPromptOverride } = req.body;

      // Buscar configurações de LLM do usuário
      const settings = await getUserSettings(user.id);
      const llmConfig = {
        apiKey: settings?.llmApiKey || undefined,
        model: settings?.llmModel || undefined,
        provider: settings?.llmProvider || undefined
      };

      const conversation = await getConversationById(conversationId);
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
        }
      }

      // System prompt
      const DEFAULT_DAVID_SYSTEM_PROMPT = `Você é DAVID, um assistente jurídico especializado em processos judiciais brasileiros.\n\nSua função é auxiliar na análise de processos, geração de minutas e orientação jurídica com base em:\n1. Dados do processo fornecido pelo usuário\n2. Legislação brasileira (CPC, CDC, CC, etc.)\n3. Jurisprudência do TJSP e tribunais superiores\n4. Boas práticas jurídicas\n\nDiretrizes:\n- Seja preciso, técnico e fundamentado\n- Cite sempre a base legal (artigos, leis)\n- Quando sugerir jurisprudência, forneça perfis de busca específicos\n- NUNCA invente jurisprudência ou dados\n- Seja crítico e realista sobre pontos fortes e fracos\n- Use linguagem jurídica clara e acessível\n- Quando houver processo selecionado, utilize seus dados no contexto\n\nFormato de resposta:\n- Use markdown para estruturar\n- Destaque pontos importantes em **negrito**\n- Use listas quando apropriado\n- Cite dispositivos legais entre parênteses (ex: Art. 300, CPC)`;

      const systemPrompt = systemPromptOverride || DEFAULT_DAVID_SYSTEM_PROMPT;
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt + processContext },
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
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";

      try {
        // streamFn is now statically imported

        for await (const chunk of streamFn({
          messages: llmMessages,
          apiKey: llmConfig.apiKey,
          model: llmConfig.model,
          provider: llmConfig.provider
        })) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        }

        // Salvar resposta completa
        await createMessage({
          conversationId,
          role: "assistant",
          content: fullResponse,
        });

        res.write(`data: ${JSON.stringify({ type: "done", content: fullResponse })}\n\n`);
        res.end();
      } catch (error) {
        console.error("Stream error:", error);
        res.write(`data: ${JSON.stringify({ type: "error", content: "Erro ao gerar resposta" })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("Endpoint error:", error);
      res.status(500).json({ error: "Internal server error" });
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
