/**
 * /tese Command Handler
 *
 * Comando explícito para ensinar uma nova tese jurídica ao DAVID.
 *
 * Usage: /tese [descrição ou fundamento]
 *
 * Fluxo:
 * 1. Analisa o argumento do usuário
 * 2. Extrai ou estrutura a tese
 * 3. Salva na base de aprendizado (Brain - Motor C)
 */

import { registerCommand } from '../registry'
import { commandLock } from '../lock'
import type { CommandHandler, CommandContext, StepResult } from '../types'
import { createLearnedThesis, createApprovedDraft, getConversationMessages } from '../../db'
import { invokeLLM } from '../../_core/llm'
import { getUserSettings } from '../../db'

const TESE_EXTRACTION_PROMPT = `
Você é o Motor C (Jurista) em modo de APRENDIZADO.
O usuário quer ensinar uma nova tese jurídica baseada na conversa atual ou no texto fornecido.

CONTEÚDO DO USUÁRIO:
{{USER_CONTENT}}

HISTÓRICO RECENTE:
{{HISTORY}}

TAREFA:
Extraia e formule a tese jurídica de forma estruturada.

OUTPUT ESPERADO (JSON APENAS):
{
  "legalThesis": "A tese jurídica central, clara e concisa (Ratio Decidendi)",
  "legalFoundations": "Artigos de lei, súmulas ou jurisprudência citada",
  "keywords": "palavras-chave separadas por vírgula",
  "similarity_check": "Breve resumo para verificação de duplicidade"
}
`

export const teseHandler: CommandHandler = async function* (ctx: CommandContext) {
    const { argument, userId, conversationId, history } = ctx
    const startTime = Date.now()
    const userIdNum = parseInt(userId)

    // Acumulador de passos para o resultado final
    const completedSteps: StepResult[] = []

    if (!commandLock.acquire(userId, '/tese')) {
        yield { type: 'command_error', error: '⏳ Comando em execução.' }
        return
    }

    try {
        yield { type: 'command_start', command: '/tese', totalSteps: 2 }

        // Start Step 1
        yield {
            type: 'step_start',
            step: 'extracao',
            name: 'Extração',
            description: 'Identificando tese jurídica...',
            totalSteps: 2,
            currentStep: 1
        }

        // 1. Obter contexto
        const recentHistory = (await getConversationMessages(parseInt(conversationId)))
            .slice(-5)
            .map(m => `${m.role}: ${m.content}`)
            .join('\n')

        // 2. Extrair Tese com LLM
        const settings = await getUserSettings(userIdNum)
        const response = await invokeLLM({
            messages: [{
                role: 'system',
                content: TESE_EXTRACTION_PROMPT
                    .replace('{{USER_CONTENT}}', argument || 'Extraia a tese da conversa acima.')
                    .replace('{{HISTORY}}', recentHistory)
            }],
            apiKey: settings?.llmApiKey || '',
            model: settings?.llmModel || undefined
        })

        const content = typeof response.choices[0]?.message?.content === 'string'
            ? response.choices[0].message.content
            : '{}'

        let thesisData
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            thesisData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
        } catch (e) {
            console.error('Erro ao parser tese:', e)
        }

        if (!thesisData || !thesisData.legalThesis) {
            yield { type: 'command_error', error: 'Não consegui identificar uma tese clara. Tente ser mais específico.' }
            return
        }

        const step1Result: StepResult = {
            stepName: 'Extração',
            motorUsed: ['C'],
            output: `Tese Identificada:\n${thesisData.legalThesis}`,
            shouldContinue: true
        }
        completedSteps.push(step1Result)

        yield {
            type: 'step_complete',
            step: 'extracao',
            result: step1Result,
            durationMs: Date.now() - startTime
        }

        // Start Step 2
        yield {
            type: 'step_start',
            step: 'save',
            name: 'Persistência',
            description: 'Salvando para revisão...',
            totalSteps: 2,
            currentStep: 2
        }

        // 3. Salvar no Banco (Status: PENDING_REVIEW)
        // Schema exige approvedDraftId. Vamos criar um draft "Manual" para satisfazer a constraint.
        const draftId = await createApprovedDraft({
            userId: userIdNum,
            processId: null, // Pode ser null
            conversationId: parseInt(conversationId),
            messageId: null, // Sem mensagem de origem específica
            originalDraft: argument || "Tese inserida manualmente via comando /tese",
            editedDraft: argument || "Tese inserida manualmente via comando /tese",
            draftType: 'outro',
            approvalStatus: 'approved',
            userNotes: 'Inserção manual via /tese',
        })

        // Criar a tese pendente
        const thesisId = await createLearnedThesis({
            userId: userIdNum,
            approvedDraftId: draftId,
            processId: null,
            legalThesis: thesisData.legalThesis,
            legalFoundations: thesisData.legalFoundations,
            keywords: thesisData.keywords,
            status: 'PENDING_REVIEW',
            isObsolete: 0,
            thesis: thesisData.legalThesis, // Legacy field sync
            decisionPattern: '', // Legacy
        })

        const step2Result: StepResult = {
            stepName: 'Persistência',
            motorUsed: ['C'],
            output: 'Tese enviada para revisão.',
            shouldContinue: true
        }
        completedSteps.push(step2Result)

        yield {
            type: 'step_complete',
            step: 'save',
            result: step2Result,
            durationMs: Date.now() - startTime
        }

        const finalOutput = `✅ **Tese Capturada com Sucesso!**\n\n**Tese:** ${thesisData.legalThesis}\n**Fundamentos:** ${thesisData.legalFoundations}\n\nEla foi enviada para a **Fila de Revisão** e passará a ser usada após sua aprovação.`

        yield {
            type: 'content_complete',
            step: 'save',
            content: finalOutput,
            metadata: { thesisId: thesisId }
        }

        yield {
            type: 'command_complete',
            result: {
                success: true,
                finalOutput,
                steps: completedSteps // ✅ Required property
            },
            totalDurationMs: Date.now() - startTime
        }

    } catch (error) {
        yield { type: 'command_error', error: `Erro: ${error}` }
    } finally {
        commandLock.release(userId)
    }
}

registerCommand('/tese', {
    slug: 'tese',
    name: 'Ensinar Tese',
    description: 'Ensina uma nova tese jurídica ao sistema',
    type: 'simple',
    modules: ['*'],
    requiresProcess: false,
    requiresArgument: false, // Pode usar o contexto
    handler: teseHandler
})
