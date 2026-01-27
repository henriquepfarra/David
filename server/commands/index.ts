/**
 * System Commands Registry
 * 
 * Central registration of all system commands.
 * 
 * @see docs/architecture/system_commands_architecture.md
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

/**
 * Register a command in the system.
 * Used by individual handlers to self-register.
 */
export function registerCommand(trigger: string, definition: CommandDefinition): void {
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

// ============================================
// AUTO-IMPORT HANDLERS
// ============================================

// Import handlers to trigger self-registration
// This will be populated as we add handlers
// For now, we'll do dynamic imports

async function loadHandlers() {
    try {
        // /consultar handler
        await import('./handlers/consultar.handler')
        // /minutar handler
        await import('./handlers/minutar.handler')
        // /analise1 handler (JEC only)
        await import('./handlers/analise1.handler')
    } catch (error) {
        // Handlers not yet created, that's fine
        console.debug('[Commands] Some handlers not yet available')
    }
}

// Load handlers on module import
loadHandlers()
