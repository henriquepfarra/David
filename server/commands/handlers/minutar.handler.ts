/**
 * /minutar Command Handler
 * 
 * Orchestrated command for generating judicial drafts (sentenças, decisões, despachos).
 * Uses 3-step process: Arquitetura → Redação → Check-out
 * 
 * Usage: /minutar [veredito e observações]
 * Examples:
 *   /minutar deferimento
 *   /minutar emenda da inicial
 *   /minutar deferimento parcial (somente X), determinar citação
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

import { registerCommand } from '../index'
import { commandLock } from '../lock'
import { withRetry } from '../retry'
import type { CommandHandler, CommandContext, CommandEvent, StepResult } from '../types'
import { createMinutaBuilder } from '../../services/ContextBuilder'
import { getRagService } from '../../services/RagService'
import { getConversationMessages } from '../../db'
import { invokeLLM } from '../../_core/llm'
import { getUserSettings } from '../../db'

// ============================================
// HELPER
// ============================================

/**
 * Extracts text content from LLM response (handles string or array format)
 */
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

// ============================================
// PROMPTS FOR EACH STEP
// ============================================

const STEP1_ARQUITETURA_PROMPT = `
Você é o Motor B (Guardião) em MODO ARQUITETO.

**TAREFA:** Definir a ESTRUTURA da minuta judicial.

**CONTEXTO INJETADO:**
- Modelos de minutas do gabinete (se disponíveis)
- Histórico da conversa com análise prévia

**INSTRUÇÕES:**
1. Analise os modelos disponíveis na base de conhecimento
2. Identifique o modelo mais adequado para o caso (se houver)
3. Se não houver modelo compatível, crie uma estrutura padrão:
   - Relatório (se aplicável)
   - Fundamentação
   - Dispositivo

**OUTPUT ESPERADO:**
Retorne APENAS um JSON com a estrutura:
{
  "modeloUsado": "Modelo 103" | null,
  "estrutura": {
    "temRelatorio": true/false,
    "secoes": ["Relatório", "Fundamentação", "Dispositivo"]
  },
  "observacoes": "Razão da escolha ou adaptações necessárias"
}
`

const STEP2_REDACAO_PROMPT = `
Você é o Motor C (Jurista Autônomo) em MODO REDATOR.

**MODO DE PRODUÇÃO JUDICIAL ATIVO**

**REGRAS CRÍTICAS:**
1. SUSPENDER a "Meta-Regra de Transparência" - NÃO cite códigos [TM-XX] ou [MODELO Nº]
2. APLICAR OBRIGATORIAMENTE o Manual de Redação Judicial
3. CONSOLIDAR toda a análise fática realizada na conversa
4. INCORPORAR as observações e correções do usuário

**VEREDITO SOLICITADO:**
{{VEREDITO}}

**ESTRUTURA DEFINIDA:**
{{ESTRUTURA}}

**INSTRUÇÕES:**
1. Redija a minuta completa seguindo a estrutura
2. Use linguagem técnica, sóbria e impessoal
3. Preencha TODOS os campos variáveis (não deixe placeholders)
4. O dispositivo deve refletir exatamente o veredito solicitado
5. Formate com parágrafos coesos, evite bullet points

**OUTPUT:** A minuta judicial completa, pronta para assinatura.
`

const STEP3_CHECKOUT_PROMPT = `
Você é o Controle de Qualidade do Motor D.

**TAREFA:** Validar a minuta gerada antes da entrega final.

**MINUTA A VALIDAR:**
{{MINUTA}}

**VEREDITO ORIGINAL:**
{{VEREDITO}}

**CHECKLIST DE VALIDAÇÃO:**
1. ⚠️ CAÇA AOS COLCHETES: Há campos vazios [___] ou placeholders não preenchidos?
2. ⚠️ COERÊNCIA: O dispositivo reflete o veredito solicitado?
3. ⚠️ ESTRUTURA: Relatório, fundamentação e dispositivo estão presentes (se aplicável)?

**OUTPUT ESPERADO:**
Se tudo OK: Retorne a minuta SEM ALTERAÇÕES, apenas confirmando "✅ VALIDADO"
Se houver problemas: Corrija os problemas e retorne a minuta corrigida com "⚠️ CORRIGIDO: [motivo]"
`

// ============================================
// HANDLER
// ============================================

