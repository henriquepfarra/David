/**
 * ThinkingAccordion - Componente para exibir bloco de raciocínio expansível
 * 
 * Exibe o conteúdo de <thinking>...</thinking> em um accordion estilizado
 * com ícone 🧠 e animação suave
 */

import React, { useState } from "react";
import { ChevronDown, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingAccordionProps {
    content: string;
    defaultOpen?: boolean;
    className?: string;
}

export function ThinkingAccordion({
    content,
    defaultOpen = false,
    className,
}: ThinkingAccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!content.trim()) return null;

    return (
        <div
            className={cn(
                "border rounded-lg bg-muted/30 overflow-hidden transition-all duration-200",
                className
            )}
        >
            {/* Header - sempre visível */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    <span className="font-medium">Raciocínio</span>
                </div>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Conteúdo expansível */}
            <div
                className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="px-3 py-2 text-sm text-muted-foreground border-t bg-muted/20">
                    <div className="whitespace-pre-wrap">{content}</div>
                </div>
            </div>
        </div>
    );
}
