/**
 * ChatInputArea - Área de input do chat (quando conversa selecionada)
 * 
 * Extraído de David.tsx na Fase 7 do plano de refatoração.
 * Este componente gerencia 3 modos:
 * - Normal: input padrão com textarea, botões de ação, upload
 * - CreatePrompt: barra de ação para criar/editar prompts
 * - ViewingPrompt: barra de ação para visualizar prompt e usar
 */

import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    Send,
    Trash2,
    FileText,
    BookMarked,
    Edit,
    ArrowRight,
    Gavel,
    Mic,
    Wand2,
    Bot,
    Zap,
} from "lucide-react";
import { AttachedFilesBadge, UploadProgress } from "@/components/chat";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { trpc } from "@/lib/trpc";
import type { UploadState } from "./UploadProgress";

interface AttachedFile {
    uri: string;
    name: string;
    type?: string;
}

interface ViewingPrompt {
    id: number;
    title: string;
    content: string;
    category?: string | null;
}

interface ChatInputAreaProps {
    // Input
    messageInput: string;
    setMessageInput: (value: string) => void;
    onSendMessage: () => void;
    isProcessing: boolean;

    // Upload
    openUpload: () => void;
    uploadState: UploadState;

    // Files
    attachedFiles: AttachedFile[];
    onRemoveFile: (uri: string) => void;
    selectedProcessId?: number;
    processNumber?: string;
    onRemoveProcess: () => void;

    // Prompts Modal
    isPromptsModalOpen: boolean;
    setIsPromptsModalOpen: (open: boolean) => void;

    // Create/Edit Prompt State
    isCreatePromptOpen: boolean;
    setIsCreatePromptOpen: (open: boolean) => void;
    newPromptTitle: string;
    setNewPromptTitle: (value: string) => void;
    newPromptContent: string;
    setNewPromptContent: (value: string) => void;
    newPromptCategory: string;
    setNewPromptCategory: (value: string) => void;
    customCategory: string;
    setCustomCategory: (value: string) => void;
    editingPromptId: number | null;
    setEditingPromptId: (id: number | null) => void;
    onCreatePrompt: () => void;
    onUpdatePrompt: () => void;
    isCreatingPrompt: boolean;
    isUpdatingPrompt: boolean;

    // Viewing Prompt
    viewingPrompt: ViewingPrompt | null;
    setViewingPrompt: (prompt: ViewingPrompt | null) => void;
    onDeletePromptRequest: (promptId: number) => void;

    // Audio
    isRecording: boolean;
    onRecordClick: () => void;
    isTranscribing: boolean;
    /** Se deve mostrar botão de microfone (default: true) */
    showMicButton?: boolean;

    // Enhance
    onEnhancePrompt: () => void;
    isEnhancing: boolean;

    // Settings
    llmModel?: string | null;
}

