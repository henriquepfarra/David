/**
 * CitationBadge - Componente para exibir citações clicáveis
 * 
 * Renderiza [[REF:SUMULA_STJ_54]] como um chip visual clicável
 * que pode abrir modal com detalhes da súmula
 */

import React from "react";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import type { ParsedSegment } from "@/lib/StreamParser";
import { formatCitation } from "@/lib/StreamParser";

interface CitationBadgeProps {
    segment: ParsedSegment;
    onClick?: (segment: ParsedSegment) => void;
    className?: string;
}

export function CitationBadge({
    segment,
    onClick,
    className,
}: CitationBadgeProps) {
    if (segment.type !== "citation") return null;

    const label = formatCitation(segment);
    const tribunal = segment.metadata?.tribunal || "";

    // Cores baseadas no tribunal
    const colorClasses = {
        STF: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300",
        STJ: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300",
        "": "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300",
    };

    const colorClass = colorClasses[tribunal as keyof typeof colorClasses] || colorClasses[""];

    return (
        <button
            onClick={() => onClick?.(segment)}
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
                colorClass,
                className
            )}
            title={`Clique para ver detalhes: ${label}`}
        >
            <BookOpen className="h-3 w-3" />
            <span>{label}</span>
        </button>
    );
}

/**
 * CitationBadgeInline - Versão inline para usar dentro de texto
 */
export function CitationBadgeInline({
    segment,
    onClick,
}: CitationBadgeProps) {
    return (
        <CitationBadge
            segment={segment}
            onClick={onClick}
            className="mx-0.5 align-middle"
        />
    );
}
