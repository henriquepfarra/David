/**
 * /analise1 Command Handler - Triagem Inicial (JEC Only)
 * 
 * Orchestrated command for initial case triage in JEC (Juizado Especial Cível).
 * Uses 6-step process with checkpoints at steps 2 and 3.
 * 
 * Usage: /analise1 (requires process attached)
 * 
 * Steps:
 * 1. Auditoria Fática (Motor A)
 * 2. Gatekeeper - Saneamento (Motor C) [CHECKPOINT]
 * 3. Admissibilidade Material (Motor C) [CHECKPOINT]
 * 4. Confronto com Acervo (Motor B)
 * 5. Tutela de Urgência (Motor C + D)
 * 6. Veredito Técnico (Motor C)
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

import { registerCommand } from '../index'
import { commandLock } from '../lock'
import { withRetry } from '../retry'
import type { CommandHandler, CommandContext, StepResult } from '../types'
import { getRagService } from '../../services/RagService'
import { getConversationMessages } from '../../db'
import { invokeLLM } from '../../_core/llm'
import { getUserSettings } from '../../db'
import {
    ETAPA1_AUDITORIA_PROMPT,
    ETAPA2_GATEKEEPER_PROMPT,
    ETAPA3_ADMISSIBILIDADE_PROMPT,
    ETAPA4_CONFRONTO_PROMPT,
    ETAPA5_TUTELA_PROMPT,
    ETAPA6_VEREDITO_PROMPT,
    type Etapa2Output,
    type Etapa3Output,
} from '../prompts/analise1'

// ============================================
// HELPER
// ============================================

function extractContent(content: unknown): string {
    if (typeof content === 'string') {
        return content
    }
    if (Array.isArray(content)) {
        return content
            .filter((c): c is { type: 'text'; text: string } => c?.type === 'text')
            .map(c => c.text)
            .join('')
    }
    return ''
}

function tryParseJSON<T>(content: string): T | null {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as T
        }
    } catch {
        // Fall through
    }
    return null
}

// ============================================
// HANDLER
// ============================================

export const analise1Handler: CommandHandler = async function* (ctx: CommandContext) {
    const { userId, conversationId, processId, moduleSlug, signal } = ctx
    const startTime = Date.now()
    const userIdNum = parseInt(userId)
    const TOTAL_STEPS = 6

    // Validate module
    if (moduleSlug !== 'jec') {
        yield {
            type: 'command_error',
            error: '⚠️ O comando /analise1 está disponível apenas no módulo JEC (Juizado Especial Cível).\n\nAltere o módulo ativo para JEC e tente novamente.',
        }
        return
    }

    // Validate process
    if (!processId) {
        yield {
            type: 'command_error',
            error: '⚠️ O comando /analise1 requer um processo vinculado.\n\nEnvie um PDF de petição inicial primeiro.',
        }
        return
    }

    // Acquire lock
    if (!commandLock.acquire(userId, '/analise1')) {
        yield {
            type: 'command_error',
            error: '⏳ Você já tem um comando em execução. Aguarde a conclusão.',
        }
        return
    }

    try {
        // Get user settings
        const settings = await getUserSettings(userIdNum)
        if (!settings?.llmApiKey) {
            yield {
                type: 'command_error',
                error: '⚠️ Chave de API não configurada. Acesse as Configurações para adicionar.',
            }
            return
        }

        // Start command
        yield {
            type: 'command_start',
            command: '/analise1',
            totalSteps: TOTAL_STEPS,
        }

        // Get conversation history for context
        const conversationHistory = await getConversationMessages(parseInt(conversationId))
        const recentHistory = conversationHistory.slice(-10).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }))

        const ragService = getRagService()
        const stepResults: StepResult[] = []
        let accumulatedContext = '' // Accumulate context from each step

        // ============================================
        // ETAPA 1: AUDITORIA FÁTICA (Motor A)
        // ============================================
        yield {
            type: 'step_start',
            step: 'auditoria',
            name: 'Auditoria Fática',
            description: 'Cruzando narrativa com documentos...',
            totalSteps: TOTAL_STEPS,
            currentStep: 1,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'auditoria' }
            return
        }

        const etapa1Response = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: ETAPA1_AUDITORIA_PROMPT },
                    ...recentHistory,
                    { role: 'user', content: 'Analise o processo anexado e execute a Auditoria Fática.' }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, { maxAttempts: 2 })

        const etapa1Content = extractContent(etapa1Response.choices[0]?.message?.content)
        accumulatedContext += `\n\n--- ETAPA 1 (Auditoria Fática) ---\n${etapa1Content}`

        const step1Result: StepResult = {
            stepName: 'Auditoria Fática',
            motorUsed: ['A'],
            output: 'Relatório fático-probatório gerado',
            shouldContinue: true,
        }
        stepResults.push(step1Result)

        yield {
            type: 'step_complete',
            step: 'auditoria',
            result: step1Result,
            durationMs: Date.now() - startTime,
        }

        // ============================================
        // ETAPA 2: GATEKEEPER (Motor C) [CHECKPOINT]
        // ============================================
        yield {
            type: 'step_start',
            step: 'gatekeeper',
            name: 'Saneamento Formal',
            description: 'Validando requisitos formais (Lei 9.099/95)...',
            totalSteps: TOTAL_STEPS,
            currentStep: 2,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'gatekeeper' }
            return
        }

        const etapa2Response = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: ETAPA2_GATEKEEPER_PROMPT + accumulatedContext },
                    { role: 'user', content: 'Com base na análise anterior, execute o Saneamento Formal.' }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, { maxAttempts: 2 })

        const etapa2Content = extractContent(etapa2Response.choices[0]?.message?.content)
        const etapa2Output = tryParseJSON<Etapa2Output>(etapa2Content)
        accumulatedContext += `\n\n--- ETAPA 2 (Gatekeeper) ---\n${etapa2Content}`

        const step2Result: StepResult = {
            stepName: 'Saneamento Formal',
            motorUsed: ['C'],
            output: etapa2Output?.temVicio
                ? `⚠️ Vício identificado: ${etapa2Output.tipoVicio}`
                : '✅ Requisitos formais validados',
            shouldContinue: !etapa2Output?.temVicio,
        }
        stepResults.push(step2Result)

        yield {
            type: 'step_complete',
            step: 'gatekeeper',
            result: step2Result,
            durationMs: Date.now() - startTime,
        }

        // CHECKPOINT: Stop if formal issue found
        if (etapa2Output?.checkpoint === 'PARAR' || etapa2Output?.temVicio) {
            const vicioParagraph = `\n\n**Vício Formal Identificado:** ${etapa2Output?.tipoVicio}\n**Ação Sugerida:** ${etapa2Output?.acaoSugerida}`

            yield {
                type: 'content_complete',
                step: 'gatekeeper',
                content: `📋 **ANÁLISE PARCIAL - VÍCIO FORMAL**${vicioParagraph}\n\n${etapa2Content}`,
            }

            yield {
                type: 'command_complete',
                result: {
                    success: true,
                    stoppedAtStep: 2,
                    reason: 'Vício formal identificado',
                    steps: stepResults,
                    finalOutput: etapa2Content,
                },
                totalDurationMs: Date.now() - startTime,
            }
            return
        }

        // ============================================
        // ETAPA 3: ADMISSIBILIDADE MATERIAL (Motor C) [CHECKPOINT]
        // ============================================
        yield {
            type: 'step_start',
            step: 'admissibilidade',
            name: 'Admissibilidade Material',
            description: 'Verificando compatibilidade com rito sumaríssimo...',
            totalSteps: TOTAL_STEPS,
            currentStep: 3,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'admissibilidade' }
            return
        }

        const etapa3Response = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: ETAPA3_ADMISSIBILIDADE_PROMPT + accumulatedContext },
                    { role: 'user', content: 'Execute a verificação de admissibilidade material.' }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, { maxAttempts: 2 })

        const etapa3Content = extractContent(etapa3Response.choices[0]?.message?.content)
        const etapa3Output = tryParseJSON<Etapa3Output>(etapa3Content)
        accumulatedContext += `\n\n--- ETAPA 3 (Admissibilidade) ---\n${etapa3Content}`

        const step3Result: StepResult = {
            stepName: 'Admissibilidade Material',
            motorUsed: ['C'],
            output: etapa3Output?.incompativel
                ? `⚠️ Incompatível: ${etapa3Output.motivo}`
                : '✅ Compatível com rito sumaríssimo',
            shouldContinue: !etapa3Output?.incompativel,
        }
        stepResults.push(step3Result)

        yield {
            type: 'step_complete',
            step: 'admissibilidade',
            result: step3Result,
            durationMs: Date.now() - startTime,
        }

        // CHECKPOINT: Stop if incompatible
        if (etapa3Output?.checkpoint === 'PARAR' || etapa3Output?.incompativel) {
            const motivoParagraph = `\n\n**Incompatibilidade:** ${etapa3Output?.motivo}\n**Ação Sugerida:** ${etapa3Output?.acaoSugerida}`

            yield {
                type: 'content_complete',
                step: 'admissibilidade',
                content: `📋 **ANÁLISE PARCIAL - INCOMPATIBILIDADE**${motivoParagraph}\n\n${etapa3Content}`,
            }

            yield {
                type: 'command_complete',
                result: {
                    success: true,
                    stoppedAtStep: 3,
                    reason: 'Causa incompatível com JEC',
                    steps: stepResults,
                    finalOutput: etapa3Content,
                },
                totalDurationMs: Date.now() - startTime,
            }
            return
        }

        // ============================================
        // ETAPA 4: CONFRONTO COM ACERVO (Motor B)
        // ============================================
        yield {
            type: 'step_start',
            step: 'confronto',
            name: 'Confronto com Acervo',
            description: 'Buscando teses e modelos aplicáveis...',
            totalSteps: TOTAL_STEPS,
            currentStep: 4,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'confronto' }
            return
        }

        // Search for relevant theses in knowledge base
        const theses = await ragService.searchLegalTheses('tutela urgência JEC', userIdNum, {
            limit: 3,
            threshold: 0.3,
        })

        let thesesContext = ''
        if (theses.length > 0) {
            thesesContext = '\n\n[TESES DA BASE DE CONHECIMENTO]\n' +
                theses.map(t => `- [${t.id}] ${t.legalThesis}`).join('\n')
        }

        const etapa4Response = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: ETAPA4_CONFRONTO_PROMPT + thesesContext + accumulatedContext },
                    { role: 'user', content: 'Execute o confronto com o acervo e identifique teses aplicáveis.' }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, { maxAttempts: 2 })

        const etapa4Content = extractContent(etapa4Response.choices[0]?.message?.content)
        accumulatedContext += `\n\n--- ETAPA 4 (Confronto Acervo) ---\n${etapa4Content}`

        const step4Result: StepResult = {
            stepName: 'Confronto com Acervo',
            motorUsed: ['B'],
            output: 'Teses e modelos identificados',
            shouldContinue: true,
        }
        stepResults.push(step4Result)

        yield {
            type: 'step_complete',
            step: 'confronto',
            result: step4Result,
            durationMs: Date.now() - startTime,
        }

        // ============================================
        // ETAPA 5: TUTELA DE URGÊNCIA (Motor C + D)
        // ============================================
        yield {
            type: 'step_start',
            step: 'tutela',
            name: 'Análise de Tutela',
            description: 'Verificando requisitos da tutela de urgência...',
            totalSteps: TOTAL_STEPS,
            currentStep: 5,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'tutela' }
            return
        }

        const etapa5Response = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: ETAPA5_TUTELA_PROMPT + accumulatedContext },
                    { role: 'user', content: 'Execute a análise bifásica da tutela de urgência (Motor C + Motor D).' }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, { maxAttempts: 2 })

        const etapa5Content = extractContent(etapa5Response.choices[0]?.message?.content)
        accumulatedContext += `\n\n--- ETAPA 5 (Tutela Urgência) ---\n${etapa5Content}`

        const step5Result: StepResult = {
            stepName: 'Análise de Tutela',
            motorUsed: ['C', 'D'],
            output: 'Análise bifásica concluída',
            shouldContinue: true,
        }
        stepResults.push(step5Result)

        yield {
            type: 'step_complete',
            step: 'tutela',
            result: step5Result,
            durationMs: Date.now() - startTime,
        }

        // ============================================
        // ETAPA 6: VEREDITO TÉCNICO (Motor C)
        // ============================================
        yield {
            type: 'step_start',
            step: 'veredito',
            name: 'Veredito Técnico',
            description: 'Gerando conclusão final...',
            totalSteps: TOTAL_STEPS,
            currentStep: 6,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'veredito' }
            return
        }

        const etapa6Response = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: ETAPA6_VEREDITO_PROMPT + accumulatedContext },
                    { role: 'user', content: 'Com base em toda a análise, forneça o veredito técnico final.' }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, { maxAttempts: 2 })

        const etapa6Content = extractContent(etapa6Response.choices[0]?.message?.content)

        const step6Result: StepResult = {
            stepName: 'Veredito Técnico',
            motorUsed: ['C'],
            output: 'Veredito gerado',
            shouldContinue: true,
        }
        stepResults.push(step6Result)

        yield {
            type: 'step_complete',
            step: 'veredito',
            result: step6Result,
            durationMs: Date.now() - startTime,
        }

        // ============================================
        // FINALIZAÇÃO
        // ============================================
        const finalOutput = `🎯 **TRIAGEM INICIAL COMPLETA**

**Etapas Executadas:**
1. ✅ Auditoria Fática (Motor A)
2. ✅ Saneamento Formal (Motor C)
3. ✅ Admissibilidade Material (Motor C)
4. ✅ Confronto com Acervo (Motor B)
5. ✅ Análise de Tutela (Motor C + D)
6. ✅ Veredito Técnico (Motor C)

---

${etapa6Content}`

        yield {
            type: 'content_complete',
            step: 'veredito',
            content: finalOutput,
        }

        yield {
            type: 'command_complete',
            result: {
                success: true,
                steps: stepResults,
                finalOutput,
            },
            totalDurationMs: Date.now() - startTime,
        }

    } catch (error) {
        yield {
            type: 'command_error',
            error: `Erro ao executar triagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        }
    } finally {
        commandLock.release(userId)
    }
}

// ============================================
// SELF-REGISTRATION
// ============================================

registerCommand('/analise1', {
    slug: 'analise1',
    name: 'Triagem Inicial (JEC)',
    description: 'Análise completa de petição inicial com 6 etapas',
    type: 'orchestrated',
    modules: ['jec'], // ⭐ Só disponível no módulo JEC
    requiresProcess: true,
    requiresArgument: false,
    handler: analise1Handler,
})
