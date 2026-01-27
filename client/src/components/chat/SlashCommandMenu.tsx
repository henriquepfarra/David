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
    const { data: commands = FALLBACK_COMMANDS } = trpc.commands.listAvailable.useQuery(
        { moduleSlug },
        {
            staleTime: 60000, // Cache for 1 minute
            enabled: isOpen, // Only fetch when menu is open
        }
    )

    // Filter commands by search text
    const filteredCommands = useMemo(() => {
        const searchTerm = filter.toLowerCase()
        return commands.filter(cmd =>
            cmd.trigger.toLowerCase().includes(searchTerm) ||
            cmd.name.toLowerCase().includes(searchTerm) ||
            cmd.description.toLowerCase().includes(searchTerm)
        )
    }, [commands, filter])

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [filter])

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setSelectedIndex(i => Math.max(i - 1, 0))
                    break
                case 'Enter':
                    e.preventDefault()
                    if (filteredCommands[selectedIndex]) {
                        onSelect(filteredCommands[selectedIndex].trigger)
                    }
                    break
                case 'Escape':
                    e.preventDefault()
                    onClose()
                    break
                case 'Tab':
                    e.preventDefault()
                    if (filteredCommands[selectedIndex]) {
                        onSelect(filteredCommands[selectedIndex].trigger)
                    }
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, filteredCommands, selectedIndex, onSelect, onClose])

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
                {filteredCommands.map((cmd, index) => (
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
                        {/* Command trigger */}
                        <span className="text-blue-500 dark:text-blue-400 font-mono text-sm font-medium">
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
                                <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                                    multi-step
                                </span>
                            )}
                        </div>
                    </button>
                ))}
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
