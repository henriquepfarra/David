import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createConversation,
  getUserConversations,
  getConversationById,
  updateConversationProcess,
  updateConversationTitle,
  updateConversationGoogleFile,
  getConversationGoogleFile,
  deleteConversation,
  toggleConversationPin,
  createMessage,
  getConversationMessages,
  createSavedPrompt,
  getUserSavedPrompts,
  getSavedPromptsPaginated,
  getSavedPromptById,
  updateSavedPrompt,
  deleteSavedPrompt,
  getUniqueCategories,
  getProcessForContext,
  getDavidConfig,
  upsertDavidConfig,
  createApprovedDraft,
  getUserApprovedDrafts,
  getApprovedDraftById,
  updateApprovedDraft,
  deleteApprovedDraft,
  createLearnedThesis,
  getUserLearnedTheses,
  getLearnedThesisByDraftId,
  updateLearnedThesis,
  deleteLearnedThesis,
  searchSimilarTheses,
  getUserKnowledgeBase,
  getProcessDocuments,
  findConversationsByProcessNumber,
  getUserSettings,
} from "./db";
import { hybridSearch } from "./_core/hybridSearch";
import { invokeLLM, invokeLLMStream, transcribeAudio } from "./_core/llm";
import { observable } from "@trpc/server/observable";
import { extractThesisFromDraft } from "./thesisExtractor";
import { generateConversationTitle } from "./titleGenerator";

// System prompt padrão do DAVID (mantido para fallback em config.get)
import { DEFAULT_DAVID_SYSTEM_PROMPT } from "@shared/defaultPrompts";
import { executeSavedPrompt } from "./_core/promptExecutor";

// Core do DAVID (Identidade + Estilo + Segurança - Universal)
import {
  CORE_IDENTITY,
  CORE_TONE,
  CORE_GATEKEEPER,
  CORE_TRACEABILITY,
  CORE_ZERO_TOLERANCE,
  CORE_TRANSPARENCY,
  CORE_STYLE
} from "./prompts/core";
// Orquestrador + Motores
import {
  CORE_ORCHESTRATOR,
  CORE_MOTOR_A,
  CORE_MOTOR_B,
  CORE_MOTOR_C,
  CORE_MOTOR_D
} from "./prompts/engines";
// Módulo específico (Cartucho JEC)
import { JEC_CONTEXT } from "./modules/jec/context";

