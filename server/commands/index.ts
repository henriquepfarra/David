/**
 * System Commands Registry
 * 
 * Central registration of all system commands.
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

export * from './registry'

// ============================================
// AUTO-IMPORT HANDLERS
// ============================================

// Import handlers to trigger self-registration synchronously
// Note: Handlers should import registerCommand from './registry' to avoid circular deps
console.log('[CommandsIndex] Importing handlers...')
import './handlers/consultar.handler'
import './handlers/minutar.handler'
import './handlers/analise1.handler'
import './handlers/tese.handler'
console.log('[CommandsIndex] Handlers imported.')
