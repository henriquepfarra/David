import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createConversation,
  getUserConversations,
  getConversationById,
  updateConversationProcess,
  updateConversationTitle,
  deleteConversation,
  createMessage,
  getConversationMessages,
  createSavedPrompt,
  getUserSavedPrompts,
  getSavedPromptById,
  updateSavedPrompt,
  deleteSavedPrompt,
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
} from "./db";
import { invokeLLM, invokeLLMStream } from "./_core/llm";
import { observable } from "@trpc/server/observable";
import { extractThesisFromDraft } from "./thesisExtractor";
import { generateConversationTitle } from "./titleGenerator";

// System prompt padrão do DAVID
const DEFAULT_DAVID_SYSTEM_PROMPT = `Você é DAVID, um assistente jurídico especializado em processos judiciais brasileiros.

Sua função é auxiliar na análise de processos, geração de minutas e orientação jurídica com base em:
1. Dados do processo fornecido pelo usuário
2. Legislação brasileira (CPC, CDC, CC, etc.)
3. Jurisprudência do TJSP e tribunais superiores
4. Boas práticas jurídicas

Diretrizes:
- Seja preciso, técnico e fundamentado
- Cite sempre a base legal (artigos, leis)
- Quando sugerir jurisprudência, forneça perfis de busca específicos
- NUNCA invente jurisprudência ou dados
- Seja crítico e realista sobre pontos fortes e fracos
- Use linguagem jurídica clara e acessível
- Quando houver processo selecionado, utilize seus dados no contexto

Formato de resposta:
- Use markdown para estruturar
- Destaque pontos importantes em **negrito**
- Use listas quando apropriado
- Cite dispositivos legais entre parênteses (ex: Art. 300, CPC)`;

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

      // Montar contexto do processo se houver
      let processContext = "";
      let similarCasesContext = "";
      
      if (conversation.processId) {
        const process = await getProcessForContext(conversation.processId);
        if (process) {
          processContext = `\n\n## PROCESSO SELECIONADO\n\n**Número:** ${process.processNumber}\n**Autor:** ${process.plaintiff}\n**Réu:** ${process.defendant}\n**Vara:** ${process.court}\n**Assunto:** ${process.subject}\n**Fatos:** ${process.facts}\n**Pedidos:** ${process.requests}\n**Status:** ${process.status}\n`;
          
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

      // Montar mensagens para a IA
      const systemPrompt = input.systemPromptOverride || DEFAULT_DAVID_SYSTEM_PROMPT;
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt + processContext + similarCasesContext },
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

      // Montar contexto do processo se houver
      let processContext = "";
      let similarCasesContext = "";
      
      if (conversation.processId) {
        const process = await getProcessForContext(conversation.processId);
        if (process) {
          processContext = `\n\n## PROCESSO SELECIONADO\n\n**Número:** ${process.processNumber}\n**Autor:** ${process.plaintiff}\n**Réu:** ${process.defendant}\n**Vara:** ${process.court}\n**Assunto:** ${process.subject}\n**Fatos:** ${process.facts}\n**Pedidos:** ${process.requests}\n**Status:** ${process.status}\n`;
          
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

      // Montar mensagens para a IA
      const systemPrompt = input.systemPromptOverride || DEFAULT_DAVID_SYSTEM_PROMPT;
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt + processContext + similarCasesContext },
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

  // Prompts salvos
  savedPrompts: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          category: z.string().optional(),
          content: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createSavedPrompt({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserSavedPrompts(ctx.user.id);
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
          category: z.string().optional(),
          content: z.string().optional(),
          description: z.string().optional(),
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