export const davidRouter = router({
  // Criar nova conversa
  createConversation: protectedProcedure
    .input(
      z.object({
        processId: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const title = input.title || "Nova conversa";
      const conversationId = await createConversation({
        userId: ctx.user.id,
        processId: input.processId,
        title,
      });
      return { id: conversationId, title };
    }),

  // Melhorar prompt com IA
  enhancePrompt: protectedProcedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Você é um especialista em Prompt Engineering otimizado para tarefas jurídicas. Sua missão é reescrever o prompt do usuário para torná-lo mais claro, estruturado e eficaz para uma LLM jurídica (DAVID). Mantenha a intenção original, mas adicione detalhes se necessário. Responda APENAS com o prompt melhorado, sem aspas e sem explicações."
          },
          { role: "user", content: input.prompt }
        ],
      });

      const content = typeof response.choices[0]?.message?.content === 'string'
        ? response.choices[0].message.content
        : input.prompt;

      return { content };
    }),

  // Transcrever áudio (Whisper)
  transcribeAudio: protectedProcedure
    .input(z.object({ audio: z.string() }))
    .mutation(async ({ input }) => {
      const text = await transcribeAudio(input.audio);
      return { text };
    }),

  // Listar conversas do usuário
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserConversations(ctx.user.id);
  }),

  // Obter conversa específica com mensagens
  getConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.id);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      const messages = await getConversationMessages(input.id);

      // Se houver processo associado, buscar dados
      let processData = null;
      if (conversation.processId) {
        processData = await getProcessForContext(conversation.processId);
      }

      return {
        conversation,
        messages,
        processData,
      };
    }),

  // Atualizar processo da conversa
  updateConversationProcess: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        processId: z.number().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await updateConversationProcess(input.conversationId, input.processId);
      return { success: true };
    }),

  // Renomear conversa
  renameConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        title: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await updateConversationTitle(input.conversationId, input.title);
      return { success: true };
    }),

  // Gerar título automático da conversa
  generateTitle: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      // Se tem processo vinculado, usar número do processo
      if (conversation.processId) {
        const process = await getProcessForContext(conversation.processId);
        if (process?.processNumber) {
          await updateConversationTitle(input.conversationId, `Processo ${process.processNumber}`);
          return { title: `Processo ${process.processNumber}`, source: "process" };
        }
      }

      // Senão, gerar título com IA baseado nas mensagens
      const messages = await getConversationMessages(input.conversationId);
      if (messages.length === 0) {
        return { title: "Nova conversa", source: "default" };
      }

      // Pegar primeira mensagem do usuário para contexto
      const firstUserMessage = messages.find(m => m.role === "user");
      if (!firstUserMessage) {
        return { title: "Nova conversa", source: "default" };
      }

      // Buscar configurações de LLM do usuário
      const settings = await getUserSettings(ctx.user.id);
      if (!settings?.llmApiKey) {
        // Sem API key, usar primeiras palavras
        const words = firstUserMessage.content.split(" ").slice(0, 5).join(" ");
        await updateConversationTitle(input.conversationId, words.length > 50 ? words.substring(0, 47) + "..." : words);
        return { title: words, source: "truncate" };
      }

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Você é um gerador de títulos. Gere um título curto (máximo 5 palavras) para esta conversa jurídica. Responda APENAS com o título, sem aspas, sem explicações."
            },
            { role: "user", content: firstUserMessage.content.substring(0, 500) }
          ],
          apiKey: settings.llmApiKey,
          model: settings.llmModel || undefined,
          provider: settings.llmProvider || undefined
        });

        const title = typeof response.choices[0]?.message?.content === 'string'
          ? response.choices[0].message.content.trim().substring(0, 100)
          : "Nova conversa";

        await updateConversationTitle(input.conversationId, title);
        return { title, source: "ai" };
      } catch (error) {
        console.error("[generateTitle] Erro ao gerar título:", error);
        const words = firstUserMessage.content.split(" ").slice(0, 5).join(" ");
        await updateConversationTitle(input.conversationId, words.length > 50 ? words.substring(0, 47) + "..." : words);
        return { title: words, source: "fallback" };
      }
    }),

  // Deletar conversa
  deleteConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.id);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await deleteConversation(input.id);
      return { success: true };
    }),

  // Deletar conversa se estiver vazia (chamado ao sair)
  cleanupIfEmpty: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        return { deleted: false, reason: "not_found_or_unauthorized" };
      }

      const messages = await getConversationMessages(input.conversationId);
      if (messages.length === 0) {
        await deleteConversation(input.conversationId);
        return { deleted: true };
      }
      return { deleted: false, reason: "has_messages" };
    }),

  // Fixar/desafixar conversa
  togglePin: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.id);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      await toggleConversationPin(input.id);
      return { success: true };
    }),

  // Deletar múltiplas conversas
  deleteMultiple: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      // Verificar se todas as conversas pertencem ao usuário
      for (const id of input.ids) {
        const conversation = await getConversationById(id);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new Error(`Conversa ${id} não encontrada ou não pertence ao usuário`);
        }
      }

      // Deletar todas as conversas
      for (const id of input.ids) {
        await deleteConversation(id);
      }

      return { success: true, deletedCount: input.ids.length };
    }),

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
          const { deleteFileFromGoogle } = await import("./_core/fileApi");
          await deleteFileFromGoogle(googleFile.googleFileName);
          console.log(`[Cleanup] Arquivo ${googleFile.googleFileName} deletado do Google`);
        } catch (error) {
          console.error("[Cleanup] Erro ao deletar arquivo do Google:", error);
        }
      }

      // Limpar referências no banco
      await updateConversationGoogleFile(input.conversationId, null, null);
      return { success: true };
    }),

  // Verificar se processo já existe em outra conversa
  checkDuplicateProcess: protectedProcedure
    .input(
      z.object({
        processNumber: z.string(),
        excludeConversationId: z.number().optional(), // Excluir a conversa atual da busca
      })
    )
    .query(async ({ ctx, input }) => {
      const existingConversations = await findConversationsByProcessNumber(
        ctx.user.id,
        input.processNumber
      );

      // Filtrar a conversa atual se fornecida
      const filtered = input.excludeConversationId
        ? existingConversations.filter(c => c.conversationId !== input.excludeConversationId)
        : existingConversations;

      if (filtered.length > 0) {
        return {
          isDuplicate: true,
          existingConversations: filtered.map(c => ({
            id: c.conversationId,
            title: c.conversationTitle,
          })),
        };
      }

      return { isDuplicate: false, existingConversations: [] };
    }),

  // Enviar mensagem e receber resposta do DAVID
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string(),
        systemPromptOverride: z.string().optional(), // Prompt especializado opcional
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      // Salvar mensagem do usuário
      await createMessage({
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
      });

      // --- MOTOR GENÉRICO DE PROMPTS (Fase 3) ---
      // Se for um comando (ex: /analise_completa), tentar executar prompt salvo
      if (input.content.startsWith("/")) {
        if (conversation.processId) {
          const process = await getProcessForContext(conversation.processId);
          if (process) {
            console.log(`[DavidRouter] Detectado comando: ${input.content}. Verificando prompts salvos...`);
            const commandResult = await executeSavedPrompt({
              userId: ctx.user.id,
              promptCommand: input.content,
              processId: conversation.processId,
              processNumber: process.processNumber
            });

            if (commandResult) {
              console.log(`[DavidRouter] Prompt executado com sucesso: ${input.content}`);
              // Salvar resposta do assistente
              await createMessage({
                conversationId: input.conversationId,
                role: "assistant", // A IA respondeu, mesmo que via prompt fixo
                content: commandResult,
              });
              return { content: commandResult };
            }
          }
        }
      }
      // ------------------------------------------

      // Buscar histórico de mensagens
      const history = await getConversationMessages(input.conversationId);

      // Gerar título automaticamente se for a primeira mensagem
      const isFirstMessage = history.length === 1; // Apenas a mensagem do usuário que acabou de ser salva

      if (isFirstMessage) {
        // Buscar informações do processo se houver
        let processInfo;
        if (conversation.processId) {
          const process = await getProcessForContext(conversation.processId);
          if (process) {
            processInfo = {
              processNumber: process.processNumber || undefined,
              subject: process.subject || undefined,
              plaintiff: process.plaintiff || undefined,
              defendant: process.defendant || undefined,
            };
          }
        }

        // Gerar título em background (não bloqueia resposta)
        generateConversationTitle(input.content, processInfo)
          .then(async (title) => {
            await updateConversationTitle(input.conversationId, title);
            console.log(`[DAVID] Título gerado automaticamente: "${title}"`);
          })
          .catch((error) => {
            console.error('[DAVID] Erro ao gerar título:', error);
          });
      }

      // Buscar documentos relevantes na Base de Conhecimento (RAG)
      let knowledgeBaseContext = "";
      try {
        const allDocs = await getUserKnowledgeBase(ctx.user.id);
        console.log(`[RAG] Total de documentos na base: ${allDocs.length}`);
        if (allDocs.length > 0) {
          // Buscar documentos similares à mensagem do usuário (Busca Híbrida: TF-IDF + Embeddings)
          const relevantDocs = await hybridSearch(
            allDocs.map(doc => ({
              id: doc.id,
              title: doc.title,
              content: doc.content,
              documentType: doc.documentType || undefined,
              embedding: doc.embedding,
            })),
            input.content,
            {
              limit: 12,
              minSimilarity: 0.1,
            }
          );

          console.log(`[RAG] Documentos encontrados: ${relevantDocs.length} (método: ${relevantDocs[0]?.searchMethod || 'n/a'})`);

          if (relevantDocs.length > 0) {
            // Separar documentos citáveis (enunciados e súmulas) de não-citáveis
            const citableDocs = relevantDocs.filter(d => d.documentType === 'enunciado' || d.documentType === 'sumula');
            const referenceDocs = relevantDocs.filter(d => d.documentType !== 'enunciado' && d.documentType !== 'sumula');

            knowledgeBaseContext = `\n\n## BASE DE CONHECIMENTO\n\n`;

            // Enunciados (CITÁVEIS)
            if (citableDocs.length > 0) {
              knowledgeBaseContext += `### Enunciados Aplicáveis\n\n`;
              citableDocs.forEach((doc) => {
                const contentPreview = doc.content.length > 3000
                  ? doc.content.substring(0, 3000) + "..."
                  : doc.content;
                knowledgeBaseContext += `**${doc.title}**\n${contentPreview}\n\n`;
              });
              knowledgeBaseContext += `**INSTRUÇÃO:** Cite esses enunciados EXPLICITAMENTE quando aplicável (ex: "Conforme Enunciado X do FONAJE..."). Eles são fontes oficiais e devem ser mencionados.\n\n`;
            }

            // Minutas/Teses/Decisões (NÃO-CITÁVEIS - apenas referência interna)
            if (referenceDocs.length > 0) {
              knowledgeBaseContext += `### Referências Internas (Uso Implícito)\n\n`;
              referenceDocs.forEach((doc) => {
                const contentPreview = doc.content.length > 2000
                  ? doc.content.substring(0, 2000) + "..."
                  : doc.content;
                knowledgeBaseContext += `${contentPreview}\n\n`;
              });
              knowledgeBaseContext += `**INSTRUÇÃO:** Use o conhecimento acima para enriquecer sua resposta, MAS NÃO cite a fonte (minutas/teses/decisões são repositórios internos). Apresente como seu próprio conhecimento jurídico.\n`;
            }
          }
        }
      } catch (error) {
        console.error("[RAG] Erro ao buscar documentos:", error);
      }

      // Montar contexto do processo se houver
      let processContext = "";
      let similarCasesContext = "";
      let processDocsContext = "";

      if (conversation.processId) {
        const process = await getProcessForContext(conversation.processId);
        if (process) {
          processContext = `\n\n## PROCESSO SELECIONADO\n\n**Número:** ${process.processNumber}\n**Autor:** ${process.plaintiff}\n**Réu:** ${process.defendant}\n**Vara:** ${process.court}\n**Assunto:** ${process.subject}\n**Fatos:** ${process.facts}\n**Pedidos:** ${process.requests}\n**Status:** ${process.status}\n`;

          // Buscar documentos do processo
          try {
            console.log(`[ProcessDocs] Buscando documentos para processId=${conversation.processId}, userId=${ctx.user.id}`);
            const processDocs = await getProcessDocuments(conversation.processId, ctx.user.id);
            console.log(`[ProcessDocs] Encontrados ${processDocs.length} documentos`);
            if (processDocs.length > 0) {
              processDocsContext = `\n\n### DOCUMENTOS DO PROCESSO\n\n`;
              processDocs.forEach((doc: any) => {
                const contentPreview = doc.content.length > 2000
                  ? doc.content.substring(0, 2000) + "..."
                  : doc.content;
                processDocsContext += `**${doc.title}** (${doc.documentType})\n${contentPreview}\n\n`;
              });
              processDocsContext += `**INSTRUÇÃO:** Use o conteúdo dos documentos acima como referência para suas respostas. Eles contêm informações importantes do processo.\n`;
            }
          } catch (error) {
            console.error("[ProcessDocs] Erro ao buscar documentos:", error);
          }
          console.log(`[ProcessDocs] processDocsContext length: ${processDocsContext.length}`);

          // Buscar casos similares baseados no assunto
          if (process.subject) {
            const keywords = process.subject.split(" ").filter(w => w.length > 3).slice(0, 5);
            const similarTheses = await searchSimilarTheses(ctx.user.id, keywords);

            if (similarTheses.length > 0) {
              similarCasesContext = `\n\n## MEMÓRIA: CASOS SIMILARES JÁ DECIDIDOS POR VOCÊ\n\n`;
              similarCasesContext += `Encontrei ${similarTheses.length} decisões suas anteriores sobre temas relacionados. Use-as como referência:\n\n`;

              similarTheses.forEach((thesis, index) => {
                similarCasesContext += `### Precedente ${index + 1}\n`;
                similarCasesContext += `**Tese Firmada:** ${thesis.thesis}\n`;
                similarCasesContext += `**Fundamentos:** ${thesis.legalFoundations}\n`;
                similarCasesContext += `**Palavras-chave:** ${thesis.keywords}\n\n`;
              });

              similarCasesContext += `\n**INSTRUÇÃO:** Ao gerar minutas, considere essas decisões anteriores para manter consistência e aplicar teses já firmadas. Se houver divergência, mencione ao usuário.\n`;
            }
          }
        }
      }

      // MONTAGEM DINÂMICA DO CÉREBRO (Brain Assembly)
      // Core (Universal) + Módulo (JEC) + Orquestrador
      const baseSystemPrompt = `
${CORE_IDENTITY}
${CORE_TONE}
${CORE_GATEKEEPER}
${CORE_TRACEABILITY}
${CORE_ZERO_TOLERANCE}
${CORE_TRANSPARENCY}
${CORE_STYLE}
${JEC_CONTEXT}
${CORE_ORCHESTRATOR}
${CORE_MOTOR_A}
${CORE_MOTOR_B}
${CORE_MOTOR_C}
${CORE_MOTOR_D}
`;

      // Preferências de Estilo do Gabinete (CONCATENA, não substitui)
      const stylePreferences = input.systemPromptOverride
        ? `\n[PREFERÊNCIAS DE ESTILO DO GABINETE]\n${input.systemPromptOverride}`
        : "";
      const systemPrompt = baseSystemPrompt + stylePreferences;
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt + knowledgeBaseContext + processContext + processDocsContext + similarCasesContext },
      ];

      // Adicionar histórico (últimas 10 mensagens para não estourar contexto)
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          llmMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Chamar LLM
      const response = await invokeLLM({
        messages: llmMessages,
      });

      const assistantMessage = typeof response.choices[0]?.message?.content === 'string'
        ? response.choices[0].message.content
        : "Desculpe, não consegui gerar uma resposta.";

      // Salvar resposta do DAVID
      await createMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: assistantMessage,
      });

      return {
        content: assistantMessage,
      };
    }),

  // Enviar mensagem com streaming
  sendMessageStream: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string(),
        systemPromptOverride: z.string().optional(),
      })
    )
    .subscription(async function* ({ ctx, input }) {
      const conversation = await getConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversa não encontrada");
      }

      // Salvar mensagem do usuário
      await createMessage({
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
      });

      // --- MOTOR GENÉRICO DE PROMPTS (Fase 3) ---
      if (input.content.startsWith("/")) {
        if (conversation.processId) {
          const process = await getProcessForContext(conversation.processId);
          if (process) {
            console.log(`[DavidRouter] Detectado comando (Stream): ${input.content}`);
            const commandResult = await executeSavedPrompt({
              userId: ctx.user.id,
              promptCommand: input.content,
              processId: conversation.processId,
              processNumber: process.processNumber
            });

            if (commandResult) {
              // Salvar resposta
              await createMessage({
                conversationId: input.conversationId,
                role: "assistant",
                content: commandResult,
              });

              // Emular stream (envia tudo de uma vez por enquanto)
              yield { type: "chunk", content: commandResult };
              yield { type: "done", content: commandResult };
              return;
            }
          }
        }
      }
      // ------------------------------------------

      // Buscar histórico de mensagens
      const history = await getConversationMessages(input.conversationId);

      // Gerar título automaticamente se for a primeira mensagem
      const isFirstMessage = history.length === 1; // Apenas a mensagem do usuário que acabou de ser salva

      if (isFirstMessage) {
        // Buscar informações do processo se houver
        let processInfo;
        if (conversation.processId) {
          const process = await getProcessForContext(conversation.processId);
          if (process) {
            processInfo = {
              processNumber: process.processNumber || undefined,
              subject: process.subject || undefined,
              plaintiff: process.plaintiff || undefined,
              defendant: process.defendant || undefined,
            };
          }
        }

        // Gerar título em background (não bloqueia resposta)
        generateConversationTitle(input.content, processInfo)
          .then(async (title) => {
            await updateConversationTitle(input.conversationId, title);
            console.log(`[DAVID] Título gerado automaticamente: "${title}"`);
          })
          .catch((error) => {
            console.error('[DAVID] Erro ao gerar título:', error);
          });
      }

      // Buscar documentos relevantes na Base de Conhecimento (RAG)
      let knowledgeBaseContext = "";
      try {
        const allDocs = await getUserKnowledgeBase(ctx.user.id);
        console.log(`[RAG-Stream] Total de documentos na base: ${allDocs.length}`);
        if (allDocs.length > 0) {
          // Buscar documentos similares à mensagem do usuário (Busca Híbrida: TF-IDF + Embeddings)
          const relevantDocs = await hybridSearch(
            allDocs.map(doc => ({
              id: doc.id,
              title: doc.title,
              content: doc.content,
              documentType: doc.documentType || undefined,
              embedding: doc.embedding,
            })),
            input.content,
            {
              limit: 12,
              minSimilarity: 0.1,
            }
          );

          console.log(`[RAG-Stream] Documentos encontrados: ${relevantDocs.length} (método: ${relevantDocs[0]?.searchMethod || 'n/a'})`);

          if (relevantDocs.length > 0) {
            // Separar documentos citáveis (enunciados e súmulas) de não-citáveis
            const citableDocs = relevantDocs.filter(d => d.documentType === 'enunciado' || d.documentType === 'sumula');
            const referenceDocs = relevantDocs.filter(d => d.documentType !== 'enunciado' && d.documentType !== 'sumula');

            knowledgeBaseContext = `\n\n## BASE DE CONHECIMENTO\n\n`;

            // Enunciados (CITÁVEIS)
            if (citableDocs.length > 0) {
              knowledgeBaseContext += `### Enunciados Aplicáveis\n\n`;
              citableDocs.forEach((doc) => {
                const contentPreview = doc.content.length > 3000
                  ? doc.content.substring(0, 3000) + "..."
                  : doc.content;
                knowledgeBaseContext += `**${doc.title}**\n${contentPreview}\n\n`;
              });
              knowledgeBaseContext += `**INSTRUÇÃO:** Cite esses enunciados EXPLICITAMENTE quando aplicável (ex: "Conforme Enunciado X do FONAJE..."). Eles são fontes oficiais e devem ser mencionados.\n\n`;
            }

            // Minutas/Teses/Decisões (NÃO-CITÁVEIS - apenas referência interna)
            if (referenceDocs.length > 0) {
              knowledgeBaseContext += `### Referências Internas (Uso Implícito)\n\n`;
              referenceDocs.forEach((doc) => {
                const contentPreview = doc.content.length > 2000
                  ? doc.content.substring(0, 2000) + "..."
                  : doc.content;
                knowledgeBaseContext += `${contentPreview}\n\n`;
              });
              knowledgeBaseContext += `**INSTRUÇÃO:** Use o conhecimento acima para enriquecer sua resposta, MAS NÃO cite a fonte (minutas/teses/decisões são repositórios internos). Apresente como seu próprio conhecimento jurídico.\n`;
            }
          }
        }
      } catch (error) {
        console.error("[RAG] Erro ao buscar documentos:", error);
      }

      // Montar contexto do processo se houver
      let processContext = "";
      let similarCasesContext = "";
      let processDocsContext = "";

      if (conversation.processId) {
        const process = await getProcessForContext(conversation.processId);
        if (process) {
          processContext = `\n\n## PROCESSO SELECIONADO\n\n**Número:** ${process.processNumber}\n**Autor:** ${process.plaintiff}\n**Réu:** ${process.defendant}\n**Vara:** ${process.court}\n**Assunto:** ${process.subject}\n**Fatos:** ${process.facts}\n**Pedidos:** ${process.requests}\n**Status:** ${process.status}\n`;

          // Buscar documentos do processo
          try {
            console.log(`[ProcessDocs] Buscando documentos para processId=${conversation.processId}, userId=${ctx.user.id}`);
            const processDocs = await getProcessDocuments(conversation.processId, ctx.user.id);
            console.log(`[ProcessDocs] Encontrados ${processDocs.length} documentos`);
            if (processDocs.length > 0) {
              processDocsContext = `\n\n### DOCUMENTOS DO PROCESSO\n\n`;
              processDocs.forEach((doc: any) => {
                const contentPreview = doc.content.length > 2000
                  ? doc.content.substring(0, 2000) + "..."
                  : doc.content;
                processDocsContext += `**${doc.title}** (${doc.documentType})\n${contentPreview}\n\n`;
              });
              processDocsContext += `**INSTRUÇÃO:** Use o conteúdo dos documentos acima como referência para suas respostas. Eles contêm informações importantes do processo.\n`;
            }
          } catch (error) {
            console.error("[ProcessDocs] Erro ao buscar documentos:", error);
          }
          console.log(`[ProcessDocs] processDocsContext length: ${processDocsContext.length}`);

          // Buscar casos similares baseados no assunto
          if (process.subject) {
            const keywords = process.subject.split(" ").filter(w => w.length > 3).slice(0, 5);
            const similarTheses = await searchSimilarTheses(ctx.user.id, keywords);

            if (similarTheses.length > 0) {
              similarCasesContext = `\n\n## MEMÓRIA: CASOS SIMILARES JÁ DECIDIDOS POR VOCÊ\n\n`;
              similarCasesContext += `Encontrei ${similarTheses.length} decisões suas anteriores sobre temas relacionados. Use-as como referência:\n\n`;

              similarTheses.forEach((thesis, index) => {
                similarCasesContext += `### Precedente ${index + 1}\n`;
                similarCasesContext += `**Tese Firmada:** ${thesis.thesis}\n`;
                similarCasesContext += `**Fundamentos:** ${thesis.legalFoundations}\n`;
                similarCasesContext += `**Palavras-chave:** ${thesis.keywords}\n\n`;
              });

              similarCasesContext += `\n**INSTRUÇÃO:** Ao gerar minutas, considere essas decisões anteriores para manter consistência e aplicar teses já firmadas. Se houver divergência, mencione ao usuário.\n`;
            }
          }
        }
      }

      // MONTAGEM DINÂMICA DO CÉREBRO (Brain Assembly)
      // Core (Universal) + Estilo + Módulo (JEC) + Orquestrador + Motores
      const baseSystemPrompt = `
${CORE_IDENTITY}
${CORE_TONE}
${CORE_GATEKEEPER}
${CORE_TRACEABILITY}
${CORE_ZERO_TOLERANCE}
${CORE_TRANSPARENCY}
${CORE_STYLE}
${JEC_CONTEXT}
${CORE_ORCHESTRATOR}
${CORE_MOTOR_A}
${CORE_MOTOR_B}
${CORE_MOTOR_C}
${CORE_MOTOR_D}
`;

      // Preferências de Estilo do Gabinete (CONCATENA, não substitui)
      const stylePreferences = input.systemPromptOverride
        ? `\n[PREFERÊNCIAS DE ESTILO DO GABINETE]\n${input.systemPromptOverride}`
        : "";
      const systemPrompt = baseSystemPrompt + stylePreferences;
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt + knowledgeBaseContext + processContext + processDocsContext + similarCasesContext },
      ];

      // Adicionar histórico (últimas 10 mensagens)
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          llmMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Stream da resposta
      let fullResponse = "";
      try {
        for await (const chunk of invokeLLMStream({ messages: llmMessages })) {
          fullResponse += chunk;
          yield { type: "chunk" as const, content: chunk };
        }

        // Salvar resposta completa do DAVID
        await createMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: fullResponse,
        });

        yield { type: "done" as const, content: fullResponse };
      } catch (error) {
        console.error("Stream error:", error);
        yield { type: "error" as const, content: "Erro ao gerar resposta" };
      }
    }),

  // Coleções de Prompts
  promptCollections: router({
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { createPromptCollection } = await import("./db");
        const id = await createPromptCollection({
          userId: ctx.user.id,
          name: input.name,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserPromptCollections } = await import("./db");
      return await getUserPromptCollections(ctx.user.id);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deletePromptCollection } = await import("./db");
        await deletePromptCollection(input.id);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).max(100) }))
      .mutation(async ({ input }) => {
        const { updatePromptCollection } = await import("./db");
        await updatePromptCollection(input.id, input.name);
        return { success: true };
      }),
  }),

  // Prompts salvos
  savedPrompts: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          collectionId: z.number().optional().nullable(),
          category: z.string().optional(), // DEPRECATED
          content: z.string(),
          description: z.string().optional(),
          executionMode: z.enum(["chat", "full_context"]).optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createSavedPrompt({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          collectionId: input.collectionId ?? undefined,
          category: input.category,
          description: input.description,
          executionMode: input.executionMode || "chat",
          tags: input.tags,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserSavedPrompts(ctx.user.id);
    }),

    getCategoryStats: protectedProcedure.query(async ({ ctx }) => {
      return await getUniqueCategories(ctx.user.id);
    }),

    listPaginated: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().optional(), // ID do último item
        search: z.string().optional(),
        category: z.string().nullable().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await getSavedPromptsPaginated({
          userId: ctx.user.id,
          ...input,
        });
      }),

    seedDefaultTutela: protectedProcedure.mutation(async ({ ctx }) => {
      // Verifica se já existe
      const existing = await getUserSavedPrompts(ctx.user.id);
      const hasTutela = existing.some((p) => p.category === "tutela" && p.isDefault === 1);

      if (hasTutela) {
        return { success: false, message: "Prompt padrão já existe" };
      }

      const TUTELA_PROMPT = `Analise criticamente o processo e documentos anexos para avaliar a viabilidade do pedido de tutela de urgência, com base no Art. 300 do CPC. Considere:

Fontes de Fundamentação (Ordem Hierárquica):

1. Parâmetros definidos em conversas anteriores desta sessão.
2. Arquivos da base de conhecimento (use RAG para extrair dados específicos, como cláusulas contratuais ou provas documentais).
3. Conhecimento jurídico consolidado e raciocínio crítico.
4. Jurisprudência do TJSP e STJ sobre o tema (apenas quando necessário; forneça perfis de busca, ex.: "precedentes do STJ sobre tutela em contratos consumeristas de 2020-2025", sem citar casos inventados).

Estrutura da Análise:

**Contextualização Inicial**

- Síntese dos fatos relevantes (máximo 150 palavras, focando em elementos chave como partes, controvérsia e provas iniciais).
- Pedido de tutela formulado (descreva o objeto específico da liminar e os efeitos pretendidos).
- Rito processual: Confirme compatibilidade com o Juizado Especial Cível (verifique ausência de complexidade probatória ou necessidade de perícia).

**Análise dos Requisitos Cumulativos (Art. 300, CPC)**

A) Probabilidade do Direito (Fumus Boni Iuris)

- A narrativa fática e provas iniciais demonstram plausibilidade jurídica? Avalie robustez dos documentos para cognição sumária.
- Há fundamento legal claro (cite artigos relevantes, ex.: CDC Art. 6º para direitos consumeristas)?
- Classificação: ☐ Forte (ex.: provas irrefutáveis) ☐ Moderada (ex.: indícios consistentes) ☐ Fraca (ex.: alegações genéricas) ☐ Ausente. Justificativa obrigatória.

B) Perigo de Dano ou Risco ao Resultado Útil (Periculum in Mora)

- Demonstração concreta de dano irreparável ou de difícil reparação se houver demora?
- Urgência é evidente, específica e temporal (ex.: risco iminente de perda financeira comprovada por extratos)?
- Classificação: ☐ Demonstrado (ex.: elementos objetivos claros) ☐ Parcialmente demonstrado (ex.: indícios, mas genéricos) ☐ Não demonstrado. Justificativa obrigatória.

C) Reversibilidade da Medida

- A tutela é reversível em caso de improcedência final? Avalie risco de lesão grave à parte contrária (ex.: impactos financeiros mensuráveis).
- Avaliação: ☐ Reversível (ex.: medida cautelar simples) ☐ Parcialmente reversível (ex.: com caução possível) ☐ Irreversível. Justificativa obrigatória.

**Parecer Conclusivo**

Baseado na análise cumulativa:
- ☐ Deferimento Recomendado: Fundamentos (presença de fumus boni iuris e periculum in mora); sugestão de jurisprudência (ex.: perfil de busca no STJ).
- ☐ Indeferimento Recomendado: Requisito(s) não preenchido(s); justificativa técnica (ex.: "ausente periculum in mora, pois dano é reparável por perdas e danos").
- ☐ Postergação da Análise: Justificativa (ex.: necessidade de contraditório); diligências sugeridas (ex.: citação prévia ou produção de prova mínima).

**Observações Complementares**

- Pontos de atenção processual (ex.: prazos para recurso).
- Riscos jurídicos identificados (ex.: possibilidade de multa por litigância de má-fé).
- Sugestões de reforço argumentativo (ex.: anexar mais provas para fortalecer fumus boni iuris).

Diretrizes de Execução:

- **Objetividade**: Análise técnica, direta e fundamentada em fatos reais (nunca invente jurisprudência ou dados).
- **Criticidade**: Avalie realisticamente pontos fortes e fracos, com exemplos concretos.
- **Pragmatismo**: Foque na viabilidade prática da concessão, considerando o contexto judicial.
- **Fundamentação**: Cite dispositivos legais e perfis de jurisprudência relevantes.
- **Clareza**: Linguagem jurídica precisa, acessível e concisa; use RAG para consultas específicas em documentos.`;

      const id = await createSavedPrompt({
        userId: ctx.user.id,
        title: "Análise de Tutela de Urgência (Art. 300 CPC)",
        category: "tutela",
        content: TUTELA_PROMPT,
        description: "Análise criteriosa de viabilidade de tutela de urgência com base no Art. 300 do CPC, avaliando fumus boni iuris, periculum in mora e reversibilidade.",
        isDefault: 1,
      });

      return { success: true, id };
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const prompt = await getSavedPromptById(input.id);
        if (!prompt || prompt.userId !== ctx.user.id) {
          throw new Error("Prompt não encontrado");
        }
        return prompt;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          collectionId: z.number().nullable().optional(),
          category: z.string().nullable().optional(), // DEPRECATED
          content: z.string().optional(),
          description: z.string().optional(),
          executionMode: z.enum(["chat", "full_context"]).optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const prompt = await getSavedPromptById(id);
        if (!prompt || prompt.userId !== ctx.user.id) {
          throw new Error("Prompt não encontrado");
        }

        await updateSavedPrompt(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const prompt = await getSavedPromptById(input.id);
        if (!prompt || prompt.userId !== ctx.user.id) {
          throw new Error("Prompt não encontrado");
        }

        await deleteSavedPrompt(input.id);
        return { success: true };
      }),

    applyToConversation: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          promptId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const prompt = await getSavedPromptById(input.promptId);
        if (!prompt || prompt.userId !== ctx.user.id) {
          throw new Error("Prompt não encontrado");
        }

        // Adicionar mensagem do usuário com o conteúdo do prompt
        const messageId = await createMessage({
          conversationId: input.conversationId,
          role: "user",
          content: prompt.content,
        });

        return { success: true, messageId };
      }),
  }),

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

        // Se foi aprovada (não rejeitada), extrair tese automaticamente
        if (input.approvalStatus !== "rejected") {
          try {
            const draftContent = input.editedDraft || input.originalDraft;
            const extracted = await extractThesisFromDraft(draftContent, input.draftType);

            // Salvar tese extraída
            await createLearnedThesis({
              userId: ctx.user.id,
              approvedDraftId: draftId,
              processId: input.processId,
              thesis: extracted.thesis,
              legalFoundations: extracted.legalFoundations,
              keywords: extracted.keywords,
              decisionPattern: extracted.decisionPattern,
            });
          } catch (error) {
            console.error("Erro ao extrair tese automaticamente:", error);
            // Não falhar a aprovação se a extração falhar
          }
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
          ...input,
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
