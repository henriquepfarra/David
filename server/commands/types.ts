/**
 * System Commands - Type Definitions
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

// ============================================
// COMMAND TYPES
// ============================================

export type CommandType = 'simple' | 'orchestrated'

export type ModuleSlug = 'jec' | 'familia' | 'fazenda' | 'criminal' | 'default'

export type MotorType = 'A' | 'B' | 'C' | 'D'

// ============================================
// COMMAND DEFINITION
// ============================================

export interface CommandDefinition {
    slug: string
    name: string
    description: string
    type: CommandType
    modules: (ModuleSlug | '*')[]
    requiresProcess: boolean
    requiresArgument?: boolean
    handler: CommandHandler
}

// ============================================
// COMMAND CONTEXT & RESULT
// ============================================

export interface CommandContext {
    userId: string
    conversationId: string
    processId?: string
    fileUri?: string  // Google File URI (PDF anexado)
    moduleSlug: ModuleSlug
    argument?: string
    history: Array<{ role: string; content: string }>
    signal: AbortSignal
}

export interface StepResult {
    stepName: string
    motorUsed: MotorType[]
    output: string
    analysis?: Record<string, unknown>
    shouldContinue: boolean
    blockReason?: string
    tokensUsed?: number
}

export interface CommandResult {
    success: boolean
    veredito?: string
    steps: StepResult[]
    finalOutput: string
    thinking?: string
    suggestion?: string
    modelSuggested?: number
}

// ============================================
// COMMAND EVENTS (Streaming)
// ============================================

export type CommandEvent =
    // Step lifecycle
    | {
        type: 'step_start'
        step: string
        name: string
        description: string
        totalSteps?: number
        currentStep?: number
    }
    | {
        type: 'step_log'
        step: string
        message: string
        level: 'info' | 'warn' | 'debug'
    }
    | {
        type: 'step_complete'
        step: string
        result: StepResult
        durationMs: number
    }
    | {
        type: 'step_error'
        step: string
        error: string
        recoverable: boolean
    }
    // Content streaming
    | {
        type: 'content_delta'
        step: string
        delta: string
    }
    | {
        type: 'thinking_chunk'
        step: string
        content: string
    }
    | {
        type: 'content_chunk'
        step: string
        content: string
    }
    | {
        type: 'content_complete'
        step: string
        content: string
        thinking?: string
    }
    // Command lifecycle
    | {
        type: 'command_start'
        command: string
        totalSteps: number
    }
    | {
        type: 'command_complete'
        result: CommandResult
        totalDurationMs: number
    }
    | {
        type: 'command_error'
        error: string
        failedAtStep?: string
    }
    | {
        type: 'command_cancelled'
        cancelledAtStep: string
        partialResult?: Partial<CommandResult>
    }

// ============================================
// COMMAND HANDLER
// ============================================

export type CommandHandler = (
    ctx: CommandContext
) => AsyncGenerator<CommandEvent, void, unknown>

// ============================================
// EXECUTION PLAN (CommandResolver output)
// ============================================

export type ExecutionPlan =
    | { type: 'SYSTEM_COMMAND'; definition: CommandDefinition; argument?: string }
    | { type: 'SAVED_PROMPT'; content: string }
    | { type: 'CHAT' }

// ============================================
// ERRORS
// ============================================

export class CommandModuleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'CommandModuleError'
    }
}

export class CommandCancelledError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'CommandCancelledError'
    }
}

export class MaxRetriesExceededError extends Error {
    public lastError: Error | null

    constructor(message: string, lastError: Error | null = null) {
        super(message)
        this.name = 'MaxRetriesExceededError'
        this.lastError = lastError
    }
}
