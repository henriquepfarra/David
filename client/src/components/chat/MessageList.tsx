/**
 * MessageList - Renderização de mensagens do chat
 * 
 * Extraído de David.tsx na Fase 5 do plano de refatoração.
 * Este componente gerencia:
 * - Renderização de mensagens do assistente (com thinking colapsável)
 * - Renderização de mensagens do usuário (bubble style)
 * - Mensagem pendente (otimista)
 * - Indicador de "pensando"
 * - Streaming de mensagens
 * - Botões de aprovar/editar minutas
 */

import { Button } from "@/components/ui/button";
import { Check, Edit, ChevronDown } from "lucide-react";
import { Streamdown } from "streamdown";
import { ProcessBanner } from "./ProcessBanner";
import { APP_LOGO } from "@/const";

interface Message {
    id: number;
    role: "user" | "assistant" | "system";
    content: string;
    thinking?: string | null;
    createdAt: Date | string;
}

interface ParsedStreaming {
    thinking: string;
    content: string;
    inProgress: boolean;
}

interface MessageListProps {
    messages: Message[];
    pendingUserMessage: string | null;
    isStreaming: boolean;
    parsedStreaming: ParsedStreaming;
    statusMessage: string;
    onApproveDraft: (messageId: number, content: string, status: "approved" | "rejected") => void;
    onEditDraft: (messageId: number, content: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    processNumber?: string | null;
}

/**
 * Verifica se uma mensagem é uma minuta jurídica
 */
function isDraftMessage(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return (
        lowerContent.includes("minuta") ||
        lowerContent.includes("petição") ||
        lowerContent.includes("contestação") ||
        lowerContent.includes("sentença") ||
        lowerContent.includes("decisão interlocutória") ||
        lowerContent.includes("despacho") ||
        lowerContent.includes("recurso") ||
        (lowerContent.includes("excelentíssimo") && content.length > 500)
    );
}

/**
 * Mensagem do Assistente (David)
 */
function AssistantMessage({
    message,
    onApproveDraft,
    onEditDraft,
}: {
    message: Message;
    onApproveDraft: (messageId: number, content: string, status: "approved" | "rejected") => void;
    onEditDraft: (messageId: number, content: string) => void;
}) {
    const isDraft = isDraftMessage(message.content);

    return (
        <div className="flex flex-col items-start gap-2 max-w-4xl w-full mb-8 animate-in fade-in slide-in-from-bottom-2 group">
            {/* Header da Mensagem (Avatar + Nome) */}
            <div className="flex items-center gap-0 select-none pl-0 opacity-90 group-hover:opacity-100 transition-opacity">
                <img src={APP_LOGO} alt="D" className="w-[60px] h-[60px] object-contain" />
                <div className="flex items-center gap-2 -ml-2">
                    <span className="font-semibold text-sm text-foreground/90">David</span>
                    <span className="text-[10px] text-muted-foreground/80">• Assistente Jurídico</span>
                </div>
            </div>

            {/* Thinking Colapsável (se existir) */}
            {message.thinking && (
                <details className="pl-10 w-full group/thinking">
                    <summary className="flex items-center gap-2 cursor-pointer text-sm text-primary/80 hover:text-primary transition-colors select-none list-none">
                        <span className="text-primary">✦</span>
                        <span className="font-medium">Mostrar raciocínio</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open/thinking:rotate-180" />
                    </summary>
                    <div className="mt-2 p-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-muted-foreground/80 whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
                        {message.thinking}
                    </div>
                </details>
            )}

            <div className="pl-10 w-full text-foreground leading-relaxed space-y-2 text-justify">
                <Streamdown>{message.content}</Streamdown>

                {/* Timestamp ou Botões de Ação (Minutas) */}
                {!isDraft ? (
                    <p className="text-[10px] text-muted-foreground/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                    </p>
                ) : (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                        <p className="text-xs opacity-70 flex-1">
                            {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => onApproveDraft(message.id, message.content, "approved")}
                        >
                            <Check className="h-3.5 w-3.5" />
                            Aprovar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            onClick={() => onEditDraft(message.id, message.content)}
                        >
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Mensagem do Usuário (Bubble Style)
 */
function UserMessage({ message }: { message: Message }) {
    return (
        <div className="flex justify-end mb-8 pl-10">
            <div className="bg-muted px-5 py-3.5 rounded-3xl rounded-tr-md max-w-[85%] text-foreground/90 shadow-sm">
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className="text-[10px] text-muted-foreground/60 text-right mt-1">
                    {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                </p>
            </div>
        </div>
    );
}

/**
 * Indicador de "Pensando" estilo Gemini
 */
function ThinkingIndicator({ statusMessage }: { statusMessage: string }) {
    return (
        <div className="flex justify-start py-2">
            <div className="thinking-indicator">
                <div className="thinking-circle">
                    <img src={APP_LOGO} alt="D" className="thinking-logo" />
                </div>
                <span className="text-sm text-muted-foreground">{statusMessage}</span>
            </div>
        </div>
    );
}

/**
 * Mensagem em Streaming (com thinking aberto por padrão)
 */
function StreamingMessage({
    parsedStreaming,
    statusMessage,
}: {
    parsedStreaming: ParsedStreaming;
    statusMessage: string;
}) {
    return (
        <div className="flex flex-col items-start gap-2 max-w-4xl w-full mb-8 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center gap-1 select-none pl-0">
                <img src={APP_LOGO} alt="D" className="w-[60px] h-[60px] object-contain" />
                <div className="flex items-center gap-2 -ml-2">
                    <span className="font-semibold text-sm text-foreground/90">David</span>
                    <span className="text-[10px] text-muted-foreground/80">• {statusMessage}</span>
                </div>
            </div>

            {/* Thinking Colapsável durante streaming (aberto por padrão) */}
            {parsedStreaming.thinking && (
                <details className="pl-10 w-full group/thinking" open>
                    <summary className="flex items-center gap-2 cursor-pointer text-sm text-primary/80 hover:text-primary transition-colors select-none list-none">
                        <span className="text-primary">✦</span>
                        <span className="font-medium">Mostrar raciocínio</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-open/thinking:rotate-180" />
                    </summary>
                    <div className="mt-2 p-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-muted-foreground/80 whitespace-pre-wrap font-mono text-[13px] leading-relaxed max-h-[300px] overflow-y-auto">
                        {parsedStreaming.thinking}
                    </div>
                </details>
            )}

            {/* Content */}
            {parsedStreaming.content && (
                <div className="pl-10 w-full text-foreground leading-relaxed text-justify">
                    <Streamdown>{parsedStreaming.content}</Streamdown>
                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary/50 animate-pulse rounded-sm" />
                </div>
            )}
        </div>
    );
}

/**
 * Componente principal - Lista de mensagens
 */
export function MessageList({
    messages,
    pendingUserMessage,
    isStreaming,
    parsedStreaming,
    statusMessage,
    onApproveDraft,
    onEditDraft,
    messagesEndRef,
    processNumber,
}: MessageListProps) {
    return (
        <>
            {/* Processo Vinculado em destaque */}
            {processNumber && <ProcessBanner processNumber={processNumber} />}

            {/* Mensagens existentes */}
            {messages.map((message) => {
                if (message.role === "assistant") {
                    return (
                        <AssistantMessage
                            key={message.id}
                            message={message}
                            onApproveDraft={onApproveDraft}
                            onEditDraft={onEditDraft}
                        />
                    );
                }
                return <UserMessage key={message.id} message={message} />;
            })}

            {/* Mensagem pendente do usuário (otimista - aparece imediatamente) */}
            {pendingUserMessage && (
                <div className="flex justify-end mb-8 pl-10">
                    <div className="bg-muted px-5 py-3.5 rounded-3xl rounded-tr-md max-w-[85%] text-foreground/90 shadow-sm">
                        <p className="whitespace-pre-wrap leading-relaxed">{pendingUserMessage}</p>
                    </div>
                </div>
            )}

            {/* Indicador "Thinking" estilo Gemini - Só exibe se não tiver nem thinking nem resposta ainda */}
            {isStreaming && !parsedStreaming.content && !parsedStreaming.thinking && (
                <ThinkingIndicator statusMessage={statusMessage} />
            )}

            {/* Mensagem em streaming (inclui thinking estilo Gemini) */}
            {isStreaming && (parsedStreaming.thinking || parsedStreaming.content) && (
                <StreamingMessage parsedStreaming={parsedStreaming} statusMessage={statusMessage} />
            )}

            {/* Elemento invisível para scroll automático */}
            <div ref={messagesEndRef} />
        </>
    );
}

export default MessageList;
