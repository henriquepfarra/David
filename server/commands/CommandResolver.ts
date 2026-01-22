/**
 * Command Resolver
 * 
 * Resolves user input to an ExecutionPlan.
 * Priority: System Commands > Saved Prompts > Chat
 * 
 * @see docs/architecture/system_commands_architecture.md (Section 11.2)
 */

import { SYSTEM_COMMANDS } from './index'
import type { ExecutionPlan, ModuleSlug, CommandModuleError } from './types'

// ============================================
// TYPES
// ============================================

interface ResolveContext {
    userId: string
    activeModule: ModuleSlug
}

// ============================================
// RESOLVER
// ============================================

class CommandResolverService {
    /**
     * Resolves user input to an ExecutionPlan.
     * 
     * @param input - Raw user message (e.g., "/consultar tutela")
     * @param ctx - Resolution context (userId, activeModule)
     * @returns ExecutionPlan indicating how to process the input
     */
    async resolve(input: string, ctx: ResolveContext): Promise<ExecutionPlan> {
        // 1️⃣ PRIORITY 1: System Commands (hardcoded)
        if (input.startsWith('/')) {
            const match = input.match(/^\/(\w+)(?:\s+(.*))?$/)

            if (match) {
                const [, slug, argument] = match
                const trigger = `/${slug}`
                const systemCmd = SYSTEM_COMMANDS[trigger]

                if (systemCmd) {
                    // Validate module compatibility
                    const isGlobal = systemCmd.modules.includes('*')
                    const moduleSupported = systemCmd.modules.includes(ctx.activeModule)

                    if (!isGlobal && !moduleSupported) {
                        // Create error inline to avoid circular import
                        const error = new Error(
                            `Comando /${slug} não disponível no módulo ${ctx.activeModule}`
                        )
                        error.name = 'CommandModuleError'
                        throw error
                    }

                    // Validate argument requirement
                    if (systemCmd.requiresArgument && !argument?.trim()) {
                        const error = new Error(
                            `Comando /${slug} requer um argumento. Uso: /${slug} [argumento]`
                        )
                        error.name = 'CommandArgumentError'
                        throw error
                    }

                    return {
                        type: 'SYSTEM_COMMAND',
                        definition: systemCmd,
                        argument: argument?.trim(),
                    }
                }
            }
        }

        // 2️⃣ PRIORITY 2: Saved Prompts are handled by ConversationService fallback
        // This resolver only handles system commands, returning CHAT for everything else

        // 3️⃣ PRIORITY 3: Normal Chat
        return { type: 'CHAT' }
    }

    /**
     * Quick check if input looks like a command.
     * Use before full resolution for performance.
     */
    isPotentialCommand(input: string): boolean {
        return input.startsWith('/')
    }

    /**
     * Extract command slug from input.
     */
    extractSlug(input: string): string | null {
        const match = input.match(/^\/(\w+)/)
        return match ? match[1] : null
    }
}

// Singleton instance
export const commandResolver = new CommandResolverService()

// Export class for testing
export { CommandResolverService }
