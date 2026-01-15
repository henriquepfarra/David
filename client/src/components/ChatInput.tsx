/**
 * ChatInput - Componente de Input do Chat
 * 
 * Extraído de David.tsx na Fase 2 do plano de refatoração.
 * Componente de apresentação que recebe props para controle.
 */

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mic, Send, Plus, Wand2 } from 'lucide-react';

export interface ChatInputProps {
    /** Valor atual do input */
    value: string;
    /** Callback quando o valor muda */
    onChange: (value: string) => void;
    /** Callback para enviar mensagem */
    onSend: () => void;
    /** Callback para abrir seletor de arquivo */
    onOpenFileSelector?: () => void;
    /** Callback para gravar áudio */
    onRecordClick?: () => void;
    /** Callback para melhorar prompt */
    onEnhancePrompt?: () => void;
    /** Se está em streaming */
    isStreaming?: boolean;
    /** Se está gravando áudio */
    isRecording?: boolean;
    /** Se está transcrevendo áudio */
    isTranscribing?: boolean;
    /** Se está melhorando prompt */
    isEnhancing?: boolean;
    /** Se está criando conversa */
    isCreating?: boolean;
    /** Placeholder do textarea */
    placeholder?: string;
    /** Se deve mostrar botão de arquivo */
    showFileButton?: boolean;
    /** Se deve mostrar botão de microfone */
    showMicButton?: boolean;
    /** Se deve mostrar botão de enhance */
    showEnhanceButton?: boolean;
    /** Classe CSS adicional */
    className?: string;
}

export interface ChatInputRef {
    focus: () => void;
    adjustHeight: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({
    value,
    onChange,
    onSend,
    onOpenFileSelector,
    onRecordClick,
    onEnhancePrompt,
    isStreaming = false,
    isRecording = false,
    isTranscribing = false,
    isEnhancing = false,
    isCreating = false,
    placeholder = "Digite sua mensagem...",
    showFileButton = true,
    showMicButton = true,
    showEnhanceButton = false,
    className = "",
}, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Ajustar altura do textarea automaticamente
    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        }
    };

    // Expor métodos para o parent
    useImperativeHandle(ref, () => ({
        focus: () => textareaRef.current?.focus(),
        adjustHeight,
    }));

    // Ajustar altura quando valor muda
    useEffect(() => {
        adjustHeight();
    }, [value]);

    // Handler de teclas
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isStreaming && !isCreating) {
                onSend();
            }
        }
    };

    const isSendDisabled = !value.trim() || isStreaming || isCreating;

    return (
        <div className={`flex items-end gap-2 ${className}`}>
            {/* Botão de arquivo */}
            {showFileButton && onOpenFileSelector && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={onOpenFileSelector}
                    title="Enviar arquivo (PDF)"
                >
                    <Plus className="h-5 w-5" />
                </Button>
            )}

            {/* Textarea */}
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none text-base placeholder:text-muted-foreground/60"
                rows={1}
            />

            {/* Botões de ação */}
            <div className="flex items-center gap-1 shrink-0">
                {/* Botão de enhance */}
                {showEnhanceButton && onEnhancePrompt && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={onEnhancePrompt}
                        disabled={!value.trim() || isEnhancing}
                        title="Melhorar prompt"
                    >
                        {isEnhancing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Wand2 className="h-5 w-5" />
                        )}
                    </Button>
                )}

                {/* Microfone */}
                {showMicButton && onRecordClick && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        onClick={onRecordClick}
                        disabled={isTranscribing}
                        title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                    >
                        {isTranscribing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Mic className="h-5 w-5" />
                        )}
                    </Button>
                )}

                {/* Botão enviar */}
                <Button
                    disabled={isSendDisabled}
                    onClick={onSend}
                    size="icon"
                    className={`h-10 w-10 rounded-full shrink-0 transition-all duration-300 ${value.trim()
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-105'
                            : 'bg-muted text-muted-foreground'
                        }`}
                    title="Enviar mensagem"
                >
                    {isCreating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Send className="h-5 w-5" />
                    )}
                </Button>
            </div>
        </div>
    );
});

ChatInput.displayName = 'ChatInput';
