/**
 * HomeScreen - Tela inicial do David (sem conversa selecionada)
 * 
 * Extraído de David.tsx na Fase 6 do plano de refatoração.
 * Este componente renderiza a tela estilo Gemini quando não há conversa ativa.
 */

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Send,
    Upload,
    BookMarked,
    Paperclip,
    Settings,
    Mic,
    FileText,
    Loader2,
    X,
} from "lucide-react";

interface UploadState {
    isUploading: boolean;
    fileName: string | null;
    stage: 'idle' | 'sending' | 'reading' | 'extracting' | 'done' | 'error' | null;
}

interface AttachedFile {
    uri: string;
    name: string;
    type?: string;
    size?: number;
}

interface HomeScreenProps {
    userName: string;
    messageInput: string;
    setMessageInput: (value: string) => void;
    onSendMessage: () => void;
    onOpenUpload: () => void;
    onOpenPrompts: () => void;
    onOpenFiles: () => void;
    onOpenSettings: () => void;
    uploadState: UploadState;
    attachedFiles: AttachedFile[];
    onRemoveFile: (uri: string) => void;
    isRecording: boolean;
    onRecordClick: () => void;
    isTranscribing: boolean;
    isCreatingConversation: boolean;
    isStreaming: boolean;
}

export function HomeScreen({
    userName,
    messageInput,
    setMessageInput,
    onSendMessage,
    onOpenUpload,
    onOpenPrompts,
    onOpenFiles,
    onOpenSettings,
    uploadState,
    attachedFiles,
    onRemoveFile,
    isRecording,
    onRecordClick,
    isTranscribing,
    isCreatingConversation,
    isStreaming,
}: HomeScreenProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-ajuste do textarea
    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    // Ajustar altura quando messageInput mudar externamente
    useEffect(() => {
        adjustTextareaHeight();
    }, [messageInput]);

    // Handler para Enter sem Shift
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.trim() && !isStreaming && !isCreatingConversation) {
                onSendMessage();
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="w-full max-w-2xl space-y-8">
                {/* Saudação personalizada */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-medium bg-gradient-to-r from-[#1e3a5a] via-[#2563eb] to-[#d4a828] bg-clip-text text-transparent">
                        Olá, {userName}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Como posso ajudar você hoje?
                    </p>
                </div>

                {/* Input centralizado estilo Gemini */}
                <div className="relative">
                    <div className="flex flex-col gap-2 p-3 bg-muted/50 border rounded-2xl shadow-sm hover:shadow-md transition-shadow">

                        {/* Progresso de upload (HOME) */}
                        {uploadState.isUploading && (
                            <div className="px-3 py-2 border-b border-gray-200">
                                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate max-w-[200px]" title={uploadState.fileName || ''}>
                                            {uploadState.fileName}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500 rounded-full"
                                                    style={{
                                                        width: uploadState.stage === 'sending' ? '25%'
                                                            : uploadState.stage === 'reading' ? '50%'
                                                                : uploadState.stage === 'extracting' ? '75%'
                                                                    : uploadState.stage === 'done' ? '100%'
                                                                        : '0%'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {uploadState.stage === 'sending' && 'Enviando...'}
                                                {uploadState.stage === 'reading' && 'Processando...'}
                                                {uploadState.stage === 'extracting' && 'Extraindo...'}
                                                {uploadState.stage === 'done' && 'Concluído!'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Badge de arquivos anexados - ACIMA do input (estilo Gemini) */}
                        {!uploadState.isUploading && attachedFiles.length > 0 && (
                            <div className="px-3 py-2 border-b border-gray-200">
                                <div className="flex flex-wrap gap-2">
                                    {attachedFiles.map((file) => (
                                        <div
                                            key={file.uri}
                                            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-1.5 text-sm border border-gray-200 transition-colors"
                                        >
                                            <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                            <span className="truncate max-w-[250px] font-medium text-gray-700">
                                                {file.name}
                                            </span>
                                            <button
                                                onClick={() => onRemoveFile(file.uri)}
                                                className="ml-1 hover:bg-gray-200 rounded p-0.5 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5 text-gray-500" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Container do input (flex horizontal) */}
                        <div className="flex items-end gap-2">
                            {/* Botão de upload */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={onOpenUpload}
                                title="Enviar processo (PDF)"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>

                            {/* Textarea */}
                            <Textarea
                                ref={textareaRef}
                                value={messageInput}
                                onChange={(e) => {
                                    setMessageInput(e.target.value);
                                    adjustTextareaHeight();
                                }}
                                onKeyDown={handleKeyPress}
                                placeholder="Pergunte algo ou envie um processo..."
                                className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none text-base placeholder:text-muted-foreground/60"
                                rows={1}
                            />

                            {/* Botões de ação */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Microfone */}
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

                                {/* Botão enviar */}
                                <Button
                                    disabled={!messageInput.trim() || isStreaming || isCreatingConversation}
                                    onClick={onSendMessage}
                                    size="icon"
                                    className="h-10 w-10 rounded-full shrink-0 bg-blue-900 hover:bg-blue-800 text-white"
                                    title="Enviar mensagem"
                                >
                                    {isCreatingConversation ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Send className="h-5 w-5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sugestões de ação */}
                <div className="flex flex-wrap justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2 text-sm"
                        onClick={onOpenUpload}
                    >
                        <Upload className="h-4 w-4" />
                        Enviar processo
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2 text-sm"
                        onClick={onOpenPrompts}
                    >
                        <BookMarked className="h-4 w-4" />
                        Meus prompts
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2 text-sm"
                        onClick={onOpenFiles}
                    >
                        <Paperclip className="h-4 w-4" />
                        Arquivos ({attachedFiles.length})
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2 text-sm"
                        onClick={onOpenSettings}
                    >
                        <Settings className="h-4 w-4" />
                        Configurações
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default HomeScreen;
