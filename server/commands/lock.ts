/**
 * Command Lock - Rate Limiting
 * 
 * Prevents multiple simultaneous orchestrated commands per user.
 * In-memory implementation for MVP (single-instance).
 * 
 * @see docs/architecture/system_commands_architecture.md (Section 9.5.3)
 */

interface LockInfo {
    command: string
    startedAt: Date
}

const LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes safety timeout

class CommandLock {
    private locks = new Map<string, LockInfo>()

    /**
     * Attempts to acquire a lock for an orchestrated command.
     * Lock is per-conversation, allowing users to run commands in different conversations simultaneously.
     * 
     * @returns true if lock acquired, false if conversation already has a command running
     */
    acquire(userId: string, command: string, conversationId?: string): boolean {
        this.cleanExpiredLocks()

        // Lock per conversation (not per user) to allow parallel commands in different chats
        const lockKey = conversationId ? `${userId}:${conversationId}:orchestrated` : `${userId}:orchestrated`
        const existing = this.locks.get(lockKey)

        if (existing) {
            // Conversation already has a command running
            return false
        }

        this.locks.set(lockKey, {
            command,
            startedAt: new Date(),
        })

        return true
    }

    /**
     * Releases the lock for a user's conversation.
     * Should be called in finally block of command handlers.
     */
    release(userId: string, conversationId?: string): void {
        const lockKey = conversationId ? `${userId}:${conversationId}:orchestrated` : `${userId}:orchestrated`
        this.locks.delete(lockKey)
    }

    /**
     * Gets info about current lock for a user (for debugging/logging).
     */
    getLockInfo(userId: string): LockInfo | undefined {
        const lockKey = `${userId}:orchestrated`
        return this.locks.get(lockKey)
    }

    /**
     * Checks if a user has an active lock.
     */
    hasLock(userId: string): boolean {
        this.cleanExpiredLocks()
        const lockKey = `${userId}:orchestrated`
        return this.locks.has(lockKey)
    }

    /**
     * Cleans up locks that exceeded the safety timeout.
     * Prevents orphaned locks from blocking users forever.
     */
    private cleanExpiredLocks(): void {
        const now = Date.now()
        const keysToDelete: string[] = []

        this.locks.forEach((lock, key) => {
            const elapsed = now - lock.startedAt.getTime()
            if (elapsed > LOCK_TIMEOUT_MS) {
                console.warn(`[CommandLock] Cleaning expired lock: ${key} (command: ${lock.command})`)
                keysToDelete.push(key)
            }
        })

        keysToDelete.forEach(key => this.locks.delete(key))
    }
}

// Singleton instance
export const commandLock = new CommandLock()

// Export class for testing
export { CommandLock }
