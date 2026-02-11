/**
 * SlashCommandMenu - Dropdown menu for slash commands
 * 
 * Shows available commands when user types "/" in the chat input.
 * Commands are filtered based on active module and search text.
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

import { useMemo, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'

// ============================================
// TYPES
// ============================================

interface CommandInfo {
    trigger: string
    name: string
    description: string
    requiresArgument?: boolean
    requiresProcess?: boolean
    type?: 'simple' | 'orchestrated'
    modules?: string[]
}

interface SlashCommandMenuProps {
    isOpen: boolean
    onSelect: (command: string) => void
    onClose: () => void
    filter: string
    position?: 'above' | 'below'
    /** Module slug to filter commands by (default: 'default') */
    moduleSlug?: string
}

// ============================================
// FALLBACK COMMANDS (used when tRPC fails)
// ============================================

const FALLBACK_COMMANDS: CommandInfo[] = [
    {
        trigger: '/consultar',
        name: 'Consultar Base',
        description: 'Busca teses e diretrizes na base de conhecimento',
        requiresArgument: true,
    },
    {
        trigger: '/minutar',
        name: 'Minutar Decisão',
        description: 'Gera minuta de decisão/sentença com base na análise',
        requiresArgument: true,
    },
]

// ============================================
// COMPONENT
// ============================================

