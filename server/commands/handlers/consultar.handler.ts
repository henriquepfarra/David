/**
 * /consultar Command Handler
 * 
 * Simple command that searches the knowledge base for a given topic.
 * Uses Motor B (Guardian) for context-aware search.
 * 
 * Usage: /consultar [tema]
 * Example: /consultar tutela de urgência
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

import { registerCommand } from '../index'
import type { CommandHandler, CommandContext, CommandEvent, StepResult } from '../types'
import { getRagService } from '../../services/RagService'

// ============================================
// HANDLER
// ============================================

export const consultarHandler: CommandHandler = async function* (ctx: CommandContext) {
    const { argument: tema, userId } = ctx
    const startTime = Date.now()

    // Validate argument
    if (!tema?.trim()) {
        yield {
            type: 'command_error',
            error: 'Uso: /consultar [tema]\n\nExemplo: /consultar tutela de urgência',
        }
        return
    }

    // Start command
    yield {
        type: 'command_start',
        command: '/consultar',
        totalSteps: 1,
    }

    // Single step: Search knowledge base
    yield {
        type: 'step_start',
        step: 'consulta',
        name: 'Consulta à Base de Conhecimento',
        description: `Buscando "${tema}" na base de conhecimento...`,
        totalSteps: 1,
        currentStep: 1,
    }

    try {
        const ragService = getRagService()

        // Search in knowledge base with user context
        const results = await ragService.searchWithHierarchy(tema, {
            limit: 5,
            minSimilarity: 0.3,
            userId: parseInt(userId),
        })

        // Also search learned theses
        const theses = await ragService.searchLegalTheses(tema, parseInt(userId), {
            limit: 3,
            threshold: 0.3,
        })

        // Format results
        let output = ''

        if (results.length === 0 && theses.length === 0) {
            output = `🔍 **Consulta: "${tema}"**\n\nO Motor B não encontrou diretrizes específicas na base atual sobre este tema.\n\n**Sugestão:** Você pode cadastrar teses e diretrizes na "Memória Jurídica" para que futuras consultas retornem resultados.`
        } else {
            output = `🔍 **Consulta: "${tema}"**\n\n`

            // Knowledge base results
            if (results.length > 0) {
                output += `### 📚 Base de Conhecimento\n\n`
                for (const result of results) {
                    const similarity = Math.round(result.similarity * 100)
                    const type = result.documentType || 'Documento'
                    output += `**[${type.toUpperCase()}]** ${result.title} _(${similarity}% relevância)_\n\n`
                    output += `${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}\n\n---\n\n`
                }
            }

            // Learned theses results
            if (theses.length > 0) {
                output += `### 🎯 Teses do Gabinete\n\n`
                for (const thesis of theses) {
                    const similarity = Math.round(thesis.similarity * 100)
                    output += `**Tese** _(${similarity}% relevância)_\n\n`
                    output += `${thesis.legalThesis}\n\n`
                    if (thesis.legalFoundations) {
                        output += `_Fundamentos: ${thesis.legalFoundations}_\n\n`
                    }
                    output += `---\n\n`
                }
            }
        }

        const stepResult: StepResult = {
            stepName: 'Consulta à Base',
            motorUsed: ['B'],
            output,
            shouldContinue: true,
            tokensUsed: 0, // No LLM call in this simple version
        }

        yield {
            type: 'content_complete',
            step: 'consulta',
            content: output,
        }

        yield {
            type: 'step_complete',
            step: 'consulta',
            result: stepResult,
            durationMs: Date.now() - startTime,
        }

        // Complete command
        yield {
            type: 'command_complete',
            result: {
                success: true,
                steps: [stepResult],
                finalOutput: output,
            },
            totalDurationMs: Date.now() - startTime,
        }

    } catch (error) {
        yield {
            type: 'step_error',
            step: 'consulta',
            error: error instanceof Error ? error.message : 'Erro desconhecido na busca',
            recoverable: false,
        }

        yield {
            type: 'command_error',
            error: `Erro ao consultar base de conhecimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
            failedAtStep: 'consulta',
        }
    }
}

// ============================================
// SELF-REGISTRATION
// ============================================

registerCommand('/consultar', {
    slug: 'consultar',
    name: 'Consultar Base',
    description: 'Busca teses e diretrizes na base de conhecimento',
    type: 'simple',
    modules: ['*'], // Available in all modules
    requiresProcess: false,
    requiresArgument: true,
    handler: consultarHandler,
})
