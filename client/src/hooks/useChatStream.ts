/**
 * useChatStream - Hook para gerenciamento de streaming SSE no chat
 * 
 * Extraído de David.tsx para:
 * - Gerenciar AbortController
 * - Controlar buffer de streaming
 * - Separar thinking de content
 * - Tratar erros de conexão
 */

import { useState, useRef, useCallback } from "react";

// ============================================
// TIPOS
// ============================================

export interface StreamState {
    isStreaming: boolean;
    content: string;
    thinking: string;
    error: string | null;
}

export interface StreamCallbacks {
    onDone?: () => void;
    onError?: (error: string) => void;
    onTitleGenerate?: (conversationId: number) => void;
}

export interface UseChatStreamReturn {
    // Estado
    isStreaming: boolean;
    streamedContent: string;
    thinkingContent: string;
    error: string | null;
    statusMessage: string;

    // Ações
    streamMessage: (conversationId: number, content: string, callbacks?: StreamCallbacks) => Promise<void>;
    stopGeneration: () => void;
    resetStream: () => void;
}

// ============================================
// HOOK
// ============================================

export function useChatStream(): UseChatStreamReturn {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamedContent, setStreamedContent] = useState("");
    const [thinkingContent, setThinkingContent] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState("Pensando...");

    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Inicia streaming de mensagem para o servidor
     */
    const streamMessage = useCallback(async (
        conversationId: number,
        content: string,
        callbacks?: StreamCallbacks
    ) => {
        setIsStreaming(true);
        setStreamedContent("");
        setThinkingContent("");
        setError(null);
        setStatusMessage("Conectando...");

        // Mensagens de status variadas para dar sensação de atividade
        const statusMessages = [
            "Analisando sua solicitação...",
            "Pesquisando base de dados...",
            "Consultando jurisprudência...",
            "Cruzando informações...",
            "Verificando precedentes...",
            "Processando resposta..."
        ];
        let messageIndex = 0;
        const statusInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % statusMessages.length;
            setStatusMessage(statusMessages[messageIndex]);
        }, 3500); // Muda a cada 3.5 segundos - ritmo mais profissional

        // Criar novo AbortController para este stream
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch("/api/david/stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // Importante: enviar cookies de sessão
                body: JSON.stringify({ conversationId, content }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                let errorMessage = "Erro ao iniciar streaming";
                try {
                    const errorData = await response.json();
                    if (errorData.details) errorMessage += `: ${errorData.details}`;
                    else if (errorData.error) errorMessage += `: ${errorData.error}`;
                } catch {
                    errorMessage += ` (${response.status} ${response.statusText})`;
                }
                throw new Error(errorMessage);
            }

            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data: ")) continue;

                    try {
                        const data = JSON.parse(trimmed.slice(6));

                        if (data.type === "chunk") {
                            setStreamedContent((prev) => prev + (data.content as string));
                        } else if (data.type === "thinking") {
                            setThinkingContent((prev) => prev + data.content);
                        } else if (data.type === "done") {
                            clearInterval(statusInterval);
                            // NÃO setar isStreaming=false aqui! O callback onDone fará isso
                            // DEPOIS do refetch completar, evitando gap visual
                            callbacks?.onDone?.();

                            // Gerar título se necessário
                            if (callbacks?.onTitleGenerate) {
                                callbacks.onTitleGenerate(conversationId);
                            }
                        } else if (data.type === "error") {
                            clearInterval(statusInterval);
                            setError("Erro ao gerar resposta");
                            setIsStreaming(false);
                            callbacks?.onError?.("Erro ao gerar resposta");
                        }
                    } catch (e) {
                        console.error("Failed to parse SSE:", e);
                    }
                }
            }
        } catch (err) {
            clearInterval(statusInterval);
            console.error("Stream error:", err);

            if (err instanceof Error && err.name === "AbortError") {
                // Stream foi cancelado pelo usuário - não é erro
                setError(null);
            } else {
                const errorMessage = err instanceof Error ? err.message : "Erro ao enviar mensagem";
                setError(errorMessage);
                callbacks?.onError?.(errorMessage);
            }

            setIsStreaming(false);
        } finally {
            abortControllerRef.current = null;
        }
    }, []);

    /**
     * Para a geração em andamento
     */
    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsStreaming(false);
            // Mantém o conteúdo streamado para exibição
        }
    }, []);

    /**
     * Reseta todo o estado do stream
     */
    const resetStream = useCallback(() => {
        setIsStreaming(false);
        setStreamedContent("");
        setThinkingContent("");
        setError(null);
    }, []);

    return {
        isStreaming,
        streamedContent,
        thinkingContent,
        error,
        statusMessage,
        streamMessage,
        stopGeneration,
        resetStream,
    };
}
