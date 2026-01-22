/**
 * useCommandExecution - Hook for managing slash command execution state
 * 
 * Uses useReducer pattern for atomic state updates as recommended
 * in the architecture document (Section 9.4).
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

import { useReducer, useCallback, useRef } from 'react'

// ============================================
// TYPES
// ============================================

type CommandStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'error'

interface StepState {
    id: string
    name: string
    description: string
    status: 'pending' | 'running' | 'completed' | 'error'
    output?: string
    durationMs?: number
}

interface CommandState {
    status: CommandStatus
    command: string | null
    steps: StepState[]
    currentStepIndex: number
    partialOutput: string
    finalOutput: string
    error: string | null
    totalDurationMs: number
}

// Events from server (matches server/commands/types.ts CommandEvent)
type CommandEvent =
    | { type: 'command_start'; command: string; totalSteps: number }
    | { type: 'step_start'; step: string; name: string; description: string; currentStep?: number }
    | { type: 'step_complete'; step: string; result: { output: string }; durationMs: number }
    | { type: 'step_error'; step: string; error: string; recoverable: boolean }
    | { type: 'content_delta'; step: string; delta: string }
    | { type: 'content_complete'; step: string; content: string }
    | { type: 'command_complete'; result: { finalOutput: string }; totalDurationMs: number }
    | { type: 'command_error'; error: string; failedAtStep?: string }
    | { type: 'command_cancelled'; cancelledAtStep: string }
    | { type: 'reset' } // Internal reset action

const initialState: CommandState = {
    status: 'idle',
    command: null,
    steps: [],
    currentStepIndex: -1,
    partialOutput: '',
    finalOutput: '',
    error: null,
    totalDurationMs: 0,
}

// ============================================
// REDUCER
// ============================================

function commandReducer(state: CommandState, event: CommandEvent): CommandState {
    switch (event.type) {
        case 'reset':
            return initialState

        case 'command_start':
            return {
                ...initialState,
                status: 'running',
                command: event.command,
                steps: Array(event.totalSteps).fill(null).map((_, i) => ({
                    id: `step_${i}`,
                    name: '',
                    description: '',
                    status: 'pending' as const,
                })),
            }

        case 'command_complete':
            return {
                ...state,
                status: 'completed',
                finalOutput: event.result.finalOutput || state.partialOutput,
                partialOutput: '',
                totalDurationMs: event.totalDurationMs,
            }

        case 'command_error':
            return {
                ...state,
                status: 'error',
                error: event.error,
            }

        case 'command_cancelled':
            return {
                ...state,
                status: 'cancelled',
                finalOutput: state.partialOutput,
            }

        case 'step_start': {
            const stepIndex = event.currentStep ? event.currentStep - 1 : state.currentStepIndex + 1
            const newSteps = [...state.steps]

            // Initialize step if needed
            if (!newSteps[stepIndex]) {
                newSteps[stepIndex] = {
                    id: event.step,
                    name: event.name,
                    description: event.description,
                    status: 'running',
                }
            } else {
                newSteps[stepIndex] = {
                    ...newSteps[stepIndex],
                    id: event.step,
                    name: event.name,
                    description: event.description,
                    status: 'running',
                }
            }

            return {
                ...state,
                steps: newSteps,
                currentStepIndex: stepIndex,
                partialOutput: '',
            }
        }

        case 'step_complete': {
            const newSteps = [...state.steps]
            const stepIndex = newSteps.findIndex(s => s.id === event.step)

            if (stepIndex !== -1) {
                newSteps[stepIndex] = {
                    ...newSteps[stepIndex],
                    status: 'completed',
                    output: event.result.output,
                    durationMs: event.durationMs,
                }
            }

            return {
                ...state,
                steps: newSteps,
            }
        }

        case 'step_error': {
            const newSteps = [...state.steps]
            const stepIndex = newSteps.findIndex(s => s.id === event.step)

            if (stepIndex !== -1) {
                newSteps[stepIndex] = {
                    ...newSteps[stepIndex],
                    status: 'error',
                }
            }

            return {
                ...state,
                steps: newSteps,
                error: event.error,
                status: event.recoverable ? state.status : 'error',
            }
        }

        case 'content_delta':
            return {
                ...state,
                partialOutput: state.partialOutput + event.delta,
            }

        case 'content_complete':
            return {
                ...state,
                partialOutput: event.content,
            }

        default:
            return state
    }
}

// ============================================
// HOOK
// ============================================

export function useCommandExecution() {
    const [state, dispatch] = useReducer(commandReducer, initialState)
    const abortControllerRef = useRef<AbortController | null>(null)

    /**
     * Process a command event from the server.
     * Call this for each event received during streaming.
     */
    const processEvent = useCallback((event: CommandEvent) => {
        dispatch(event)
    }, [])

    /**
     * Cancel the current command execution.
     */
    const cancelCommand = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
    }, [])

    /**
     * Reset the command state.
     */
    const reset = useCallback(() => {
        dispatch({ type: 'reset' })
    }, [])

    /**
     * Start tracking a new command execution.
     * Returns an AbortController that can be used to cancel.
     */
    const startCommand = useCallback((command: string, totalSteps: number = 1) => {
        abortControllerRef.current = new AbortController()
        dispatch({ type: 'command_start', command, totalSteps })
        return abortControllerRef.current
    }, [])

    return {
        // State
        state,

        // Actions
        processEvent,
        cancelCommand,
        reset,
        startCommand,

        // Derived state
        isRunning: state.status === 'running',
        isCompleted: state.status === 'completed',
        hasError: state.status === 'error',
        isCancelled: state.status === 'cancelled',
        currentStep: state.steps[state.currentStepIndex],
        completedSteps: state.steps.filter(s => s.status === 'completed'),
    }
}

export type { CommandState, CommandEvent, StepState }
