/**
 * PromptsModal - Componente de Modal de Prompts
 * 
 * Extraído de David.tsx na Fase 3.3 do plano de refatoração.
 * Substitui os dois blocos duplicados (HOME centralizado e CHAT ancorado).
 * 
 * @usage
 * ```tsx
 * <PromptsModal 
 *   variant="centered"  // ou "anchored" 
 *   onSelectPrompt={(content) => setMessageInput(content)}
 *   {...promptsHookProps}
 * />
 * ```
 */

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Loader2,
    Plus,
    Trash2,
    X,
    Check,
    Edit,
    ArrowLeft,
    ArrowDown,
    ArrowRight,
    MoreVertical,
    Eye,
    CheckSquare,
    Search,
    Folder,
    FolderOpen,
    BookMarked,
    ChevronDown,
} from "lucide-react";
import type { ViewingPrompt, DeleteConfirmDialog } from "@/hooks/usePrompts";

// Tipos
interface PromptCollection {
    id: number;
    name: string;
    promptCount?: number;
}

interface PromptItem {
    id: number;
    title: string;
    content: string;
    category?: string | null;
    collectionId?: number | null;
    tags?: string[] | null;
}

interface PromptsModalProps {
    /** Variante visual: 'centered' (HOME) ou 'anchored' (CHAT) */
    variant: "centered" | "anchored";

    /** Callback quando um prompt é selecionado para usar */
    onSelectPrompt: (content: string) => void;

    // Estados do modal
    isOpen: boolean;
    onClose: () => void;

    // Estados de visualização
    isCreatePromptOpen: boolean;
    setIsCreatePromptOpen: (value: boolean) => void;
    viewingPrompt: ViewingPrompt | null;
    setViewingPrompt: (value: ViewingPrompt | null) => void;

    // Estados do form
    editingPromptId: number | null;
    setEditingPromptId: (value: number | null) => void;
    newPromptTitle: string;
    setNewPromptTitle: (value: string) => void;
    newPromptContent: string;
    setNewPromptContent: (value: string) => void;
    newPromptCategory: string;
    setNewPromptCategory: (value: string) => void;
    customCategory: string;
    setCustomCategory: (value: string) => void;

    // Estados de coleção
    isCreatingCollection: boolean;
    setIsCreatingCollection: (value: boolean) => void;
    newCollectionName: string;
    setNewCollectionName: (value: string) => void;
    currentCollectionId: number | null;
    setCurrentCollectionId: (value: number | null) => void;
    currentCollection?: PromptCollection;
    promptCollections?: PromptCollection[];

    // Estados de seleção
    isSelectMode: boolean;
    setIsSelectMode: (value: boolean) => void;
    selectedPromptIds: number[];
    setSelectedPromptIds: (value: number[]) => void;

    // Estados de confirmação
    deleteConfirmDialog: DeleteConfirmDialog;
    setDeleteConfirmDialog: (value: DeleteConfirmDialog) => void;

    // Dados filtrados
    filteredPrompts: PromptItem[];

    // Paginação
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;

    // Ações
    openCreatePrompt: () => void;
    savePrompt: () => void;
    selectAllPrompts: () => void;

    // Mutations
    createPromptMutation: { isPending: boolean };
    updatePromptMutation: {
        isPending: boolean;
        mutate: (data: { id: number; collectionId?: number | null; title?: string; content?: string; category?: string }) => void;
    };
    createCollectionMutation: {
        isPending: boolean;
        mutate: (data: { name: string }) => void;
    };

    // Estados de busca (gerenciados externamente)
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    isSearchOpen: boolean;
    setIsSearchOpen: (value: boolean) => void;
}

