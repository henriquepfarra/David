/**
 * /analise1 Command Handler - Triagem Inicial (JEC Only)
 * 
 * Handler simplificado que usa PromptBuilder + prompt específico do comando.
 * Faz UMA única chamada à LLM (não 6 fragmentadas).
 * 
 * Usage: /analise1 (requires process attached)
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

import { registerCommand } from '../registry'
import { commandLock } from '../lock'
import type { CommandHandler, CommandContext } from '../types'
import { getRagService } from '../../services/RagService'
import { getConversationMessages } from '../../db'
import { getUserSettings } from '../../db'
import { ANALISE1_COMMAND_PROMPT } from '../prompts/analise1-command'
import { ANALISE1_THINKING } from '../prompts/analise1/thinking'
import {
    CORE_IDENTITY,
    CORE_TONE,
    CORE_GATEKEEPER,
    CORE_TRACEABILITY,
    CORE_ZERO_TOLERANCE,
    CORE_TRANSPARENCY,
    CORE_STYLE,
} from '../../prompts/core'
import { JEC_CONTEXT } from '../../modules/jec/context'
import { ENV } from '../../_core/env'



// ============================================
// HANDLER
// ============================================

export const analise1Handler: CommandHandler = async function* (ctx: CommandContext) {
    const { userId, conversationId, processId, fileUri, pdfExtractedText, moduleSlug, signal } = ctx
    const startTime = Date.now()
    const userIdNum = parseInt(userId)

    // Validate module
    if (moduleSlug !== 'jec') {
        yield {
            type: 'command_error',
            error: '⚠️ O comando /analise1 está disponível apenas no módulo JEC (Juizado Especial Cível).\n\nAltere o módulo ativo para JEC e tente novamente.',
        }
        return
    }

    // Validate file (PDF anexado) - agora validamos fileUri ao invés de processId
    if (!fileUri) {
        yield {
            type: 'command_error',
            error: '⚠️ O comando /analise1 requer um PDF anexado.\n\nEnvie um PDF de petição inicial primeiro.',
        }
        return
    }

    // Acquire lock
    if (!commandLock.acquire(userId, '/analise1', conversationId)) {
        yield {
            type: 'command_error',
            error: '⏳ Você já tem um comando em execução. Aguarde a conclusão.',
        }
        return
    }

    try {
        // Get user settings
        const settings = await getUserSettings(userIdNum)

        // Start command
        yield {
            type: 'command_start',
            command: '/analise1',
            totalSteps: 1, // Agora é UMA única chamada
        }

        // ============================================
        // PREPARAÇÃO DO CONTEXTO
        // ============================================

        yield {
            type: 'step_start',
            step: 'analise',
            name: 'Triagem Inicial',
            description: 'Executando análise completa (6 etapas)...',
            totalSteps: 1,
            currentStep: 1,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'analise' }
            return
        }

        // Get conversation data
        const conversationHistory = await getConversationMessages(parseInt(conversationId))
        const recentHistory = conversationHistory.slice(-10).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }))

        // fileUri já vem do contexto (validado acima)
        const isGoogleProvider = !settings?.llmProvider || settings.llmProvider.toLowerCase() === 'google'

        // ============================================
        // EXTRAÇÃO DE PDF (LOCAL PRIMEIRO, FILEAPI FALLBACK)
        // ============================================

        let pdfTextContext = ''

        if (pdfExtractedText) {
            // TEXTO LOCAL: Extraído via pdf.js no upload (custo zero)
            // Prioridade para TODOS os providers (inclusive Google)
            pdfTextContext = `\n\n--- CONTEUDO DO DOCUMENTO ANEXADO (PDF) ---\n${pdfExtractedText}\n------------------------------------------\n`
            console.log(`[analise1] PDF via texto local (${pdfExtractedText.length} chars)`)
        } else if (!isGoogleProvider && fileUri) {
            // FALLBACK: PDF escaneado/low-quality + provider não-Google
            console.log(`[analise1] PDF fallback via FileAPI (scanned/low-quality): ${fileUri}`)
            try {
                const { readContentFromUri } = await import('../../_core/fileApi')
                const readerKey = settings?.readerApiKey || ENV.geminiApiKey

                if (readerKey) {
                    const extractedText = await readContentFromUri(fileUri, readerKey)
                    pdfTextContext = `\n\n--- CONTEUDO DO DOCUMENTO ANEXADO (PDF) ---\n${extractedText}\n------------------------------------------\n`
                    console.log(`[analise1] FileAPI: extraído com sucesso (${extractedText.length} chars)`)
                } else {
                    console.warn('[analise1] Nenhuma chave disponível para FileAPI')
                    pdfTextContext = '\n\n[AVISO: Não foi possível ler o PDF. Configure uma chave de leitura do Google.]\n'
                }
            } catch (error) {
                console.error('[analise1] Erro ao extrair texto do PDF via FileAPI:', error)
                pdfTextContext = '\n\n[ERRO: Falha na leitura do documento.]\n'
            }
        }
        // Se Google + sem texto local (scan) → fileUri nativo será passado no invokeLLM abaixo

        // ============================================
        // BUSCAR TESES RELEVANTES (RAG)
        // ============================================

        const ragService = getRagService()
        const theses = await ragService.searchLegalTheses(
            'tutela urgência consumidor JEC legitimidade competência',
            userIdNum,
            { limit: 5, threshold: 0.4 }
        )

        let ragContext = ''
        if (theses.length > 0) {
            ragContext = '\n\n[BASE DE CONHECIMENTO - TESES E DIRETRIZES]\n' +
                theses.map(t => `- [${t.id}] ${t.legalThesis}`).join('\n')
        }

        // ============================================
        // CONSTRUIR SYSTEM PROMPT COMPLETO (SEM IntentService)
        // ============================================

        // Para /analise1, forçamos TODOS os motores (A, B, C, D)
        // Não usamos buildSystemPrompt porque ele usaria IntentService
        // que classificaria "/analise1" como CASUAL incorretamente

        // Construir prompt base para /analise1 (sem CORE_THINKING genérico)
        // Usamos ANALISE1_THINKING específico que é focado em diagnóstico do caso
        const baseSystemPrompt = `
${CORE_IDENTITY}
${CORE_TONE}
${CORE_GATEKEEPER}
${CORE_TRACEABILITY}
${CORE_ZERO_TOLERANCE}
${CORE_TRANSPARENCY}
${CORE_STYLE}
${JEC_CONTEXT}
${ANALISE1_THINKING}
`

        // Instruções especiais para análise
        const analysisInstruction = `
⚠️ MODO ANÁLISE ATIVADO ⚠️
Esta é uma solicitação de ANÁLISE utilizando o comando /analise1.
Execute TODOS os motores (A, B, C, D) para análise crítica completa.
O PDF anexado contém a petição inicial que deve ser analisada.
`

        // Prompt final: Base + PDF (se extraído) + Análise + RAG + Comando específico
        const fullSystemPrompt = baseSystemPrompt + pdfTextContext + analysisInstruction + ragContext + '\n\n' + ANALISE1_COMMAND_PROMPT

        // ============================================
        // UMA ÚNICA CHAMADA À LLM (usando streaming para suporte a PDF)
        // ============================================

        // IMPORTANTE: Usamos invokeLLMStreamWithThinking porque:
        // - invokeLLM usa endpoint OpenAI-compatible que NÃO suporta fileUri
        // - invokeLLMStreamWithThinking delega para API nativa do Gemini que SUPORTA PDF
        // Para providers não-Google, passamos undefined no fileUri (já extraímos o texto acima)

        const { invokeLLMStreamWithThinking, resolveApiKeyForProvider } = await import('../../_core/llm')

        let analysisContent = ''
        let thinkingContent = ''

        // Streaming real: yieldar chunks conforme chegam
        for await (const chunk of invokeLLMStreamWithThinking({
            messages: [
                { role: 'system', content: fullSystemPrompt },
                ...recentHistory,
                {
                    role: 'user',
                    content: `/analise1

O arquivo PDF anexado contém a petição inicial para análise.
Execute o protocolo de pensamento estruturado (<thinking>) e depois as 6 etapas da triagem inicial.`
                }
            ],
            apiKey: resolveApiKeyForProvider(settings?.llmProvider, settings?.llmApiKey),
            model: settings?.llmModel || "gemini-3-flash-preview",
            provider: settings?.llmProvider || "google",
            // Só passa fileUri quando NÃO há texto local E provider é Google (fallback visual para scans)
            fileUri: !pdfExtractedText && isGoogleProvider ? fileUri : undefined,
        })) {
            if (chunk.type === 'thinking') {
                thinkingContent += chunk.text
                // Yield chunk de thinking para streaming real
                yield {
                    type: 'thinking_chunk',
                    step: 'analise',
                    content: chunk.text,
                }
            } else {
                analysisContent += chunk.text
                // Yield chunk de conteúdo para streaming real
                yield {
                    type: 'content_chunk',
                    step: 'analise',
                    content: chunk.text,
                }
            }
        }

        // ============================================
        // RESULTADO FINAL
        // ============================================

        const totalDuration = Date.now() - startTime

        yield {
            type: 'step_complete',
            step: 'analise',
            result: {
                stepName: 'Triagem Inicial',
                motorUsed: ['A', 'B', 'C', 'D'],
                output: 'Análise completa (6 etapas)',
                shouldContinue: true,
            },
            durationMs: totalDuration,
        }

        yield {
            type: 'command_complete',
            result: {
                success: true,
                steps: [{
                    stepName: 'Triagem Inicial',
                    motorUsed: ['A', 'B', 'C', 'D'],
                    output: 'Análise completa',
                    shouldContinue: true,
                }],
                finalOutput: analysisContent, // Obrigatório pelo tipo
                thinking: thinkingContent || undefined,
            },
            totalDurationMs: totalDuration,
        }

    } catch (error) {
        yield {
            type: 'command_error',
            error: `Erro ao executar triagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        }
    } finally {
        commandLock.release(userId, conversationId)
    }
}

// ============================================
// SELF-REGISTRATION
// ============================================

console.log('[Analise1] Registering /analise1...')
registerCommand('/analise1', {
    slug: 'analise1',
    name: 'Triagem Inicial (JEC)',
    description: 'Análise completa de petição inicial com 6 etapas',
    type: 'orchestrated',
    modules: ['jec'],
    requiresProcess: true,
    requiresArgument: false,
    handler: analise1Handler,
})
