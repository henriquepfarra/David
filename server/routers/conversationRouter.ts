/**
 * conversationRouter - Sub-router para CRUD de conversas
 * 
 * Extraído de davidRouter.ts para modularização
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
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
    getConversationMessages,
    getProcessForContext,
    findConversationsByProcessNumber,
    getUserSettings,
} from "../db";
import { invokeLLM } from "../_core/llm";

export const conversationRouter = router({
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

    // Upload de arquivo com extração automática de metadados
    uploadFileWithMetadata: protectedProcedure
        .input(
            z.object({
                conversationId: z.number(),
                googleFileUri: z.string(),
                googleFileName: z.string(),
                extractedText: z.string(), // Texto extraído do PDF (primeiras páginas)
            })
        )
        .mutation(async ({ ctx, input }) => {
            const conversation = await getConversationById(input.conversationId);
            if (!conversation || conversation.userId !== ctx.user.id) {
                throw new Error("Conversa não encontrada");
            }

            // Salvar URI do arquivo
            await updateConversationGoogleFile(
                input.conversationId,
                input.googleFileUri,
                input.googleFileName
            );

            // Tentar extrair metadados do processo
            let processMetadata = null;
            let processId = null;
            let isDuplicateProcess = false;

            if (input.extractedText.length > 100) {
                try {
                    const { extractProcessMetadata } = await import("../services/ProcessMetadataExtractor");
                    const { upsertProcessMetadata } = await import("../db");
                    const settings = await getUserSettings(ctx.user.id);

                    // Extrair metadados com LLM
                    const metadata = await extractProcessMetadata(
                        input.extractedText,
                        settings?.llmApiKey || undefined
                    );

                    if (metadata.processNumber) {
                        // Auto-save metadados (só se processNumber for válido)
                        const result = await upsertProcessMetadata(
                            {
                                processNumber: metadata.processNumber,
                                plaintiff: metadata.plaintiff,
                                defendant: metadata.defendant,
                                court: metadata.court,
                                subject: metadata.subject,
                            },
                            ctx.user.id
                        );
                        processId = result.processId;
                        processMetadata = metadata;
                        isDuplicateProcess = !result.isNew;

                        // Vincular processo à conversa
                        await updateConversationProcess(input.conversationId, processId);

                        console.log(`[Upload] Processo ${result.isNew ? 'criado' : 'atualizado'}: ${metadata.processNumber}`);
                    }
                } catch (error) {
                    console.error("[Upload] Erro ao extrair metadados:", error);
                    // Não falhar o upload se extração falhar
                }
            }

            return {
                success: true,
                processMetadata,
                processId,
                isDuplicateProcess,
            };
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
                    const { deleteFileFromGoogle } = await import("../_core/fileApi");
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
});
