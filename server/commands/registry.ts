/**
 * Command Registry Logic
 * 
 * Separated from index.ts to avoid circular dependencies when handlers import registerCommand.
 */

import type { CommandDefinition, ModuleSlug } from './types'

// ============================================
// COMMAND REGISTRY
// ============================================

/**
 * Registry of all system commands.
 * Key is the command trigger (e.g., '/consultar').
 */
export const SYSTEM_COMMANDS: Record<string, CommandDefinition> = {}
console.log('[Registry] SYSTEM_COMMANDS initialized')

/**
 * Register a command in the system.
 * Used by individual handlers to self-register.
 */
export function registerCommand(trigger: string, definition: CommandDefinition): void {
    console.log(`[Registry] Registering command: ${trigger}`)
    if (SYSTEM_COMMANDS[trigger]) {
        console.warn(`[Commands] Overwriting existing command: ${trigger}`)
    }
    SYSTEM_COMMANDS[trigger] = definition
}

/**
 * Get list of commands available for a specific module.
 */
export function getAvailableCommands(moduleSlug: ModuleSlug | string): CommandDefinition[] {
    return Object.values(SYSTEM_COMMANDS).filter(cmd =>
        cmd.modules.includes('*') || cmd.modules.includes(moduleSlug as ModuleSlug)
    )
}

/**
 * Get a specific command by trigger.
 */
export function getCommand(trigger: string): CommandDefinition | undefined {
    return SYSTEM_COMMANDS[trigger]
}

/**
 * Check if a trigger is a registered system command.
 */
export function isSystemCommand(trigger: string): boolean {
    return trigger in SYSTEM_COMMANDS
}