export function PromptsModal({
    variant,
    onSelectPrompt,
    isOpen,
    onClose,
    isCreatePromptOpen,
    setIsCreatePromptOpen,
    viewingPrompt,
    setViewingPrompt,
    editingPromptId,
    setEditingPromptId,
    newPromptTitle,
    setNewPromptTitle,
    newPromptContent,
    setNewPromptContent,
    newPromptCategory,
    setNewPromptCategory,
    customCategory,
    setCustomCategory,
    isCreatingCollection,
    setIsCreatingCollection,
    newCollectionName,
    setNewCollectionName,
    currentCollectionId,
    setCurrentCollectionId,
    currentCollection,
    promptCollections,
    isSelectMode,
    setIsSelectMode,
    selectedPromptIds,
    setSelectedPromptIds,
    deleteConfirmDialog,
    setDeleteConfirmDialog,
    filteredPrompts,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    openCreatePrompt,
    savePrompt,
    selectAllPrompts,
    createPromptMutation,
    updatePromptMutation,
    createCollectionMutation,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
}: PromptsModalProps) {

    // Handler para fechar modal e limpar estados
    const handleClose = () => {
        onClose();
        setViewingPrompt(null);
        setIsCreatePromptOpen(false);
    };

    // Handler para selecionar/usar um prompt
    const handleUsePrompt = (content: string) => {
        onSelectPrompt(content);
        handleClose();
    };

    // Renderiza o conteúdo interno do modal (compartilhado entre variantes)
    const renderContent = () => {
        if (isCreatePromptOpen) {
            return (
                /* Create/Edit Prompt View */
                <div className="flex flex-col" style={{ height: '55vh', maxHeight: '55vh' }}>
                    <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
                        <button onClick={() => setIsCreatePromptOpen(false)} className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <span className="font-medium">{editingPromptId ? 'Editar' : 'Criar'} Prompt</span>
                        <button onClick={handleClose} className="ml-auto text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-white">
                        <div className="flex items-center justify-between gap-4">
                            <input
                                type="text"
                                placeholder="Nome do Prompt"
                                value={newPromptTitle}
                                onChange={(e) => setNewPromptTitle(e.target.value)}
                                className="flex-1 text-lg font-semibold text-primary bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
                            />
                            <Select value={newPromptCategory} onValueChange={setNewPromptCategory}>
                                <SelectTrigger className="w-[160px] h-8 text-sm bg-white/60 shrink-0">
                                    <SelectValue placeholder="Sem coleção" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sem coleção</SelectItem>
                                    {promptCollections?.map((col) => (
                                        <SelectItem key={col.id} value={String(col.id)}>{col.name}</SelectItem>
                                    ))}
                                    <SelectItem value="__new__">+ Criar nova...</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {newPromptCategory === "__new__" && (
                            <Input
                                placeholder="Nome da nova coleção"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                            />
                        )}
                        <Textarea
                            placeholder="Escreva seu prompt aqui..."
                            value={newPromptContent}
                            onChange={(e) => setNewPromptContent(e.target.value)}
                            className="min-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 text-base p-0 placeholder:text-muted-foreground/40"
                        />
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 border-t bg-white">
                        <Button variant="ghost" onClick={() => setIsCreatePromptOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={savePrompt}
                            disabled={!newPromptTitle.trim() || !newPromptContent.trim() || createPromptMutation.isPending || updatePromptMutation.isPending}
                        >
                            {(createPromptMutation.isPending || updatePromptMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editingPromptId ? 'Salvar' : 'Criar'}
                        </Button>
                    </div>
                </div>
            );
        }

        if (viewingPrompt) {
            return (
                /* View Prompt */
                <div className="flex flex-col" style={{ height: '55vh', maxHeight: '55vh' }}>
                    <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
                        <button onClick={() => setViewingPrompt(null)} className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <span className="font-medium">Visualizar Prompt</span>
                        <button onClick={handleClose} className="ml-auto text-muted-foreground hover:text-foreground">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto bg-white">
                        <h2 className="text-xl font-bold mb-4">{viewingPrompt.title}</h2>
                        <p className="text-muted-foreground whitespace-pre-wrap">{viewingPrompt.content}</p>
                    </div>
                    <div className="flex justify-between items-center px-4 py-3 border-t bg-white">
                        <Button variant="ghost" onClick={() => setViewingPrompt(null)}>Voltar</Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditingPromptId(viewingPrompt.id);
                                    setNewPromptTitle(viewingPrompt.title);
                                    setNewPromptContent(viewingPrompt.content);
                                    setNewPromptCategory(viewingPrompt.category || "none");
                                    setViewingPrompt(null);
                                    setIsCreatePromptOpen(true);
                                }}
                            >
                                <Edit className="h-4 w-4 mr-2" /> Editar
                            </Button>
                            <Button onClick={() => handleUsePrompt(viewingPrompt.content)}>
                                <ArrowRight className="h-4 w-4 mr-2" /> Usar
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        // Lista de prompts
        return (
            <div className="flex flex-col" style={{ height: '55vh', maxHeight: '55vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                    {isSelectMode ? (
                        /* Modo de seleção múltipla */
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{selectedPromptIds.length} selecionado(s)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={selectAllPrompts}>
                                    {selectedPromptIds.length === filteredPrompts.length ? "Desmarcar todos" : "Selecionar todos"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setDeleteConfirmDialog({ isOpen: true, promptIds: selectedPromptIds })}
                                    disabled={selectedPromptIds.length === 0}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setIsSelectMode(false); setSelectedPromptIds([]); }}>
                                    Cancelar
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 flex-1">
                                <span className="font-semibold">Prompts</span>
                                {isSearchOpen ? (
                                    <div className="flex items-center gap-1 relative animate-in fade-in slide-in-from-left-2">
                                        <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            autoFocus
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8 pr-7 h-9 w-[320px] text-sm"
                                            placeholder="Buscar..."
                                        />
                                        <Button variant="ghost" size="icon" className="absolute right-0 top-0.5 h-7 w-7" onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                        <Search className="h-4 w-4 stroke-[2.5]" />
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Dropdown de Coleções */}
                                <Popover modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button size="sm" className="gap-2 bg-blue-900 hover:bg-blue-800 text-white">
                                            {currentCollection?.name || "Coleções"}
                                            <ChevronDown className="h-3 w-3 opacity-80" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[220px] p-0 z-[200]" align="end">
                                        <Command>
                                            <CommandInput placeholder="Buscar coleção..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhuma coleção encontrada.</CommandEmpty>
                                                <CommandGroup heading="Minhas Coleções">
                                                    <CommandItem
                                                        onSelect={() => setCurrentCollectionId(null)}
                                                        className="hover:bg-slate-100 data-[selected]:bg-blue-100"
                                                    >
                                                        <Folder className="mr-2 h-4 w-4 text-gray-400" />
                                                        <span className="flex-1 truncate">Todos os Prompts</span>
                                                    </CommandItem>
                                                    {promptCollections?.map((col) => (
                                                        <CommandItem
                                                            key={col.id}
                                                            onSelect={() => setCurrentCollectionId(col.id)}
                                                            className="hover:bg-slate-100 data-[selected]:bg-blue-100"
                                                        >
                                                            <Folder className="mr-2 h-4 w-4 text-blue-600" />
                                                            <span className="flex-1 truncate">{col.name}</span>
                                                            <span className="text-xs text-slate-500 ml-2">{col.promptCount}</span>
                                                        </CommandItem>
                                                    ))}
                                                    {(!promptCollections || promptCollections.length === 0) && (
                                                        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                                                            Nenhuma coleção criada
                                                        </div>
                                                    )}
                                                </CommandGroup>
                                                <CommandSeparator />
                                                <CommandGroup>
                                                    {isCreatingCollection ? (
                                                        <div className="px-2 py-1.5">
                                                            <Input
                                                                placeholder="Nome da coleção..."
                                                                value={newCollectionName}
                                                                onChange={(e) => setNewCollectionName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && newCollectionName.trim()) {
                                                                        createCollectionMutation.mutate({ name: newCollectionName.trim() });
                                                                    } else if (e.key === 'Escape') {
                                                                        setNewCollectionName("");
                                                                        setIsCreatingCollection(false);
                                                                    }
                                                                }}
                                                                className="h-8 text-sm"
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-1 mt-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 text-xs flex-1"
                                                                    onClick={() => { setNewCollectionName(""); setIsCreatingCollection(false); }}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-7 text-xs flex-1 bg-blue-900 hover:bg-blue-800 text-white"
                                                                    disabled={!newCollectionName.trim() || createCollectionMutation.isPending}
                                                                    onClick={() => {
                                                                        if (newCollectionName.trim()) {
                                                                            createCollectionMutation.mutate({ name: newCollectionName.trim() });
                                                                        }
                                                                    }}
                                                                >
                                                                    {createCollectionMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Criar"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <CommandItem
                                                            onSelect={() => setIsCreatingCollection(true)}
                                                            className="text-blue-900 hover:bg-blue-50"
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Nova Coleção
                                                        </CommandItem>
                                                    )}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                <Button size="sm" onClick={openCreatePrompt} className="gap-1 bg-blue-900 hover:bg-blue-800 text-white">
                                    <Plus className="h-4 w-4" />
                                    Prompt
                                </Button>
                                <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Navegação de pasta (quando dentro de uma coleção) */}
                {currentCollectionId !== null && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setCurrentCollectionId(null)}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Folder className="h-4 w-4 text-blue-600" />
                            {currentCollection?.name}
                            <span className="text-muted-foreground">({filteredPrompts.length})</span>
                        </div>
                    </div>
                )}

                {/* Grid de Prompts */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                    {filteredPrompts && filteredPrompts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                            {filteredPrompts.map((prompt) => (
                                <div
                                    key={prompt.id}
                                    className={`p-4 rounded-xl border shadow-sm transition-all cursor-pointer group relative ${isSelectMode
                                        ? selectedPromptIds.includes(prompt.id) ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-white hover:bg-muted/50'
                                        : 'bg-white hover:shadow-md'
                                        }`}
                                    onClick={() => {
                                        if (isSelectMode) {
                                            if (selectedPromptIds.includes(prompt.id)) {
                                                setSelectedPromptIds(selectedPromptIds.filter((id) => id !== prompt.id));
                                            } else {
                                                setSelectedPromptIds([...selectedPromptIds, prompt.id]);
                                            }
                                        }
                                    }}
                                >
                                    <div className="flex gap-3">
                                        {isSelectMode && (
                                            <div className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors ${selectedPromptIds.includes(prompt.id) ? 'bg-primary border-primary' : 'border-muted-foreground bg-white'}`}>
                                                {selectedPromptIds.includes(prompt.id) && <Check className="h-3.5 w-3.5 text-white" />}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-semibold text-sm text-foreground flex-1 pr-2 truncate">{prompt.title}</h3>
                                                {!isSelectMode && (
                                                    <div className="flex items-center gap-1">
                                                        {/* Menu de opções - aparece só no hover */}
                                                        <DropdownMenu modal={true}>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all" onClick={(e) => e.stopPropagation()}>
                                                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="z-[200]">
                                                                <DropdownMenuItem onSelect={() => { setViewingPrompt({ id: prompt.id, title: prompt.title, content: prompt.content, category: prompt.category, tags: prompt.tags as string[] | undefined }); }}>
                                                                    <Eye className="h-4 w-4 mr-2" /> Visualizar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => { setEditingPromptId(prompt.id); setNewPromptTitle(prompt.title); setNewPromptContent(prompt.content); setNewPromptCategory(prompt.category || "none"); setIsCreatePromptOpen(true); }}>
                                                                    <Edit className="h-4 w-4 mr-2" /> Editar
                                                                </DropdownMenuItem>

                                                                <DropdownMenuSub>
                                                                    <DropdownMenuSubTrigger>
                                                                        <div className="flex items-center">
                                                                            <FolderOpen className="mr-2 h-4 w-4" /> Mover para
                                                                        </div>
                                                                    </DropdownMenuSubTrigger>
                                                                    <DropdownMenuSubContent className="z-[200]">
                                                                        {/* Só mostra "Retirar da coleção" se o prompt está em uma coleção */}
                                                                        {prompt.collectionId && (
                                                                            <>
                                                                                <DropdownMenuItem onSelect={() => { updatePromptMutation.mutate({ id: prompt.id, collectionId: null }); }}>
                                                                                    <X className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                                    Retirar da coleção
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                            </>
                                                                        )}
                                                                        {promptCollections?.filter(col => col.id !== prompt.collectionId).map((col) => (
                                                                            <DropdownMenuItem key={col.id} onSelect={() => { updatePromptMutation.mutate({ id: prompt.id, collectionId: col.id }); }}>
                                                                                <Folder className="h-4 w-4 mr-2 text-blue-600" />
                                                                                {col.name}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuSubContent>
                                                                </DropdownMenuSub>

                                                                <DropdownMenuItem onSelect={() => { setIsSelectMode(true); setSelectedPromptIds([prompt.id]); }}>
                                                                    <CheckSquare className="h-4 w-4 mr-2" /> Selecionar vários
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onSelect={() => { setDeleteConfirmDialog({ isOpen: true, promptId: prompt.id }); }} className="text-destructive">
                                                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        {/* Botão Usar - amarelo */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUsePrompt(prompt.content); }}
                                                            className="flex items-center gap-1 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors"
                                                        >
                                                            Usar <ArrowDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{prompt.content}</p>
                                            {prompt.tags && Array.isArray(prompt.tags) && prompt.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {(prompt.tags as string[]).map((tag: string) => (
                                                        <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <BookMarked className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-primary font-medium">Nenhum prompt encontrado</p>
                            <Button variant="link" onClick={openCreatePrompt} className="mt-2">
                                <Plus className="h-4 w-4 mr-1" /> Criar primeiro prompt
                            </Button>
                        </div>
                    )}
                    {hasNextPage && (
                        <div className="p-4 pt-0">
                            <Button variant="ghost" className="w-full text-xs" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar mais"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Variante centralizada (HOME)
    if (variant === "centered") {
        return (
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20"
                    >
                        <div className="border rounded-2xl bg-gray-100 shadow-xl overflow-hidden w-full max-w-4xl">
                            {renderContent()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Variante ancorada (CHAT)
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-0 right-0 overflow-hidden z-10 mb-[-3rem]"
                >
                    <div className="border border-b-0 rounded-t-2xl bg-gray-100 shadow-xl overflow-hidden pb-16">
                        {renderContent()}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default PromptsModal;
