/**
 * StreamParser - Parser para detectar e processar tags especiais em texto streaming
 * 
 * Detecta:
 * - <thinking>...</thinking> → ThinkingAccordion
 * - [[REF:SUMULA_STJ_54]] → CitationBadge clicável
 * 
 * Usado para renderizar citações e blocos de raciocínio em tempo real
 */

// ============================================
// TIPOS
// ============================================

export type SegmentType = "text" | "thinking" | "citation";

export interface ParsedSegment {
    type: SegmentType;
    content: string;
    metadata?: {
        sumulaId?: string;
        tribunal?: string;
        documentType?: string;
    };
}

export interface ParserState {
    segments: ParsedSegment[];
    inThinking: boolean;
    thinkingBuffer: string;
}

// ============================================
// REGEX PATTERNS
// ============================================

// Pattern para citações: [[REF:SUMULA_STJ_54]] ou [[REF:123]]
const CITATION_PATTERN = /\[\[REF:([A-Z_]+_)?(\d+)\]\]/g;

// Pattern para tag de abertura thinking
const THINKING_START = /<thinking>/i;

// Pattern para tag de fechamento thinking
const THINKING_END = /<\/thinking>/i;

// ============================================
// FUNÇÕES DE PARSING
// ============================================

/**
 * Parseia texto completo em segmentos
 * Usado quando todo o texto já está disponível (após streaming)
 */
export function parseText(text: string): ParsedSegment[] {
    const segments: ParsedSegment[] = [];

    // Primeiro, extrair blocos de thinking
    let remaining = text;
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = thinkingRegex.exec(text)) !== null) {
        // Texto antes do thinking
        if (match.index > lastIndex) {
            const beforeText = text.slice(lastIndex, match.index);
            segments.push(...parseTextWithCitations(beforeText));
        }

        // Bloco de thinking
        segments.push({
            type: "thinking",
            content: match[1].trim(),
        });

        lastIndex = match.index + match[0].length;
    }

    // Texto depois do último thinking (ou todo o texto se não houver thinking)
    if (lastIndex < text.length) {
        segments.push(...parseTextWithCitations(text.slice(lastIndex)));
    }

    return segments;
}

/**
 * Parseia texto com citações (sem thinking)
 */
function parseTextWithCitations(text: string): ParsedSegment[] {
    const segments: ParsedSegment[] = [];
    let remaining = text;
    let match: RegExpExecArray | null;

    // Reset regex
    CITATION_PATTERN.lastIndex = 0;

    let lastIndex = 0;
    while ((match = CITATION_PATTERN.exec(text)) !== null) {
        // Texto antes da citação
        if (match.index > lastIndex) {
            const beforeText = text.slice(lastIndex, match.index);
            if (beforeText.trim()) {
                segments.push({ type: "text", content: beforeText });
            }
        }

        // Citação
        const prefix = match[1] || ""; // Ex: "SUMULA_STJ_"
        const number = match[2]; // Ex: "54"

        // Extrair tipo e tribunal do prefixo
        let documentType = "sumula";
        let tribunal = "";

        if (prefix.includes("STJ")) tribunal = "STJ";
        else if (prefix.includes("STF")) tribunal = "STF";
        else if (prefix.includes("VINCULANTE")) {
            tribunal = "STF";
            documentType = "sumula_vinculante";
        }

        segments.push({
            type: "citation",
            content: match[0], // [[REF:SUMULA_STJ_54]]
            metadata: {
                sumulaId: number,
                tribunal,
                documentType,
            },
        });

        lastIndex = match.index + match[0].length;
    }

    // Texto depois da última citação
    if (lastIndex < text.length) {
        const afterText = text.slice(lastIndex);
        if (afterText.trim()) {
            segments.push({ type: "text", content: afterText });
        }
    }

    // Se não encontrou nada, retorna texto original
    if (segments.length === 0 && text.trim()) {
        segments.push({ type: "text", content: text });
    }

    return segments;
}

// ============================================
// STREAMING PARSER (TEMPO REAL)
// ============================================

/**
 * Cria um parser stateful para uso durante streaming
 * Mantém estado entre chunks para detectar tags que cruzam chunks
 */
