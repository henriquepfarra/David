/**
 * HomeScreen - Tela inicial do David (sem conversa selecionada)
 *
 * Extraído de David.tsx na Fase 6 do plano de refatoração.
 * Este componente renderiza a tela estilo Gemini quando não há conversa ativa.
 */

import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Mic,
    FileText,
    Loader2,
    X,
    ChevronUp,
    Check,
    Upload,
    BookOpen,
    Zap,
} from "lucide-react";
import { SlashCommandMenu } from "./chat/SlashCommandMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { CURATED_MODELS, findCuratedModelByApiModel } from "@shared/curatedModels";
import { getProviderIcon } from "@/components/ProviderIcons";

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
    showMicButton?: boolean;
    // Model selector
    llmModel?: string | null;
    llmProvider?: string | null;
    onSelectModel?: (curatedModelId: string) => void;
    isSelectingModel?: boolean;
}

export function HomeScreen({
    userName,
    messageInput,
    setMessageInput,
    onSendMessage,
    onOpenUpload,
    onOpenPrompts,
    uploadState,
    attachedFiles,
    onRemoveFile,
    isRecording,
    onRecordClick,
    isTranscribing,
    isCreatingConversation,
    isStreaming,
    showMicButton = true,
    llmModel,
    llmProvider,
    onSelectModel,
    isSelectingModel,
}: HomeScreenProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: userDefaultModule } = trpc.modules.getUserDefault.useQuery();

    const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
    const [plusMenuOpen, setPlusMenuOpen] = useState(false);

    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const slashFilter = useMemo(() => {
        if (!messageInput.startsWith('/')) return '';
        const match = messageInput.match(/^\/([a-z0-9]*)$/i);
        return match ? match[1] : '';
    }, [messageInput]);

    useEffect(() => {
        if (messageInput.startsWith('/') && messageInput.match(/^\/[a-z0-9]*$/i)) {
            setShowSlashMenu(true);
        } else {
            setShowSlashMenu(false);
        }
    }, [messageInput]);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [messageInput]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showSlashMenu && e.key === 'Enter') {
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.trim() && !isStreaming && !isCreatingConversation) {
                onSendMessage();
            }
        }
    };

    const activeModel = findCuratedModelByApiModel(llmModel || '');
    const ActiveIcon = getProviderIcon(activeModel?.provider || 'google');

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="w-full max-w-3xl space-y-8">
                {/* Saudação personalizada */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-medium bg-gradient-to-r from-[#1e3a5a] via-[#2563eb] to-[#d4a828] bg-clip-text text-transparent">
                        Olá, {userName}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Como posso ajudar você hoje?
                    </p>
                </div>

                {/* Input card */}
                <div className="relative">
                    {/* Slash Command Menu - fora do card overflow-hidden para não ser cortado */}
                    <SlashCommandMenu
                        isOpen={showSlashMenu}
                        onSelect={(cmd) => {
                            setMessageInput(cmd + ' ');
                            setShowSlashMenu(false);
                            textareaRef.current?.focus();
                        }}
                        onClose={() => setShowSlashMenu(false)}
                        filter={slashFilter}
                        position="above"
                        moduleSlug={userDefaultModule || 'default'}
                    />

                    <div className="flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">

                        {/* Progresso de upload */}
                        {uploadState.isUploading && (
                            <div className="px-4 py-3 border-b border-gray-100">
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

                        {/* Badge de arquivos anexados */}
                        {!uploadState.isUploading && attachedFiles.length > 0 && (
                            <div className="px-4 py-3 border-b border-gray-100">
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

                        {/* Textarea */}
                        <div className="px-4 pt-4 pb-2">
                            <Textarea
                                ref={textareaRef}
                                value={messageInput}
                                onChange={(e) => {
                                    setMessageInput(e.target.value);
                                    adjustTextareaHeight();
                                }}
                                onKeyDown={handleKeyPress}
                                placeholder="O que posso fazer por você?"
                                className="min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none text-base placeholder:text-muted-foreground/50 p-0"
                                rows={1}
                            />
                        </div>

                        {/* Barra de ações inferior */}
                        <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-1.5">
                                {/* Menu + (Prompts & Comandos) */}
                                <Popover open={plusMenuOpen} onOpenChange={setPlusMenuOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-9 w-9 rounded-full transition-colors ${plusMenuOpen ? 'bg-gray-100 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'}`}
                                            title="Mais opções"
                                        >
                                            {plusMenuOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-48 p-1.5 rounded-xl"
                                        align="start"
                                        side="bottom"
                                        sideOffset={8}
                                    >
                                        <div className="space-y-0.5">
                                            <button
                                                onClick={() => { onOpenPrompts(); setPlusMenuOpen(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent text-sm"
                                            >
                                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium">Prompts</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setPlusMenuOpen(false);
                                                    setTimeout(() => {
                                                        setMessageInput('/');
                                                        setShowSlashMenu(true);
                                                        textareaRef.current?.focus();
                                                    }, 150);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent text-sm"
                                            >
                                                <Zap className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium">Comandos</span>
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Botão Enviar Processo */}
                                <button
                                    onClick={onOpenUpload}
                                    className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer select-none text-sm text-muted-foreground"
                                    title="Enviar processo (PDF)"
                                >
                                    <Upload className="w-4 h-4 flex-shrink-0" />
                                    <span className="font-medium">Enviar processo</span>
                                </button>

                                {/* Seletor de Modelo */}
                                <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer select-none text-sm text-muted-foreground"
                                            title="Trocar modelo de IA"
                                        >
                                            <ActiveIcon className="w-4 h-4 flex-shrink-0" />
                                            <span className="font-medium">
                                                {activeModel?.shortLabel || "Gemini 3 Flash"}
                                            </span>
                                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/60" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-72 p-2 rounded-xl"
                                        align="start"
                                        side="bottom"
                                        sideOffset={8}
                                    >
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Rápidos</p>
                                            {CURATED_MODELS.filter(m => m.tier === 'fast').map((m) => {
                                                const isActive = m.model === llmModel || (!llmModel && m.id === "gemini-flash");
                                                const Icon = getProviderIcon(m.provider);
                                                return (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => { onSelectModel?.(m.id); setModelPopoverOpen(false); }}
                                                        disabled={isSelectingModel}
                                                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
                                                    >
                                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm">{m.label}</div>
                                                            <div className="text-[10px] text-muted-foreground">{m.description}</div>
                                                        </div>
                                                        {isActive && <Check className="w-4 h-4 flex-shrink-0 text-primary" />}
                                                    </button>
                                                );
                                            })}
                                            <p className="text-xs font-semibold text-muted-foreground px-2 py-1 pt-2 border-t">Pro</p>
                                            {CURATED_MODELS.filter(m => m.tier === 'pro').map((m) => {
                                                const isActive = m.model === llmModel;
                                                const Icon = getProviderIcon(m.provider);
                                                return (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => { onSelectModel?.(m.id); setModelPopoverOpen(false); }}
                                                        disabled={isSelectingModel}
                                                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors text-sm ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
                                                    >
                                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm">{m.label}</div>
                                                            <div className="text-[10px] text-muted-foreground">{m.description}</div>
                                                        </div>
                                                        {isActive && <Check className="w-4 h-4 flex-shrink-0 text-primary" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Lado direito: mic */}
                            <div className="flex items-center gap-1">
                                {showMicButton && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-9 w-9 rounded-full ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'}`}
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomeScreen;
