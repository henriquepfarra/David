/**
 * MessageBubble - Componente para renderizar mensagens com suporte a thinking e citações
 * 
 * Renderiza:
 * - Texto formatado
 * - Blocos <thinking> como ThinkingAccordion
 * - Citações [[REF:...]] como CitationBadge
 */

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { parseText, type ParsedSegment } from "@/lib/StreamParser";
import { ThinkingAccordion } from "./ThinkingAccordion";
import { CitationBadgeInline } from "./CitationBadge";

interface MessageBubbleProps {
    role: "user" | "assistant" | "system";
    content: string;
    thinking?: string | null;
    className?: string;
    onCitationClick?: (segment: ParsedSegment) => void;
}

export function MessageBubble({
    role,
    content,
    thinking,
    className,
    onCitationClick,
}: MessageBubbleProps) {
    // Parsear conteúdo para detectar thinking e citações
    const segments = useMemo(() => parseText(content), [content]);

    // Verificar se há thinking no conteúdo ou separado
    const hasThinking = thinking || segments.some((s) => s.type === "thinking");
    const thinkingContent = thinking || segments.find((s) => s.type === "thinking")?.content || "";

    // Conteúdo sem thinking (para renderização)
    const contentSegments = segments.filter((s) => s.type !== "thinking");

    const isUser = role === "user";
    const isAssistant = role === "assistant";

    return (
        <div
            className={cn(
                "flex",
                isUser ? "justify-end" : "justify-start",
                className
            )}
        >
            <div
                className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-foreground"
                )}
            >
                {/* Bloco de Thinking (se houver) */}
                {hasThinking && isAssistant && (
                    <ThinkingAccordion
                        content={thinkingContent}
                        className="mb-3"
                    />
                )}

                {/* Conteúdo principal com citações */}
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    {contentSegments.map((segment, index) => (
                        <RenderSegment
                            key={index}
                            segment={segment}
                            onCitationClick={onCitationClick}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Renderiza um segmento individual
 */
function RenderSegment({
    segment,
    onCitationClick,
}: {
    segment: ParsedSegment;
    onCitationClick?: (segment: ParsedSegment) => void;
}) {
    if (segment.type === "citation") {
        return (
            <CitationBadgeInline
                segment={segment}
                onClick={onCitationClick}
            />
        );
    }

    if (segment.type === "text") {
        // Renderização simples de texto com quebras de linha
        // Para Markdown completo, usar react-markdown no David.tsx que já tem a dependência
        return (
            <div className="whitespace-pre-wrap break-words">
                {segment.content}
            </div>
        );
    }

    // Thinking já é tratado separadamente
    return null;
}

/**
 * MessageBubbleStreaming - Versão para mensagens em streaming
 * Aceita conteúdo bruto e faz parsing em tempo real
 */
export function MessageBubbleStreaming({
    content,
    thinking,
    className,
    onCitationClick,
}: {
    content: string;
    thinking?: string;
    className?: string;
    onCitationClick?: (segment: ParsedSegment) => void;
}) {
    return (
        <MessageBubble
            role="assistant"
            content={content}
            thinking={thinking}
            className={className}
            onCitationClick={onCitationClick}
        />
    );
}