export function createStreamParser() {
    let buffer = "";
    let inThinking = false;
    let thinkingBuffer = "";

    return {
        /**
         * Processa um chunk de texto e retorna segmentos detectados
         */
        processChunk(chunk: string): ParsedSegment[] {
            buffer += chunk;
            const segments: ParsedSegment[] = [];

            // Procurar por tags de thinking
            while (true) {
                if (!inThinking) {
                    // Procurar abertura de thinking
                    const startMatch = buffer.match(THINKING_START);
                    if (startMatch && startMatch.index !== undefined) {
                        // Texto antes do thinking
                        const before = buffer.slice(0, startMatch.index);
                        if (before.trim()) {
                            segments.push(...parseTextWithCitations(before));
                        }

                        // Entrar no modo thinking
                        inThinking = true;
                        thinkingBuffer = "";
                        buffer = buffer.slice(startMatch.index + startMatch[0].length);
                    } else {
                        // Sem tag de abertura encontrada
                        // Verificar se há uma tag potencialmente incompleta no final do buffer
                        // Ex: "<thin" pode se tornar "<thinking>" no próximo chunk
                        const potentialTagStart = buffer.lastIndexOf("<");

                        if (potentialTagStart !== -1) {
                            // Há um "<" no buffer - verificar se pode ser início de tag
                            const possibleTag = buffer.slice(potentialTagStart);
                            const isIncompleteThinkingTag = "<thinking>".startsWith(possibleTag.toLowerCase());
                            const isIncompleteClosingTag = "</thinking>".startsWith(possibleTag.toLowerCase());

                            if (isIncompleteThinkingTag || isIncompleteClosingTag) {
                                // Tag potencialmente incompleta - emitir texto antes e aguardar
                                const textBefore = buffer.slice(0, potentialTagStart);
                                if (textBefore.trim()) {
                                    segments.push(...parseTextWithCitations(textBefore));
                                }
                                buffer = possibleTag; // Manter apenas a parte potencial da tag
                            } else {
                                // O "<" não é início de tag thinking - pode emitir tudo
                                if (buffer.length > 15) {
                                    segments.push(...parseTextWithCitations(buffer));
                                    buffer = "";
                                }
                            }
                        } else if (buffer.length > 15) {
                            // Sem "<" no buffer - seguro emitir
                            segments.push(...parseTextWithCitations(buffer));
                            buffer = "";
                        }
                        break;
                    }
                } else {
                    // Dentro de thinking, procurar fechamento
                    const endMatch = buffer.match(THINKING_END);
                    if (endMatch && endMatch.index !== undefined) {
                        // Conteúdo do thinking
                        thinkingBuffer += buffer.slice(0, endMatch.index);

                        segments.push({
                            type: "thinking",
                            content: thinkingBuffer.trim(),
                        });

                        // Sair do modo thinking
                        inThinking = false;
                        thinkingBuffer = "";
                        buffer = buffer.slice(endMatch.index + endMatch[0].length);
                    } else {
                        // Ainda dentro do thinking, acumular
                        thinkingBuffer += buffer;
                        buffer = "";
                        break;
                    }
                }
            }

            return segments;
        },

        /**
         * Finaliza o parsing, retornando qualquer conteúdo restante
         */
        flush(): ParsedSegment[] {
            const segments: ParsedSegment[] = [];

            if (inThinking && thinkingBuffer) {
                // Thinking não fechado - emitir mesmo assim
                segments.push({
                    type: "thinking",
                    content: thinkingBuffer.trim(),
                });
            }

            if (buffer.trim()) {
                segments.push(...parseTextWithCitations(buffer));
            }

            // Reset
            buffer = "";
            inThinking = false;
            thinkingBuffer = "";

            return segments;
        },

        /**
         * Retorna se está atualmente dentro de um bloco thinking
         */
        isInThinking(): boolean {
            return inThinking;
        },
    };
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Verifica se o texto contém citações
 */
export function hasCitations(text: string): boolean {
    CITATION_PATTERN.lastIndex = 0;
    return CITATION_PATTERN.test(text);
}

/**
 * Verifica se o texto contém bloco de thinking
 */
export function hasThinking(text: string): boolean {
    return THINKING_START.test(text);
}

/**
 * Extrai apenas o conteúdo de thinking do texto
 */
export function extractThinking(text: string): string {
    const match = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    return match ? match[1].trim() : "";
}

/**
 * Remove tags de thinking do texto, mantendo apenas o conteúdo principal
 */
export function stripThinking(text: string): string {
    return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
}

/**
 * Formata citação para exibição
 * [[REF:SUMULA_STJ_54]] → "Súmula 54 do STJ"
 */
export function formatCitation(citation: ParsedSegment): string {
    if (citation.type !== "citation" || !citation.metadata) {
        return citation.content;
    }

    const { sumulaId, tribunal, documentType } = citation.metadata;

    if (documentType === "sumula_vinculante") {
        return `Súmula Vinculante ${sumulaId}`;
    }

    if (tribunal) {
        return `Súmula ${sumulaId} do ${tribunal}`;
    }

    return `Súmula ${sumulaId}`;
}