export function ChatInputArea({
    messageInput,
    setMessageInput,
    onSendMessage,
    isProcessing,
    openUpload,
    uploadState,
    attachedFiles,
    onRemoveFile,
    selectedProcessId,
    processNumber,
    onRemoveProcess,
    isPromptsModalOpen,
    setIsPromptsModalOpen,
    isCreatePromptOpen,
    setIsCreatePromptOpen,
    newPromptTitle,
    setNewPromptTitle,
    newPromptContent,
    setNewPromptContent,
    newPromptCategory,
    setNewPromptCategory,
    customCategory,
    setCustomCategory,
    editingPromptId,
    setEditingPromptId,
    onCreatePrompt,
    onUpdatePrompt,
    isCreatingPrompt,
    isUpdatingPrompt,
    viewingPrompt,
    setViewingPrompt,
    onDeletePromptRequest,
    isRecording,
    onRecordClick,
    isTranscribing,
    showMicButton = true,
    onEnhancePrompt,
    isEnhancing,
    llmModel,
}: ChatInputAreaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Get user's active module for commands filtering
    const { data: userDefaultModule } = trpc.modules.getUserDefault.useQuery();

    // Slash command menu state
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const slashFilter = useMemo(() => {
        if (!messageInput.startsWith('/')) return '';
        // Extract everything after / to ensure specific filtering
        // This prevents the menu from showing all commands (fallback) when the regex fails due to spaces
        return messageInput.slice(1);
    }, [messageInput]);

    // Show menu when typing / at start
    useEffect(() => {
        if (messageInput.startsWith('/') && messageInput.match(/^\/[a-z0-9]*$/i)) {
            setShowSlashMenu(true);
        } else {
            setShowSlashMenu(false);
        }
    }, [messageInput]);

    // Auto-ajuste do textarea
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
        // Use currentTarget.value directly to avoid React state lag on fast typing
        const currentValue = e.currentTarget.value;
        const hasArguments = currentValue.includes(' ');

        // Calculate filter from DOM to check for lag
        const localFilter = currentValue.startsWith('/') ? currentValue.slice(1) : '';

        // If local DOM has filter text but React state filter is empty, we have a lag.
        // In this case, SlashCommandMenu (which uses state) will ignore the Enter (due to our empty check fix),
        // so we must force send here to avoid a dead click.
        const isReactLagging = localFilter.length > 0 && slashFilter.length === 0;

        // Se menu de comandos está aberto, não processar Enter aqui (SlashCommandMenu cuida)
        // EXCETO se:
        // 1. Já houver espaço (argumentos)
        // 2. React estiver com lag (filtro local tem texto mas estado está vazio)
        const shouldLetMenuHandle = showSlashMenu && !hasArguments && !isReactLagging;

        if (shouldLetMenuHandle && e.key === "Enter") {
            return; // SlashCommandMenu já tratou isso via listener global
        }
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            // CRITICAL FIX: Stop event from bubbling to document listeners (SlashCommandMenu)
            // This prevents the menu from intercepting Enter if it's still closing (race condition)
            e.nativeEvent.stopImmediatePropagation();
            onSendMessage();
        }
    };

    const handleCancelPromptEdit = () => {
        setIsCreatePromptOpen(false);
        setNewPromptTitle("");
        setNewPromptContent("");
        setNewPromptCategory("none");
        setCustomCategory("");
        setEditingPromptId(null);
    };

    const handleSavePrompt = () => {
        if (newPromptTitle.trim() && newPromptContent.trim()) {
            if (editingPromptId) {
                onUpdatePrompt();
            } else {
                onCreatePrompt();
            }
        }
    };

    const handleStartEditPrompt = () => {
        if (viewingPrompt) {
            setEditingPromptId(viewingPrompt.id);
            setNewPromptTitle(viewingPrompt.title);
            setNewPromptContent(viewingPrompt.content);
            setNewPromptCategory(viewingPrompt.category || "uncategorized");
            setViewingPrompt(null);
            setIsCreatePromptOpen(true);
        }
    };

    const handleUsePrompt = () => {
        if (viewingPrompt) {
            setMessageInput(viewingPrompt.content);
            setIsPromptsModalOpen(false);
            setViewingPrompt(null);
        }
    };

    // Mode: Creating/Editing Prompt
    if (isCreatePromptOpen) {
        return (
            <div className="border p-4 relative shadow-sm bg-gray-100 rounded-[2rem] transition-all duration-200 z-30">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={handleCancelPromptEdit}>
                        Cancelar
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2 bg-blue-900 hover:bg-blue-800 text-white"
                        onClick={handleSavePrompt}
                        disabled={
                            !newPromptTitle.trim() ||
                            !newPromptContent.trim() ||
                            (newPromptCategory === "__new__" && !customCategory.trim()) ||
                            isCreatingPrompt ||
                            isUpdatingPrompt
                        }
                    >
                        {(isCreatingPrompt || isUpdatingPrompt) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileText className="h-4 w-4" />
                        )}
                        {editingPromptId ? 'Salvar Alterações' : 'Salvar Prompt'}
                    </Button>
                </div>
            </div>
        );
    }

    // Mode: Viewing Prompt
    if (viewingPrompt) {
        return (
            <div className="border p-4 relative shadow-sm bg-white rounded-[2rem] transition-all duration-200 z-30">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setViewingPrompt(null)}>
                        Cancelar
                    </Button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onDeletePromptRequest(viewingPrompt.id)}
                            className="p-2 rounded hover:bg-destructive/10 text-destructive transition-colors"
                            title="Excluir"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                        <button
                            onClick={handleStartEditPrompt}
                            className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar"
                        >
                            <Edit className="h-5 w-5" />
                        </button>
                        <Button onClick={handleUsePrompt} className="gap-1">
                            <ArrowRight className="h-4 w-4" /> Usar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Mode: Normal Input
    return (
        <div
            className={`border p-4 relative shadow-sm bg-white rounded-[2rem] transition-all duration-200 z-30 ${isPromptsModalOpen ? 'opacity-60 pointer-events-none' : 'focus-within:ring-1 focus-within:ring-primary/50'
                }`}
        >
            {/* Badge flutuante de upload */}
            {uploadState.isUploading && (
                <div className="absolute -top-[90px] left-0 right-0 px-4 z-50 pointer-events-none">
                    <div className="bg-white rounded-xl border border-border shadow-lg p-3 max-w-md mx-auto pointer-events-auto">
                        <UploadProgress uploadState={uploadState} />
                    </div>
                </div>
            )}

            {/* Badge do Processo/Arquivo */}
            {(uploadState.isUploading || attachedFiles.length > 0 || selectedProcessId) && (
                <div className="flex-shrink-0 min-h-[80px] mb-3">
                    {uploadState.isUploading ? (
                        <UploadProgress uploadState={uploadState} />
                    ) : (
                        <AttachedFilesBadge
                            files={attachedFiles}
                            process={
                                selectedProcessId
                                    ? { id: selectedProcessId, processNumber: processNumber || 'Processo anexado' }
                                    : null
                            }
                            onRemoveFile={onRemoveFile}
                            onRemoveProcess={onRemoveProcess}
                        />
                    )}
                </div>
            )}

            <div className="flex justify-between items-start mb-2 relative">
                {/* Slash Command Menu */}
                <SlashCommandMenu
                    isOpen={showSlashMenu}
                    onSelect={(cmd) => {
                        // If command requires argument, add space for typing
                        setMessageInput(cmd + ' ');
                        setShowSlashMenu(false);
                        textareaRef.current?.focus();
                    }}
                    onClose={() => setShowSlashMenu(false)}
                    filter={slashFilter}
                    position="above"
                    moduleSlug={userDefaultModule || 'default'}
                />

                <Textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={(e) => {
                        setMessageInput(e.target.value);
                        adjustTextareaHeight();
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder="O que posso fazer por você?"
                    className="border-0 shadow-none resize-none min-h-[60px] w-full p-0 pr-[180px] focus-visible:ring-0 bg-transparent text-lg placeholder:text-muted-foreground/50"
                    style={{ maxHeight: "200px" }}
                />

                {/* Controles do Input (Modelo + Magic) */}
                <div className="absolute top-0 right-0 flex items-center gap-1">
                    {/* Indicador de Modelo */}
                    <div
                        className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-primary/5 hover:bg-primary/10 transition-colors rounded-md border border-primary/10 cursor-help select-none mr-1"
                        title={`Modelo: ${llmModel || 'Padrão'}`}
                    >
                        <Bot className="w-3.5 h-3.5 text-primary/70" />
                        <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight">
                            {llmModel?.replace(/-/g, " ").toUpperCase() || "GEMINI 2.0 FLASH"}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                        title="Melhorar Prompt (IA)"
                        onClick={onEnhancePrompt}
                        disabled={!messageInput.trim() || isEnhancing}
                    >
                        {isEnhancing ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                            <Wand2 className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-full h-9 px-4 border-dashed border-primary/30 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all font-medium"
                        onClick={openUpload}
                    >
                        <Gavel className="h-4 w-4" />
                        Enviar Processo
                    </Button>

                    <Button
                        variant={showSlashMenu ? "secondary" : "ghost"}
                        size="sm"
                        className="gap-2 rounded-full h-9 px-3"
                        onClick={() => {
                            setShowSlashMenu(!showSlashMenu);
                            textareaRef.current?.focus();
                        }}
                    >
                        <Zap className="h-4 w-4" />
                        Comandos
                    </Button>

                    <Button
                        variant={isPromptsModalOpen ? "secondary" : "ghost"}
                        size="sm"
                        className="gap-2 rounded-full h-9 px-3"
                        onClick={() => setIsPromptsModalOpen(!isPromptsModalOpen)}
                    >
                        <BookMarked className="h-4 w-4" />
                        Prompts
                    </Button>
                </div>

                <div className="flex gap-2 items-center">
                    {showMicButton && (
                        <Button
                            onClick={onRecordClick}
                            variant={isRecording ? "destructive" : "ghost"}
                            size="icon"
                            className={`h-10 w-10 rounded-full transition-all ${isRecording ? 'animate-pulse' : 'text-muted-foreground hover:text-primary hover:bg-accent'
                                }`}
                            title={isRecording ? "Parar Gravação" : "Gravar áudio"}
                            disabled={isTranscribing}
                        >
                            {isTranscribing ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Mic className={`h-5 w-5 ${isRecording ? 'fill-current' : ''}`} />
                            )}
                        </Button>
                    )}

                    <Button
                        onClick={onSendMessage}
                        disabled={!messageInput.trim() && !isProcessing}
                        size="icon"
                        className={`h-10 w-10 rounded-full transition-all duration-300 ${messageInput.trim()
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-105'
                            : 'bg-muted text-muted-foreground'
                            }`}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Send className="h-5 w-5 ml-0.5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ChatInputArea;