export function SlashCommandMenu({
    isOpen,
    onSelect,
    onClose,
    filter,
    position = 'above',
    moduleSlug = 'default',
}: SlashCommandMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Fetch commands from backend based on module
    // IMPORTANT: Track loading state to avoid selecting from stale fallback
    const { data: commands, isLoading, isFetching } = trpc.commands.listAvailable.useQuery(
        { moduleSlug },
        {
            staleTime: 60000, // Cache for 1 minute
            enabled: isOpen, // Only fetch when menu is open
        }
    )

    // Use fetched commands or fallback only when fully loaded
    const safeCommands = commands ?? FALLBACK_COMMANDS
    const isCommandsReady = !isLoading && !isFetching && commands !== undefined


    // Filter commands by search text
    const filteredCommands = useMemo(() => {
        const searchTerm = filter.toLowerCase()
        return safeCommands.filter(cmd =>
            cmd.trigger.toLowerCase().includes(searchTerm) ||
            cmd.name.toLowerCase().includes(searchTerm) ||
            cmd.description.toLowerCase().includes(searchTerm)
        )
    }, [safeCommands, filter])

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [filter])

    // Auto-close menu when no commands match the filter
    // This allows the parent component to know there are no valid commands
    // and proceed with sending the message
    useEffect(() => {
        if (isOpen && isCommandsReady && filteredCommands.length === 0 && filter.length > 0) {
            // No commands match the typed filter - close the menu
            // This will set showSlashMenu to false in the parent, allowing Enter to send the message
            onClose()
        }
    }, [isOpen, isCommandsReady, filteredCommands.length, filter.length, onClose])

    // =====================================================
    // REFS TO AVOID STALE CLOSURES IN KEYBOARD LISTENER
    // =====================================================
    const filteredCommandsRef = useRef(filteredCommands)
    const selectedIndexRef = useRef(selectedIndex)
    const filterRef = useRef(filter)
    const isCommandsReadyRef = useRef(isCommandsReady)

    // Keep refs in sync
    useEffect(() => {
        filteredCommandsRef.current = filteredCommands
    }, [filteredCommands])

    useEffect(() => {
        selectedIndexRef.current = selectedIndex
    }, [selectedIndex])

    useEffect(() => {
        filterRef.current = filter
    }, [filter])

    useEffect(() => {
        isCommandsReadyRef.current = isCommandsReady
    }, [isCommandsReady])

    // Handle keyboard navigation
    useEffect(() => {
        // Don't register listener if menu is closed
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Use refs to get current values (avoid stale closures)
            const currentFilteredCommands = filteredCommandsRef.current
            const currentSelectedIndex = selectedIndexRef.current
            const currentFilter = filterRef.current

            // If no commands match, don't handle keyboard events
            if (currentFilteredCommands.length === 0) return

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setSelectedIndex(i => Math.min(i + 1, currentFilteredCommands.length - 1))
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setSelectedIndex(i => Math.max(i - 1, 0))
                    break
                case 'Enter':
                    // Don't auto-select if commands are still loading (using fallback)
                    if (!isCommandsReadyRef.current) {
                        // Let the event bubble so HomeScreen/ChatInputArea handles the send
                        return
                    }

                    // Verify match validity to prevent stale state issues
                    const selected = currentFilteredCommands[currentSelectedIndex];

                    // Strict check: Only auto-select if:
                    // 1. User manually navigated (selectedIndex > 0), OR
                    // 2. Just typed '/' with no filter (auto-select first is ok), OR
                    // 3. The selected command's trigger starts with EXACTLY what was typed (prefix match)
                    //
                    // CRITICAL FIX: If input has spaces (arguments), DO NOT auto-select anything!
                    // This prevents selecting '/consultar' when typing '/minutar args'
                    const hasArguments = currentFilter.includes(' ');

                    if (hasArguments) {
                        // User is typing arguments - let the event bubble to ChatInputArea
                        return;
                    }

                    // PREVENT STALE SELECTION: If filter is empty and user hasn't navigated, 
                    // DO NOT auto-select. This prevents selecting '/consultar' (index 0) 
                    // when typing fast and filter hasn't updated yet.
                    if (currentFilter.length === 0 && currentSelectedIndex === 0) {
                        return;
                    }

                    const filterWithSlash = '/' + currentFilter.toLowerCase();

                    // Verify the selected command's trigger starts with exactly what the user typed
                    const isExactOrPrefixMatch = selected && (
                        selected.trigger.toLowerCase() === filterWithSlash ||
                        selected.trigger.toLowerCase().startsWith(filterWithSlash)
                    );

                    const isPlausibleMatch = selected && (
                        currentSelectedIndex > 0 || // User manually selected
                        (currentFilter.length === 0 && !hasArguments) || // Just typed '/', auto-select first is ok
                        isExactOrPrefixMatch // Filter matches the trigger prefix
                    );

                    if (isPlausibleMatch) {
                        e.preventDefault();
                        onSelect(selected.trigger);
                    }
                    // Otherwise let the event bubble so HomeScreen/ChatInputArea handles the send
                    break
                case 'Escape':
                    e.preventDefault()
                    onClose()
                    break
                case 'Tab':
                    e.preventDefault()
                    if (currentFilteredCommands[currentSelectedIndex]) {
                        onSelect(currentFilteredCommands[currentSelectedIndex].trigger)
                    }
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onSelect, onClose]) // Only depend on stable props

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    if (!isOpen || filteredCommands.length === 0) {
        return null
    }

    return (
        <div
            ref={menuRef}
            className={cn(
                'absolute left-0 z-50 w-80',
                'bg-white dark:bg-gray-800 rounded-lg shadow-xl',
                'border border-gray-200 dark:border-gray-700',
                'overflow-hidden',
                position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
            )}
        >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Comandos Disponíveis
                    {moduleSlug !== 'default' && (
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] uppercase">
                            {moduleSlug}
                        </span>
                    )}
                </span>
            </div>

            {/* Command List */}
            <div className="max-h-64 overflow-y-auto">
                {filteredCommands.map((cmd, index) => {
                    // Commands that are module-specific (not '*' global) get green color
                    const isModuleSpecific = cmd.modules && !cmd.modules.includes('*');

                    return (
                        <button
                            key={cmd.trigger}
                            onClick={() => onSelect(cmd.trigger)}
                            className={cn(
                                'w-full px-3 py-2 text-left',
                                'flex items-center gap-3 transition-colors',
                                'hover:bg-gray-100 dark:hover:bg-gray-700',
                                index === selectedIndex && 'bg-gray-100 dark:bg-gray-700'
                            )}
                        >
                            {/* Command trigger - Green for specialized, Blue for global */}
                            <span className={cn(
                                'font-mono text-sm font-medium',
                                isModuleSpecific
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-blue-500 dark:text-blue-400'
                            )}>
                                {cmd.trigger}
                            </span>

                            {/* Name and description */}
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {cmd.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {cmd.description}
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-1 shrink-0">
                                {cmd.requiresArgument && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        [arg]
                                    </span>
                                )}
                                {cmd.type === 'orchestrated' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 rounded font-medium">
                                        multi-step
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    ↑↓ para navegar • Enter para selecionar • Esc para fechar
                </span>
            </div>
        </div>
    )
}