export const minutarHandler: CommandHandler = async function* (ctx: CommandContext) {
    const { argument: veredito, userId, conversationId, history, signal } = ctx
    const startTime = Date.now()
    const userIdNum = parseInt(userId)

    // Validate argument
    if (!veredito?.trim()) {
        yield {
            type: 'command_error',
            error: 'Uso: /minutar [veredito e observações]\n\nExemplos:\n• /minutar deferimento\n• /minutar emenda da inicial\n• /minutar deferimento parcial, determinar citação',
        }
        return
    }

    // Acquire lock (prevent concurrent orchestrated commands)
    if (!commandLock.acquire(userId, '/minutar')) {
        yield {
            type: 'command_error',
            error: '⏳ Você já tem um comando em execução. Aguarde a conclusão.',
        }
        return
    }

    try {
        // Get user settings for API key
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
            command: '/minutar',
            totalSteps: 3,
        }

        const ragService = getRagService()

        // ============================================
        // PASSO 1: ARQUITETURA (Motor B)
        // ============================================
        yield {
            type: 'step_start',
            step: 'arquitetura',
            name: 'Arquitetura',
            description: 'Definindo estrutura da minuta...',
            totalSteps: 3,
            currentStep: 1,
        }

        // Check for cancellation
        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'arquitetura' }
            return
        }

        // Search for model templates in user's knowledge base
        const modelos = await ragService.searchWithHierarchy('modelo minuta sentença decisão', {
            limit: 3,
            minSimilarity: 0.3,
            userId: userIdNum,
            filterTypes: ['minuta_modelo', 'modelo', 'sentença', 'decisão'],
        })

        // Build context with ContextBuilder
        const arquiteturaBuilder = createMinutaBuilder()

        // Inject models if found
        if (modelos.length > 0) {
            arquiteturaBuilder.injectRagResults(modelos, { withCitations: false })
        }

        // Get conversation history for context
        const conversationHistory = await getConversationMessages(parseInt(conversationId))
        const recentHistory = conversationHistory.slice(-10).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }))

        // Call LLM for architecture
        const arquiteturaResponse = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: STEP1_ARQUITETURA_PROMPT },
                    ...recentHistory,
                    { role: 'user', content: `Defina a estrutura para: ${veredito}` }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, {
            maxAttempts: 2,
            onRetry: (info) => console.log(`[/minutar] Retry ${info.attempt}: ${info.error}`)
        })

        const arquiteturaContentRaw = arquiteturaResponse.choices[0]?.message?.content
        const arquiteturaContent = extractContent(arquiteturaContentRaw)

        // Parse structure (with fallback)
        let estrutura = {
            modeloUsado: null as string | null,
            secoes: ['Relatório', 'Fundamentação', 'Dispositivo'],
            observacoes: ''
        }

        try {
            const jsonMatch = arquiteturaContent.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                estrutura = {
                    modeloUsado: parsed.modeloUsado || null,
                    secoes: parsed.estrutura?.secoes || estrutura.secoes,
                    observacoes: parsed.observacoes || ''
                }
            }
        } catch {
            // Keep default structure
            console.log('[/minutar] Could not parse architecture JSON, using default')
        }

        const step1Result: StepResult = {
            stepName: 'Arquitetura',
            motorUsed: ['B'],
            output: `Estrutura definida: ${estrutura.secoes.join(' → ')}${estrutura.modeloUsado ? ` (baseado em ${estrutura.modeloUsado})` : ''}`,
            shouldContinue: true,
        }

        yield {
            type: 'step_complete',
            step: 'arquitetura',
            result: step1Result,
            durationMs: Date.now() - startTime,
        }

        // ============================================
        // PASSO 2: REDAÇÃO (Motor C + Manual de Redação)
        // ============================================
        yield {
            type: 'step_start',
            step: 'redacao',
            name: 'Redação',
            description: 'Gerando minuta com base na análise...',
            totalSteps: 3,
            currentStep: 2,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'redacao' }
            return
        }

        // Search for writing style samples
        const writingStyles = await ragService.searchWritingStyle(veredito, userIdNum, {
            limit: 2,
            threshold: 0.3,
        })

        // Search for legal theses
        const theses = await ragService.searchLegalTheses(veredito, userIdNum, {
            limit: 3,
            threshold: 0.3,
        })

        // Build the redação prompt
        const redacaoPrompt = STEP2_REDACAO_PROMPT
            .replace('{{VEREDITO}}', veredito)
            .replace('{{ESTRUTURA}}', JSON.stringify(estrutura, null, 2))

        // Build full context with ContextBuilder
        const redacaoBuilder = createMinutaBuilder()

        if (theses.length > 0) {
            redacaoBuilder.injectLegalTheses(theses.map(t => ({
                id: t.id,
                legalThesis: t.legalThesis,
                legalFoundations: t.legalFoundations || undefined,
                keywords: t.keywords || undefined,
            })))
        }

        if (writingStyles.length > 0) {
            redacaoBuilder.injectWritingStyle({
                samples: writingStyles.map(s => ({
                    id: s.id,
                    writingStyleSample: s.writingStyleSample,
                    writingCharacteristics: s.writingCharacteristics,
                }))
            })
        }

        const contextPrompt = redacaoBuilder.build()

        // Call LLM for drafting
        const redacaoResponse = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: redacaoPrompt + '\n\n' + contextPrompt },
                    ...recentHistory,
                    { role: 'user', content: `Redija a minuta para: ${veredito}` }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, {
            maxAttempts: 2,
            onRetry: (info) => console.log(`[/minutar] Retry ${info.attempt}: ${info.error}`)
        })

        const minutaRaw = redacaoResponse.choices[0]?.message?.content
        let minuta = extractContent(minutaRaw)

        const step2Result: StepResult = {
            stepName: 'Redação',
            motorUsed: ['C'],
            output: 'Minuta redigida com base na análise e manual de redação',
            shouldContinue: true,
        }

        yield {
            type: 'step_complete',
            step: 'redacao',
            result: step2Result,
            durationMs: Date.now() - startTime,
        }

        // ============================================
        // PASSO 3: CHECK-OUT (Controle de Qualidade)
        // ============================================
        yield {
            type: 'step_start',
            step: 'checkout',
            name: 'Controle de Qualidade',
            description: 'Validando minuta final...',
            totalSteps: 3,
            currentStep: 3,
        }

        if (signal.aborted) {
            yield { type: 'command_cancelled', cancelledAtStep: 'checkout' }
            return
        }

        const checkoutPrompt = STEP3_CHECKOUT_PROMPT
            .replace('{{MINUTA}}', minuta)
            .replace('{{VEREDITO}}', veredito)

        const checkoutResponse = await withRetry(async () => {
            return await invokeLLM({
                messages: [
                    { role: 'system', content: checkoutPrompt },
                    { role: 'user', content: 'Valide a minuta e corrija se necessário.' }
                ],
                apiKey: settings.llmApiKey!,
                model: settings.llmModel || undefined,
                provider: settings.llmProvider || undefined,
            })
        }, {
            maxAttempts: 2,
            onRetry: (info) => console.log(`[/minutar] Retry ${info.attempt}: ${info.error}`)
        })

        const finalMinutaRaw = checkoutResponse.choices[0]?.message?.content
        const finalMinuta = extractContent(finalMinutaRaw) || minuta
        const wasValidated = finalMinuta.includes('✅ VALIDADO')
        const wasCorrected = finalMinuta.includes('⚠️ CORRIGIDO')

        // Clean up validation markers for final output
        let cleanMinuta = finalMinuta
            .replace(/✅ VALIDADO[^\n]*/g, '')
            .replace(/⚠️ CORRIGIDO:[^\n]*/g, '')
            .trim()

        const step3Result: StepResult = {
            stepName: 'Controle de Qualidade',
            motorUsed: ['D'],
            output: wasValidated ? '✅ Minuta validada' : (wasCorrected ? '⚠️ Correções aplicadas' : '✅ Verificação concluída'),
            shouldContinue: true,
        }

        yield {
            type: 'step_complete',
            step: 'checkout',
            result: step3Result,
            durationMs: Date.now() - startTime,
        }

        // ============================================
        // FINALIZAÇÃO
        // ============================================
        const finalOutput = `📝 **MINUTA GERADA**\n\n**Veredito:** ${veredito}\n**Estrutura:** ${estrutura.secoes.join(' → ')}\n\n---\n\n${cleanMinuta}`

        yield {
            type: 'content_complete',
            step: 'checkout',
            content: finalOutput,
        }

        yield {
            type: 'command_complete',
            result: {
                success: true,
                veredito: veredito,
                steps: [step1Result, step2Result, step3Result],
                finalOutput,
            },
            totalDurationMs: Date.now() - startTime,
        }

    } catch (error) {
        yield {
            type: 'command_error',
            error: `Erro ao gerar minuta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        }
    } finally {
        // Always release lock
        commandLock.release(userId)
    }
}

// ============================================
// SELF-REGISTRATION
// ============================================

registerCommand('/minutar', {
    slug: 'minutar',
    name: 'Minutar Decisão',
    description: 'Gera minuta de decisão/sentença com base na análise',
    type: 'orchestrated',
    modules: ['*'], // Available in all modules
    requiresProcess: false, // Uses conversation history instead
    requiresArgument: true,
    handler: minutarHandler,
})
