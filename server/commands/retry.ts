/**
 * Retry Utility for LLM Calls
 * 
 * Provides exponential backoff with jitter for transient errors.
 * 
 * @see docs/architecture/system_commands_architecture.md (Section 9.5.2)
 */

export interface RetryOptions {
    maxAttempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
    retryableErrors?: Set<string>
    onRetry?: (info: RetryInfo) => void
}

export interface RetryInfo {
    attempt: number
    maxAttempts: number
    delayMs: number
    error: string
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    retryableErrors: new Set([
        'rate_limit_exceeded',
        'timeout',
        'service_unavailable',
        'internal_error',
        'ECONNRESET',
        'ETIMEDOUT',
    ]),
}

/**
 * Extract error code from various error formats.
 */
function extractErrorCode(error: unknown): string {
    if (error instanceof Error) {
        // Check for specific error properties - cast through unknown first
        const anyError = error as unknown as Record<string, unknown>

        if (typeof anyError.code === 'string') {
            return anyError.code
        }

        if (typeof anyError.status === 'number') {
            if (anyError.status === 429) return 'rate_limit_exceeded'
            if (anyError.status === 503) return 'service_unavailable'
            if (anyError.status >= 500) return 'internal_error'
        }

        // Check error message for common patterns
        const message = error.message.toLowerCase()
        if (message.includes('rate limit')) return 'rate_limit_exceeded'
        if (message.includes('timeout')) return 'timeout'
        if (message.includes('econnreset')) return 'ECONNRESET'
    }

    return 'unknown_error'
}

/**
 * Sleep utility.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic.
 * Uses exponential backoff with jitter.
 * 
 * @example
 * const result = await withRetry(
 *   () => invokeLLM({ ... }),
 *   { maxAttempts: 3, onRetry: (info) => console.log(`Retry ${info.attempt}`) }
 * )
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    let lastError: Error | null = null
    let attempt = 0

    while (attempt < opts.maxAttempts) {
        try {
            return await fn()
        } catch (error) {
            lastError = error as Error
            const errorCode = extractErrorCode(error)

            // Don't retry non-retryable errors
            if (!opts.retryableErrors.has(errorCode)) {
                throw error
            }

            attempt++

            // Don't delay after last attempt
            if (attempt >= opts.maxAttempts) {
                break
            }

            // Calculate delay with exponential backoff and jitter
            const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt - 1)
            const jitter = Math.random() * 1000
            const delay = Math.min(exponentialDelay + jitter, opts.maxDelayMs)

            // Notify retry callback
            if (opts.onRetry) {
                opts.onRetry({
                    attempt,
                    maxAttempts: opts.maxAttempts,
                    delayMs: delay,
                    error: errorCode,
                })
            }

            await sleep(delay)
        }
    }

    // All retries exhausted
    const { MaxRetriesExceededError } = await import('./types')
    throw new MaxRetriesExceededError(
        `Operation failed after ${opts.maxAttempts} attempts`,
        lastError
    )
}
