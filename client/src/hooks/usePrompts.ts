/**
 * usePrompts - Hook para gerenciar prompts salvos
 * 
 * Extraído de David.tsx na Fase 3 do plano de refatoração.
 * Centraliza toda a lógica de prompts, coleções e CRUD.
 */

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Tipos
export interface ViewingPrompt {
    id: number;
    title: string;
    content: string;
    category?: string | null;
    tags?: string[];
}

export interface DeleteConfirmDialog {
    isOpen: boolean;
    promptId?: number;
    promptIds?: number[];
}

interface UsePromptsOptions {
    /** Query de busca */
    searchQuery?: string;
    /** Categoria selecionada */
    selectedCategory?: string | null;
}

export function usePrompts(options: UsePromptsOptions = {}) {
    const { searchQuery = '', selectedCategory = null } = options;

    // === ESTADOS DO MODAL ===
    const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);
    const [isCreatePromptOpen, setIsCreatePromptOpen] = useState(false);
    const [viewingPrompt, setViewingPrompt] = useState<ViewingPrompt | null>(null);

    // === ESTADOS DO FORM ===
    const [editingPromptId, setEditingPromptId] = useState<number | null>(null);
    const [newPromptTitle, setNewPromptTitle] = useState("");
    const [newPromptContent, setNewPromptContent] = useState("");
    const [newPromptCategory, setNewPromptCategory] = useState<string>("none");
    const [customCategory, setCustomCategory] = useState("");

    // === ESTADOS DE COLEÇÃO ===
    const [isCreatingCollection, setIsCreatingCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [currentCollectionId, setCurrentCollectionId] = useState<number | null>(null);

    // === ESTADOS DE SELEÇÃO ===
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedPromptIds, setSelectedPromptIds] = useState<number[]>([]);

    // === ESTADO DE CONFIRMAÇÃO ===
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<DeleteConfirmDialog>({ isOpen: false });

    // === QUERIES ===
    const {
        data: savedPromptsData,
        refetch: refetchPrompts,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingPrompts
    } = trpc.david.savedPrompts.listPaginated.useInfiniteQuery(
        {
            limit: 20,
            search: searchQuery,
            category: selectedCategory === "uncategorized" ? null : (selectedCategory || undefined),
        },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    const savedPrompts = useMemo(() => {
        return savedPromptsData?.pages.flatMap((page) => page.items) || [];
    }, [savedPromptsData]);

    const { data: promptCollections, refetch: refetchCollections } = trpc.david.promptCollections.list.useQuery();

    const currentCollection = promptCollections?.find(c => c.id === currentCollectionId);

    // Filtrar prompts pela coleção atual
    const filteredPrompts = useMemo(() => {
        if (!savedPrompts) return [];

        if (currentCollectionId === null) {
            return savedPrompts.filter((p) => p.collectionId === null || p.collectionId === undefined);
        } else {
            return savedPrompts.filter((p) => p.collectionId === currentCollectionId);
        }
    }, [savedPrompts, currentCollectionId]);

    // === MUTATIONS ===
    const createPromptMutation = trpc.david.savedPrompts.create.useMutation({
        onSuccess: () => {
            refetchPrompts();
            refetchCollections();
            closeCreatePrompt();
            toast.success("Prompt criado com sucesso!");
        },
        onError: () => {
            toast.error("Erro ao criar prompt");
        },
    });

    const updatePromptMutation = trpc.david.savedPrompts.update.useMutation({
        onSuccess: () => {
            refetchPrompts();
            refetchCollections();
            closeCreatePrompt();
            toast.success("Prompt atualizado!");
        },
        onError: () => {
            toast.error("Erro ao atualizar prompt");
        },
    });

    const deletePromptMutation = trpc.david.savedPrompts.delete.useMutation({
        onSuccess: () => {
            refetchPrompts();
            setViewingPrompt(null);
            toast.success("Prompt excluído com sucesso!");
        },
        onError: () => {
            toast.error("Erro ao excluir prompt");
        },
    });

    const createCollectionMutation = trpc.david.promptCollections.create.useMutation({
        onSuccess: (data) => {
            refetchCollections();
            setCurrentCollectionId(data.id);
            setNewCollectionName("");
            setIsCreatingCollection(false);
            toast.success("Coleção criada!");
        },
        onError: () => {
            toast.error("Erro ao criar coleção");
        },
    });

    // NOTA: moveToCollection mutation não disponível ainda na API,

    // === AÇÕES ===
    const openModal = useCallback(() => setIsPromptsModalOpen(true), []);
    const closeModal = useCallback(() => {
        setIsPromptsModalOpen(false);
        setViewingPrompt(null);
        setIsCreatePromptOpen(false);
    }, []);
    const toggleModal = useCallback(() => setIsPromptsModalOpen(prev => !prev), []);

    const openCreatePrompt = useCallback(() => {
        setEditingPromptId(null);
        setNewPromptTitle("");
        setNewPromptContent("");
        setNewPromptCategory("none");
        setCustomCategory("");
        setIsCreatePromptOpen(true);
    }, []);

    const closeCreatePrompt = useCallback(() => {
        setIsCreatePromptOpen(false);
        setNewPromptTitle("");
        setNewPromptContent("");
        setNewPromptCategory("none");
        setCustomCategory("");
        setEditingPromptId(null);
    }, []);

    const openEditPrompt = useCallback((prompt: ViewingPrompt) => {
        setEditingPromptId(prompt.id);
        setNewPromptTitle(prompt.title);
        setNewPromptContent(prompt.content);
        setNewPromptCategory(prompt.category || "none");
        setViewingPrompt(null);
        setIsCreatePromptOpen(true);
    }, []);

    const savePrompt = useCallback(() => {
        let finalCategory: string | undefined = undefined;
        if (newPromptCategory === "__new__") {
            finalCategory = customCategory.trim() || undefined;
        } else if (newPromptCategory !== "none") {
            finalCategory = newPromptCategory;
        }

        if (newPromptTitle.trim() && newPromptContent.trim()) {
            if (editingPromptId) {
                updatePromptMutation.mutate({
                    id: editingPromptId,
                    title: newPromptTitle.trim(),
                    content: newPromptContent.trim(),
                    category: finalCategory,
                });
            } else {
                createPromptMutation.mutate({
                    title: newPromptTitle.trim(),
                    content: newPromptContent.trim(),
                    category: finalCategory,
                });
            }
        }
    }, [newPromptTitle, newPromptContent, newPromptCategory, customCategory, editingPromptId, createPromptMutation, updatePromptMutation]);

    const confirmDelete = useCallback(() => {
        if (deleteConfirmDialog.promptId) {
            deletePromptMutation.mutate({ id: deleteConfirmDialog.promptId });
        } else if (deleteConfirmDialog.promptIds && deleteConfirmDialog.promptIds.length > 0) {
            // Deletar múltiplos
            deleteConfirmDialog.promptIds.forEach(id => {
                deletePromptMutation.mutate({ id });
            });
        }
        setDeleteConfirmDialog({ isOpen: false });
        setSelectedPromptIds([]);
        setIsSelectMode(false);
    }, [deleteConfirmDialog, deletePromptMutation]);

    const togglePromptSelection = useCallback((promptId: number) => {
        setSelectedPromptIds(prev =>
            prev.includes(promptId)
                ? prev.filter(id => id !== promptId)
                : [...prev, promptId]
        );
    }, []);

    const selectAllPrompts = useCallback(() => {
        if (savedPrompts && selectedPromptIds.length === savedPrompts.length) {
            setSelectedPromptIds([]);
        } else if (savedPrompts) {
            setSelectedPromptIds(savedPrompts.map(p => p.id));
        }
    }, [savedPrompts, selectedPromptIds.length]);

    const clearSelection = useCallback(() => {
        setSelectedPromptIds([]);
        setIsSelectMode(false);
    }, []);

    const createCollection = useCallback(() => {
        if (newCollectionName.trim()) {
            createCollectionMutation.mutate({ name: newCollectionName.trim() });
        }
    }, [newCollectionName, createCollectionMutation]);

    // Validação do form
    const isFormValid = newPromptTitle.trim() && newPromptContent.trim() &&
        !(newPromptCategory === "__new__" && !customCategory.trim());

    const isSaving = createPromptMutation.isPending || updatePromptMutation.isPending;

    return {
        // Estados do modal
        isPromptsModalOpen,
        isCreatePromptOpen,
        viewingPrompt,
        setViewingPrompt,

        // Estados do form
        editingPromptId,
        newPromptTitle,
        setNewPromptTitle,
        newPromptContent,
        setNewPromptContent,
        newPromptCategory,
        setNewPromptCategory,
        customCategory,
        setCustomCategory,
        isFormValid,
        isSaving,

        // Estados de coleção
        isCreatingCollection,
        setIsCreatingCollection,
        newCollectionName,
        setNewCollectionName,
        currentCollectionId,
        setCurrentCollectionId,
        currentCollection,

        // Estados de seleção
        isSelectMode,
        setIsSelectMode,
        selectedPromptIds,
        setSelectedPromptIds,

        // Estados de confirmação
        deleteConfirmDialog,
        setDeleteConfirmDialog,

        // Dados
        savedPrompts,
        filteredPrompts,
        promptCollections,
        isLoadingPrompts,
        hasNextPage,
        isFetchingNextPage,

        // Ações do modal
        openModal,
        closeModal,
        toggleModal,

        // Ações de CRUD
        openCreatePrompt,
        closeCreatePrompt,
        openEditPrompt,
        savePrompt,
        confirmDelete,

        // Ações de seleção
        togglePromptSelection,
        selectAllPrompts,
        clearSelection,

        // Ações de coleção
        createCollection,

        // Paginação
        fetchNextPage,
        refetchPrompts,
        refetchCollections,

        // Mutations expostas
        deletePromptMutation,
        createPromptMutation,
        updatePromptMutation,
        createCollectionMutation,
    };
}
