import { useState, useRef, useEffect, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import { useDropzone } from "react-dropzone";
import { processFile } from "@/lib/pdfProcessor";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Adicionado Input
import { Badge } from "@/components/ui/badge"; // Adicionado Badge
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Plus, Trash2, FileText, Settings, BookMarked, X, Check, Edit, XCircle, ArrowLeft, ArrowDown, ArrowRight, Pencil, Upload, MessageSquare, ChevronRight, ChevronDown, Pin, PinOff, Gavel, Brain, Mic, Wand2, MoreVertical, Eye, CheckSquare, Search, Folder, FolderOpen, Bot } from "lucide-react";




import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
import { ToolsMenu } from "@/components/ToolsMenu";
import DashboardLayout from "@/components/DashboardLayout";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { APP_LOGO } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

export default function David() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  // Estado para ID da conversa da URL - precisa reagir a mudanças na query string
  // O location do wouter não inclui query string, então usamos estado + event listeners
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const cParam = params.get("c");
    return cParam ? parseInt(cParam, 10) : null;
  });

  const [selectedProcessId, setSelectedProcessId] = useState<number | undefined>();
  const [messageInput, setMessageInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null); // Mensagem otimista do usuário
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousConversationIdRef = useRef<number | null>(null);

  // Ref para rastrear o último ID da URL (evita problemas de closure)
  const lastUrlIdRef = useRef<number | null>(selectedConversationId);

  // Sincronizar selectedConversationId com URL quando muda
  useEffect(() => {
    const updateFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const cParam = params.get("c");
      const newId = cParam ? parseInt(cParam, 10) : null;

      // Comparar com ref para evitar problemas de closure
      if (newId !== lastUrlIdRef.current) {
        console.log("[David.tsx] URL changed:", lastUrlIdRef.current, "->", newId);
        const wasFromHome = lastUrlIdRef.current === null;
        lastUrlIdRef.current = newId;
        setSelectedConversationId(newId);
        // Limpar mensagem pendente e estados de streaming ao mudar de conversa
        // MAS não limpar se estamos vindo da Home (onde criamos a conversa com mensagem)
        if (!wasFromHome || newId === null) {
          setPendingUserMessage(null);
          setStreamingMessage("");
          setIsStreaming(false);
        }
      }
    };

    // Escutar popstate (navegação via botões voltar/avançar)
    window.addEventListener('popstate', updateFromUrl);

    // Poll interval para detectar mudanças via setLocation do wouter
    const interval = setInterval(updateFromUrl, 100);

    // Atualizar imediatamente
    updateFromUrl();

    return () => {
      window.removeEventListener('popstate', updateFromUrl);
      clearInterval(interval);
    };
  }, []); // Sem dependências - usa refs internamente

  // Estados para seleção múltipla
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set());

  // Estados para edição de minuta
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editedDraft, setEditedDraft] = useState("");
  const [draftType, setDraftType] = useState<"sentenca" | "decisao" | "despacho" | "acordao" | "outro">("decisao");

  // Estados para gerenciar conversas
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState<number | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isProcessing = isStreaming;

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<number | null>(null);

  // Estados para funcionalidades do menu de ferramentas
  const [isProcessSelectorOpen, setIsProcessSelectorOpen] = useState(false);
  const [isProcessDataOpen, setIsProcessDataOpen] = useState(false);
  const [isUploadDocsOpen, setIsUploadDocsOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isPromptSelectorOpen, setIsPromptSelectorOpen] = useState(false);

  // Estado para diálogo de processo duplicado
  const [duplicateProcessDialog, setDuplicateProcessDialog] = useState<{
    isOpen: boolean;
    processNumber: string | null;
    existingConversations: { id: number; title: string }[];
  }>({ isOpen: false, processNumber: null, existingConversations: [] });

  // Estados de busca e filtros dos prompts
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // null = Todas, "uncategorized" = Geral (sem pasta), string = Nome da pasta

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Carregar prompts salvos (Infinite Scroll)
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

  // Flatten pages
  const savedPrompts = useMemo(() => {
    return savedPromptsData?.pages.flatMap((page) => page.items) || [];
  }, [savedPromptsData]);

  // Estados para modal de prompts
  const [isPromptsModalOpen, setIsPromptsModalOpen] = useState(false);
  const [isCreatePromptOpen, setIsCreatePromptOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null); // null = creating, number = editing
  const [viewingPrompt, setViewingPrompt] = useState<{ id: number; title: string; content: string; category?: string | null; tags?: string[] } | null>(null);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [newPromptCategory, setNewPromptCategory] = useState<string>("none");
  const [customCategory, setCustomCategory] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  // Estados para seleção múltipla
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPromptIds, setSelectedPromptIds] = useState<number[]>([]);

  // Estado para dialog de confirmação de exclusão
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ isOpen: boolean; promptId?: number; promptIds?: number[] }>({ isOpen: false });

  // Mutation para criar prompt
  const createPromptMutation = trpc.david.savedPrompts.create.useMutation({
    onSuccess: () => {
      refetchPrompts();
      refetchCollections();
      setIsCreatePromptOpen(false);
      setNewPromptTitle("");
      setNewPromptContent("");
      setNewPromptCategory("none");
      setCustomCategory("");
      refetchCollections(); // Atualiza coleções caso prompt criado com nova coleção
      toast.success("Prompt criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar prompt");
    },
  });

  // Mutation para criar coleção
  const createCollectionMutation = trpc.david.promptCollections.create.useMutation({
    onSuccess: (data) => {
      refetchCollections();
      setCurrentCollectionId(data.id); // Navega para a nova coleção
      setNewCollectionName("");
      setIsCreatingCollection(false);
      toast.success("Coleção criada!");
    },
    onError: () => {
      toast.error("Erro ao criar coleção");
    },
  });

  // Mutation para excluir prompt
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

  // Mutation para atualizar prompt
  const updatePromptMutation = trpc.david.savedPrompts.update.useMutation({
    onSuccess: () => {
      refetchPrompts();
      refetchCollections();
      setIsCreatePromptOpen(false);
      setNewPromptTitle("");
      setNewPromptContent("");
      setNewPromptCategory("none");
      setCustomCategory("");
      setEditingPromptId(null);
      toast.success("Prompt atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar prompt");
    },
  });



  // Mutation para upload de documentos
  const uploadDocMutation = trpc.processDocuments.upload.useMutation();

  // Queries
  const { data: conversations, refetch: refetchConversations } = trpc.david.listConversations.useQuery();
  const { data: processes } = trpc.processes.list.useQuery();
  const { data: conversationData, refetch: refetchMessages } = trpc.david.getConversation.useQuery(
    { id: selectedConversationId! },
    {
      enabled: !!selectedConversationId,
      staleTime: 1000, // Considera dados frescos por 1s (evita refetch desnecessário)
      refetchOnWindowFocus: false, // Não refetch ao focar janela
    }
  );

  // Sincronizar selectedProcessId com a conversa carregada
  useEffect(() => {
    if (conversationData?.conversation?.processId) {
      setSelectedProcessId(conversationData.conversation.processId);
    } else if (conversationData?.conversation && !conversationData.conversation.processId) {
      setSelectedProcessId(undefined);
    }
  }, [conversationData]);

  // Forçar refetch quando conversa muda (garante que dados sejam carregados)
  useEffect(() => {
    if (selectedConversationId) {
      refetchMessages();
    }
  }, [selectedConversationId, refetchMessages]);

  // Coleções de prompts
  const { data: promptCollections, refetch: refetchCollections } = trpc.david.promptCollections.list.useQuery();

  // Estado de navegação de coleções
  const [currentCollectionId, setCurrentCollectionId] = useState<number | null>(null);
  const currentCollection = promptCollections?.find(c => c.id === currentCollectionId);

  // Filtrar prompts: raiz (null) = sem coleção, ou prompts da coleção selecionada
  const filteredPrompts = useMemo(() => {
    if (!savedPrompts) return [];

    if (currentCollectionId === null) {
      // Raiz: mostrar apenas prompts SEM coleção
      return savedPrompts.filter((p: any) => p.collectionId === null || p.collectionId === undefined);
    } else {
      // Dentro de uma coleção: mostrar apenas prompts DESSA coleção
      return savedPrompts.filter((p: any) => p.collectionId === currentCollectionId);
    }
  }, [savedPrompts, currentCollectionId]);


  // Mutations
  const createConversationMutation = trpc.david.createConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.id);
      refetchConversations();
    },
  });

  const utils = trpc.useUtils();

  const updateProcessMutation = trpc.david.updateConversationProcess.useMutation({
    onSuccess: () => {
      refetchMessages();
      toast.success("Processo vinculado à conversa");
      // Título será definido manualmente com número do processo nos locais de chamada
      if (selectedConversationId) {
        // generateTitleMutation removido para usar número do processo
      }
    },
    onError: (error) => {
      toast.error("Erro ao vincular processo: " + error.message);
    },
  });

  // Mutation para gerar título automático da conversa
  const generateTitleMutation = trpc.david.generateTitle.useMutation({
    onSuccess: () => {
      refetchConversations(); // Atualiza lista de conversas na sidebar
    },
  });

  // Mutation para limpar arquivo Google ao sair da conversa
  const cleanupGoogleFileMutation = trpc.david.cleanupGoogleFile.useMutation({
    onSuccess: () => {
      console.log("[Cleanup] Arquivo Google limpo com sucesso");
    },
    onError: (error) => {
      console.error("[Cleanup] Erro ao limpar arquivo:", error.message);
    },
  });

  // Query para obter configurações do usuário (modelo LLM)
  const settings = trpc.settings.get.useQuery();

  const cleanupIfEmptyMutation = trpc.david.cleanupIfEmpty.useMutation({
    onSuccess: (data) => {
      if (data.deleted) {
        console.log("Conversa vazia deletada automaticamente ao sair");
        refetchConversations();
      }
    },
  });

  // Estado de progresso do upload
  const [uploadState, setUploadState] = useState<{
    isUploading: boolean;
    stage: 'sending' | 'reading' | 'extracting' | 'done' | null;
    fileName: string | null;
    error: string | null;
  }>({ isUploading: false, stage: null, fileName: null, error: null });

  // Mutation nova para cadastro silencioso
  const registerFromUploadMutation = trpc.processes.registerFromUpload.useMutation({
    onSuccess: async (data) => {
      // Atualiza estado de upload
      setUploadState(prev => ({ ...prev, stage: 'done' }));

      // Verificar se o processo já existe em outra conversa
      try {
        const duplicateCheck = await utils.david.checkDuplicateProcess.fetch({
          processNumber: data.processNumber,
          excludeConversationId: selectedConversationId ?? undefined,
        });

        if (duplicateCheck.isDuplicate && duplicateCheck.existingConversations.length > 0) {
          // Mostra diálogo de duplicata
          setDuplicateProcessDialog({
            isOpen: true,
            processNumber: data.processNumber,
            existingConversations: duplicateCheck.existingConversations,
          });
          // Não vincula automaticamente - espera decisão do usuário
          setSelectedProcessId(data.processId);
          setTimeout(() => {
            setUploadState({ isUploading: false, stage: null, fileName: null, error: null });
          }, 1000);
          return;
        }
      } catch (e) {
        console.error("[Duplicate Check] Erro:", e);
      }

      // Se não há duplicata, procede normalmente
      if (selectedConversationId && data.processId) {
        updateProcessMutation.mutate({
          conversationId: selectedConversationId,
          processId: data.processId,
        });

        // Atualizar título da conversa com o número do processo
        renameConversationMutation.mutate({
          conversationId: selectedConversationId,
          title: data.processNumber,
        });
      }
      setSelectedProcessId(data.processId);

      // Mostra sucesso
      toast.success(`📂 Processo ${data.processNumber} identificado!`);

      // Limpa estado após 2 segundos
      setTimeout(() => {
        setUploadState({ isUploading: false, stage: null, fileName: null, error: null });
      }, 2000);
    },
    onError: (error) => {
      setUploadState(prev => ({ ...prev, isUploading: false, error: error.message }));
      toast.error("Erro ao processar arquivo: " + error.message);
    }
  });

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Inicia estado de loading
    setUploadState({
      isUploading: true,
      stage: 'sending',
      fileName: file.name,
      error: null,
    });

    try {
      // Stage 1: Enviando arquivo
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      // Stage 2: Lendo documento
      setUploadState(prev => ({ ...prev, stage: 'reading' }));

      // Stage 3: Extraindo metadados
      setUploadState(prev => ({ ...prev, stage: 'extracting' }));

      await registerFromUploadMutation.mutateAsync({
        text: "", // Força extração no servidor via File API
        images: [],
        filename: file.name,
        fileData: base64,
        fileType: extension
      });

    } catch (error: any) {
      setUploadState({
        isUploading: false,
        stage: null,
        fileName: null,
        error: error.message,
      });
      toast.error("Erro no upload: " + error.message);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    noClick: true, // Importante: desabilita o click no elemento raiz (div do chat), permitindo apenas no botão explícito ou drag
    noKeyboard: true
  });

  const approveDraftMutation = trpc.david.approvedDrafts.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Minuta aprovada e salva para aprendizado!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar minuta: " + error.message);
    },
  });

  const applyPromptMutation = trpc.david.savedPrompts.applyToConversation.useMutation({
    onSuccess: () => {
      refetchMessages();
      toast.success("📝 Prompt aplicado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao aplicar prompt: " + error.message);
    },
  });

  // Effect para cleanup ao trocar de conversa
  useEffect(() => {
    // Se trocou de conversa e tinha uma anterior com processo vinculado
    if (
      previousConversationIdRef.current !== null &&
      previousConversationIdRef.current !== selectedConversationId
    ) {
      // Faz cleanup da conversa anterior
      cleanupGoogleFileMutation.mutate({
        conversationId: previousConversationIdRef.current
      });
      cleanupIfEmptyMutation.mutate({
        conversationId: previousConversationIdRef.current
      });
    }
    // Atualiza referência
    previousConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Effect para cleanup ao desmontar componente (navegação para outra rota)
  useEffect(() => {
    return () => {
      if (previousConversationIdRef.current) {
        cleanupIfEmptyMutation.mutate({
          conversationId: previousConversationIdRef.current
        });
      }
    };
  }, []);

  // Effect para cleanup ao fechar o navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedConversationId) {
        // Usa sendBeacon para garantir que a requisição seja enviada
        // mesmo com o navegador fechando
        const data = JSON.stringify({ conversationId: selectedConversationId });
        navigator.sendBeacon('/api/david/cleanup', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedConversationId]);

  // Função para fazer streaming
  const streamMessage = async (conversationId: number, content: string) => {
    setIsStreaming(true);
    setStreamingMessage("");

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
        } catch (e) {
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
              // Apenas começar a acumular o streaming, NÃO limpar pendingUserMessage ainda
              // A pendingUserMessage será limpa quando o streaming terminar (done)
              setStreamingMessage((prev) => prev + data.content);
            } else if (data.type === "thinking") {
              setThinkingMessage((prev) => prev + data.content);
            } else if (data.type === "done") {
              // IMPORTANTE: Primeiro buscar mensagens, DEPOIS limpar streaming
              // Isso evita o "flash" onde não há mensagem visível
              await refetchMessages();
              await refetchMessages();
              setIsStreaming(false);
              setStreamingMessage("");
              setThinkingMessage("");
              setPendingUserMessage(null);
              // Gerar título automático após primeira resposta (se título é genérico)
              const currentTitle = conversationData?.conversation?.title?.trim();
              if (conversationId && (!currentTitle || currentTitle.toLowerCase() === "nova conversa")) {
                generateTitleMutation.mutate({ conversationId });
              }
            } else if (data.type === "error") {
              toast.error("Erro ao gerar resposta");
              setIsStreaming(false);
              setStreamingMessage("");
            }
          } catch (e) {
            console.error("Failed to parse SSE:", e);
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        // Stream foi cancelado pelo usuário
        toast.info("Geração interrompida");
      } else {
        toast.error("Erro ao enviar mensagem");
      }
      setIsStreaming(false);
      setStreamingMessage("");
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Funções de aprovação de minuta
  const handleApproveDraft = async (messageId: number, content: string, status: "approved" | "rejected") => {
    if (!selectedConversationId) return;

    try {
      await approveDraftMutation.mutateAsync({
        processId: selectedProcessId,
        conversationId: selectedConversationId,
        messageId,
        originalDraft: content,
        draftType,
        approvalStatus: status,
      });
    } catch (error) {
      console.error("Erro ao aprovar minuta:", error);
    }
  };

  const handleEditAndApprove = (messageId: number, content: string) => {
    setEditingMessageId(messageId);
    setEditedDraft(content);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedDraft = async () => {
    if (!editingMessageId || !selectedConversationId) return;

    try {
      await approveDraftMutation.mutateAsync({
        processId: selectedProcessId,
        conversationId: selectedConversationId,
        messageId: editingMessageId,
        originalDraft: conversationData?.messages.find(m => m.id === editingMessageId)?.content || "",
        editedDraft,
        draftType,
        approvalStatus: "edited_approved",
      });

      setIsEditDialogOpen(false);
      setEditingMessageId(null);
      setEditedDraft("");
    } catch (error) {
      console.error("Erro ao salvar minuta editada:", error);
    }
  };

  // Função para parar a geração
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  const renameConversationMutation = trpc.david.renameConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
      setIsRenameDialogOpen(false);
      setRenamingConversationId(null);
      setNewConversationTitle("");
      toast.success("✏️ Conversa renomeada");
    },
    onError: (error) => {
      toast.error("Erro ao renomear: " + error.message);
    },
  });

  const deleteConversationMutation = trpc.david.deleteConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
      setSelectedConversationId(null);
      setIsDeleteDialogOpen(false);
      setDeletingConversationId(null);
      toast.success("🗑️ Conversa deletada");
    },
    onError: (error) => {
      toast.error("Erro ao deletar: " + error.message);
    },
  });

  const togglePinMutation = trpc.david.togglePin.useMutation({
    onSuccess: () => {
      refetchConversations();
      toast.success("📌 Status de fixação alterado");
    },
    onError: (error) => {
      toast.error("Erro ao fixar: " + error.message);
    },
  });

  const deleteMultipleMutation = trpc.david.deleteMultiple.useMutation({
    onSuccess: (data) => {
      refetchConversations();
      setSelectedConversations(new Set());
      setIsSelectionMode(false);
      toast.success(`🗑️ ${data.deletedCount} conversa(s) deletada(s)`);
    },
    onError: (error) => {
      toast.error("Erro ao deletar conversas: " + error.message);
    },
  });

  // Auto-scroll ao receber novas mensagens ou durante streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationData?.messages, streamingMessage, pendingUserMessage]);

  const handleNewConversation = () => {
    // Navegar para /david sem ID de conversa - a sidebar também lerá isso
    setLocation("/david");
    setSelectedConversationId(null);
    setSelectedProcessId(undefined);
    setMessageInput("");
    setPendingUserMessage(null);
    setStreamingMessage("");
    setIsStreaming(false);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isStreaming) return;

    const userMessage = messageInput;
    setMessageInput("");
    setPendingUserMessage(userMessage); // Mostrar mensagem imediatamente (otimista)

    // Se não tiver conversa selecionada, cria uma nova primeiro
    if (!selectedConversationId) {
      // Otimisticamente mostra loading ou algo, mas aqui vamos esperar a criação
      createConversationMutation.mutate({
        processId: selectedProcessId,
        title: "Nova Conversa" // O backend ou usuário pode renomear depois
      }, {
        onSuccess: async (newConv) => {
          // Navegar via URL para sincronizar com sidebar
          setLocation(`/david?c=${newConv.id}`);
          setSelectedConversationId(newConv.id);
          // Pequeno delay para garantir que o estado atualize
          setTimeout(() => {
            streamMessage(newConv.id, userMessage);
          }, 100);
        }
      });
      return;
    }

    // Iniciar streaming
    await streamMessage(selectedConversationId, userMessage);
  };

  // --- Áudio & Enhancer Logic ---
  const enhancePromptMutation = trpc.david.enhancePrompt.useMutation({
    onSuccess: (data) => {
      setMessageInput(data.content);
      toast.success("Prompt melhorado!");
      adjustTextareaHeight();
    },
    onError: () => toast.error("Erro ao melhorar prompt"),
  });

  const transcribeAudioMutation = trpc.david.transcribeAudio.useMutation({
    onSuccess: (data) => {
      setMessageInput((prev) => (prev ? prev + " " : "") + data.text);
      if (textareaRef.current) {
        textareaRef.current.focus();
        adjustTextareaHeight();
      }
    },
    onError: () => toast.error("Erro ao transcrever áudio"),
  });

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleEnhancePrompt = () => {
    if (!messageInput.trim()) return;
    enhancePromptMutation.mutate({ prompt: messageInput });
  };

  const handleRecordClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(",")[1];
            transcribeAudioMutation.mutate({ audio: base64Audio });
          };
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error("Erro ao acessar microfone. Verifique permissões.");
        console.error("Microfone error:", err);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Funções para seleção múltipla
  const toggleConversationSelection = (id: number) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedConversations.size === conversations?.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(conversations?.map(c => c.id) || []));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedConversations.size === 0) {
      toast.error("Nenhuma conversa selecionada");
      return;
    }

    deleteMultipleMutation.mutate({ ids: Array.from(selectedConversations) });
  };

  return (
    <DashboardLayout>
      <div className="flex h-full bg-background">
        {/* Sidebar - Histórico de Conversas */}
        {/* Área Principal - Chat (Agora em tela cheia) */}
        <div className="flex-1 flex flex-col relative h-full overflow-hidden"> {/* Added relative for positioning if needed */}


          {/* Header com seletor de processo e Menu de Histórico */}
          <div className="p-2 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-1 flex items-center justify-end">

                {/* Progress bar durante upload OU Badge quando concluído */}
                <AnimatePresence mode="wait">
                  {uploadState.isUploading ? (
                    <motion.div
                      key="progress"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-1.5 min-w-[200px] max-w-[300px]"
                    >
                      <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={uploadState.fileName || ''}>
                          {uploadState.fileName && uploadState.fileName.length > 25
                            ? uploadState.fileName.substring(0, 22) + '...'
                            : uploadState.fileName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 rounded-full"
                              style={{
                                width: uploadState.stage === 'sending' ? '25%'
                                  : uploadState.stage === 'reading' ? '50%'
                                    : uploadState.stage === 'extracting' ? '75%'
                                      : uploadState.stage === 'done' ? '100%'
                                        : '0%'
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {uploadState.stage === 'sending' && '25%'}
                            {uploadState.stage === 'reading' && '50%'}
                            {uploadState.stage === 'extracting' && '75%'}
                            {uploadState.stage === 'done' && '100%'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ) : selectedProcessId && processes?.find(p => p.id === selectedProcessId) ? (
                    <motion.div
                      key="badge"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-1.5"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium truncate max-w-[180px]" title={processes.find(p => p.id === selectedProcessId)?.processNumber}>
                        {processes.find(p => p.id === selectedProcessId)?.processNumber || 'Processo anexado'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-destructive/20"
                        onClick={() => setSelectedProcessId(undefined)}
                        title="Remover processo"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Área Central: Mensagens OU Bem-vindo */}
          {selectedConversationId ? (
            <div className="flex-1 min-h-0 relative">
              <ScrollArea className="h-full p-4" ref={scrollRef}>
                <div className="space-y-4 max-w-4xl mx-auto pb-4">

                  {/* Processo Vinculado em destaque */}
                  {selectedProcessId && (
                    <div className="flex justify-start mb-6 animate-in slide-in-from-left-2 duration-300">
                      <Card className="p-4 bg-secondary/20 border border-primary/20 max-w-[85%] sm:max-w-md shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <Gavel className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              Processo Vinculado
                              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            </h3>
                            <p className="text-sm font-medium text-foreground/90 font-mono tracking-tight">
                              {processes?.find(p => p.id === selectedProcessId)?.processNumber || "Carregando..."}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              O contexto deste processo está ativo. Todas as perguntas serão respondidas com base nos documentos dos autos.
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {conversationData?.messages.map((message) => {
                    if (message.role === "assistant") {
                      return (
                        <div key={message.id} className="flex flex-col items-start gap-2 max-w-4xl w-full mb-8 animate-in fade-in slide-in-from-bottom-2 group">
                          {/* Header da Mensagem (Avatar + Nome) */}
                          <div className="flex items-center gap-0 select-none pl-0 opacity-90 group-hover:opacity-100 transition-opacity">
                            <img src={APP_LOGO} alt="D" className="w-[60px] h-[60px] object-contain" />
                            <div className="flex items-center gap-2 -ml-2">
                              <span className="font-semibold text-sm text-foreground/90">David</span>
                              <span className="text-[10px] text-muted-foreground/80">• Assistente Jurídico</span>
                            </div>
                          </div>

                          {/* Conteúdo da Mensagem */}
                          <div className="pl-10 w-full text-foreground leading-relaxed space-y-2 text-justify">
                            <Streamdown>{message.content}</Streamdown>

                            {/* Botões de Ação (Minutas) */}
                            {(() => {
                              const content = message.content.toLowerCase();
                              const isDraft = content.includes("minuta") ||
                                content.includes("petição") ||
                                content.includes("contestação") ||
                                content.includes("sentença") ||
                                content.includes("decisão interlocutória") ||
                                content.includes("despacho") ||
                                content.includes("recurso") ||
                                (content.includes("excelentíssimo") && content.length > 500);

                              if (!isDraft) return (
                                <p className="text-[10px] text-muted-foreground/40 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                                </p>
                              );

                              return (
                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                                  <p className="text-xs opacity-70 flex-1">
                                    {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => handleApproveDraft(message.id, message.content, "approved")}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5"
                                    onClick={() => handleEditAndApprove(message.id, message.content)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                    Editar
                                  </Button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    }

                    // User Message (Bubble Style)
                    return (
                      <div key={message.id} className="flex justify-end mb-8 pl-10">
                        <div className="bg-muted px-5 py-3.5 rounded-3xl rounded-tr-md max-w-[85%] text-foreground/90 shadow-sm">
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <p className="text-[10px] text-muted-foreground/60 text-right mt-1">
                            {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    );
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
                  {isStreaming && !streamingMessage && !thinkingMessage && (
                    <div className="flex justify-start py-2">
                      <div className="thinking-indicator">
                        <div className="thinking-circle">
                          <img src={APP_LOGO} alt="D" className="thinking-logo" />
                        </div>
                        <span className="text-sm text-muted-foreground">Só um segundo...</span>
                      </div>
                    </div>
                  )}

                  {/* Thinking Process (Visible during and after generation if available) */}
                  {thinkingMessage && (
                    <div className="flex flex-col items-start gap-2 max-w-4xl w-full mb-4 pl-10 animate-in fade-in slide-in-from-bottom-2">
                      <div className="w-full bg-muted/30 border border-border/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            💭 Processo de Pensamento
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground/80 whitespace-pre-wrap leading-relaxed font-mono text-[13px]">
                          {thinkingMessage}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensagem em streaming (Clean Style) */}
                  {isStreaming && streamingMessage && (
                    <div className="flex flex-col items-start gap-2 max-w-4xl w-full mb-8 animate-in fade-in">
                      {/* Header */}
                      <div className="flex items-center gap-1 select-none pl-0">
                        <img src={APP_LOGO} alt="D" className="w-[60px] h-[60px] object-contain" />
                        <div className="flex items-center gap-2 -ml-2">
                          <span className="font-semibold text-sm text-foreground/90">David</span>
                          <span className="text-[10px] text-muted-foreground/80">• Digitando...</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="pl-10 w-full text-foreground leading-relaxed text-justify">
                        <Streamdown>{streamingMessage}</Streamdown>
                        <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-primary/50 animate-pulse rounded-sm" />
                      </div>
                    </div>
                  )}

                  {/* Elemento invisível para scroll automático */}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>
          ) : (
            // HOME - Estado sem conversa selecionada (Estilo Gemini)
            <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
              <div className="w-full max-w-2xl space-y-8">
                {/* Saudação personalizada */}
                <div className="text-center space-y-2">
                  <h1 className="text-4xl md:text-5xl font-medium bg-gradient-to-r from-[#1e3a5a] via-[#2563eb] to-[#d4a828] bg-clip-text text-transparent">
                    Olá, {user?.name?.split(' ')[0] || 'Usuário'}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Como posso ajudar você hoje?
                  </p>
                </div>

                {/* Input centralizado estilo Gemini */}
                <div className="relative">
                  <div className="flex items-end gap-2 p-3 bg-muted/50 border rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    {/* Botão de upload */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={open}
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
                        onClick={handleRecordClick}
                        disabled={transcribeAudioMutation.isPending}
                        title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                      >
                        {transcribeAudioMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Mic className="h-5 w-5" />
                        )}
                      </Button>

                      {/* Enviar */}
                      <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || isStreaming || createConversationMutation.isPending}
                      >
                        {createConversationMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sugestões de ação */}
                <div className="flex flex-wrap justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2 text-sm"
                    onClick={open}
                  >
                    <Upload className="h-4 w-4" />
                    Enviar processo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2 text-sm"
                    onClick={() => setIsPromptsModalOpen(true)}
                  >
                    <BookMarked className="h-4 w-4" />
                    Meus prompts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2 text-sm"
                    onClick={() => setLocation("/settings")}
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Área de Input - esconde quando na HOME (sem conversa selecionada) */}
          <div {...getRootProps()} className={`outline-none ${!selectedConversationId ? 'hidden' : ''}`}>
            <input {...getInputProps()} />

            {/* Overlay de Drag & Drop quando arrastar arquivo */}
            <AnimatePresence>
              {isDragActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="bg-card border-2 border-primary border-dashed rounded-xl p-10 text-center shadow-2xl">
                    <Upload className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold">Solte para processar</h2>
                    <p className="text-muted-foreground">O David irá analisar este processo automaticamente.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Banner de progresso removido - agora fica dentro do input */}

            <div className="p-4 border-t bg-background">
              <div className="max-w-4xl mx-auto relative">
                {/* Inline Prompts Panel - expands UPWARD from input */}
                <AnimatePresence>
                  {isPromptsModalOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-full left-0 right-0 overflow-hidden z-10 mb-[-3rem]"
                    >
                      <div className="border border-b-0 rounded-t-2xl bg-gray-100 shadow-xl overflow-hidden pb-16">
                        {isCreatePromptOpen ? (
                          /* Create Prompt View - content only, footer is separate bar below */
                          <div className="flex flex-col" style={{ height: '55vh', maxHeight: '55vh' }}>
                            <div className="flex items-center gap-3 px-4 py-3 border-b">
                              <button onClick={() => setIsCreatePromptOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-5 w-5" />
                              </button>
                              <span className="font-medium">{editingPromptId ? 'Editar' : 'Criar'}</span>
                              <button onClick={() => { setIsPromptsModalOpen(false); setIsCreatePromptOpen(false); }} className="ml-auto text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <ScrollArea className="flex-1 p-4 space-y-3">
                              <div className="flex items-center justify-between gap-4">
                                <input
                                  type="text"
                                  placeholder="Nome do Prompt"
                                  value={newPromptTitle}
                                  onChange={(e) => setNewPromptTitle(e.target.value)}
                                  className="flex-1 text-lg font-semibold text-primary bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
                                />
                                {/* Seletor de Coleção - lado direito */}
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
                            </ScrollArea>
                          </div>
                        ) : viewingPrompt ? (
                          /* View Prompt View - content only, footer is separate bar below */
                          <div className="flex flex-col" style={{ height: '55vh', maxHeight: '55vh' }}>
                            <div className="flex items-center gap-3 px-4 py-3 border-b">
                              <button onClick={() => setViewingPrompt(null)} className="text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-5 w-5" />
                              </button>
                              <span className="font-medium">Visualizar Prompt</span>
                              <button onClick={() => { setIsPromptsModalOpen(false); setViewingPrompt(null); }} className="ml-auto text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                              <h2 className="text-xl font-bold mb-4">{viewingPrompt.title}</h2>
                              <p className="text-muted-foreground whitespace-pre-wrap">{viewingPrompt.content}</p>
                            </ScrollArea>
                          </div>
                        ) : (
                          /* Prompts List */
                          <div className="flex flex-col" style={{ height: '55vh', maxHeight: '55vh' }}>
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                              {isSelectMode ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => { setIsSelectMode(false); setSelectedPromptIds([]); }} className="text-muted-foreground">
                                      Cancelar
                                    </Button>
                                    <span className="font-medium text-sm">{selectedPromptIds.length} selecionado{selectedPromptIds.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (savedPrompts && selectedPromptIds.length === savedPrompts.length) {
                                          setSelectedPromptIds([]);
                                        } else if (savedPrompts) {
                                          setSelectedPromptIds(savedPrompts.map((p: any) => p.id));
                                        }
                                      }}
                                    >
                                      {savedPrompts && selectedPromptIds.length === savedPrompts.length ? 'Deselecionar todos' : 'Selecionar todos'}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={selectedPromptIds.length === 0}
                                      onClick={() => setDeleteConfirmDialog({ isOpen: true, promptIds: selectedPromptIds })}
                                      className="gap-1"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Apagar
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
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button size="sm" className="gap-2 bg-blue-900 hover:bg-blue-800 text-white">
                                          {currentCollection?.name || "Coleções"}
                                          <ChevronDown className="h-3 w-3 opacity-80" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[220px] p-0" align="end">
                                        <Command>
                                          <CommandInput placeholder="Buscar coleção..." />
                                          <CommandList>
                                            <CommandEmpty>Nenhuma coleção encontrada.</CommandEmpty>
                                            <CommandGroup heading="Minhas Coleções">
                                              {/* Lista de coleções */}
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

                                    <Button size="sm" onClick={() => { setEditingPromptId(null); setNewPromptTitle(""); setNewPromptContent(""); setIsCreatePromptOpen(true); }} className="gap-1 bg-blue-900 hover:bg-blue-800 text-white">
                                      <Plus className="h-4 w-4" />
                                      Prompt
                                    </Button>
                                    <button onClick={() => setIsPromptsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                                      <X className="h-5 w-5" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Área de navegação de pasta */}
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

                            <ScrollArea className="flex-1">
                              {filteredPrompts && filteredPrompts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                                  {filteredPrompts.map((prompt: any) => (
                                    <div
                                      key={prompt.id}
                                      className={`p-4 rounded-xl border shadow-sm transition-all cursor-pointer group relative ${isSelectMode
                                        ? selectedPromptIds.includes(prompt.id) ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-white hover:bg-muted/50'
                                        : 'bg-white hover:shadow-md'
                                        }`}
                                      onClick={() => {
                                        if (isSelectMode) {
                                          if (selectedPromptIds.includes(prompt.id)) {
                                            setSelectedPromptIds(selectedPromptIds.filter(id => id !== prompt.id));
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
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <button className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all" onClick={(e) => e.stopPropagation()}>
                                                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                    </button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingPrompt({ id: prompt.id, title: prompt.title, content: prompt.content, category: prompt.category, tags: prompt.tags as string[] | undefined }); }}>
                                                      <Eye className="h-4 w-4 mr-2" /> Visualizar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingPromptId(prompt.id); setNewPromptTitle(prompt.title); setNewPromptContent(prompt.content); setNewPromptCategory(prompt.category || "uncategorized"); setIsCreatePromptOpen(true); }}>
                                                      <Edit className="h-4 w-4 mr-2" /> Editar
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSub>
                                                      <DropdownMenuSubTrigger>
                                                        <div className="flex items-center">
                                                          <FolderOpen className="mr-2 h-4 w-4" /> Mover para
                                                        </div>
                                                      </DropdownMenuSubTrigger>
                                                      <DropdownMenuSubContent>
                                                        {/* Só mostra "Retirar da coleção" se o prompt está em uma coleção */}
                                                        {prompt.collectionId && (
                                                          <>
                                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updatePromptMutation.mutate({ id: prompt.id, collectionId: null }); }}>
                                                              <X className="h-4 w-4 mr-2 text-muted-foreground" />
                                                              Retirar da coleção
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                          </>
                                                        )}
                                                        {promptCollections?.filter(col => col.id !== prompt.collectionId).map((col) => (
                                                          <DropdownMenuItem key={col.id} onClick={(e) => { e.stopPropagation(); updatePromptMutation.mutate({ id: prompt.id, collectionId: col.id }); }}>
                                                            <Folder className="h-4 w-4 mr-2 text-blue-600" />
                                                            {col.name}
                                                          </DropdownMenuItem>
                                                        ))}
                                                      </DropdownMenuSubContent>
                                                    </DropdownMenuSub>

                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsSelectMode(true); setSelectedPromptIds([prompt.id]); }}>
                                                      <CheckSquare className="h-4 w-4 mr-2" /> Selecionar vários
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteConfirmDialog({ isOpen: true, promptId: prompt.id }); }} className="text-destructive">
                                                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                                {/* Botão Usar */}
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); setMessageInput(prompt.content); setIsPromptsModalOpen(false); }}
                                                  className="flex items-center gap-1 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors"
                                                >
                                                  Usar <ArrowDown className="h-3 w-3" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground line-clamp-2">{prompt.content}</p>
                                          {prompt.tags && prompt.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {prompt.tags.map((tag: string) => (
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
                                </div>
                              )}
                              {hasNextPage && (
                                <div className="p-4 pt-0">
                                  <Button variant="ghost" className="w-full text-xs" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                                    {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Carregar mais"}
                                  </Button>
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input/Action Bar Container */}
                {isCreatePromptOpen ? (
                  /* Action bar when creating/editing a prompt */
                  <div className="border p-4 relative shadow-sm bg-gray-100 rounded-[2rem] transition-all duration-200 z-30">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsCreatePromptOpen(false);
                          setNewPromptTitle("");
                          setNewPromptContent("");
                          setNewPromptCategory("none");
                          setCustomCategory("");
                          setEditingPromptId(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 bg-blue-900 hover:bg-blue-800 text-white"
                        onClick={() => {
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
                        }}
                        disabled={!newPromptTitle.trim() || !newPromptContent.trim() || (newPromptCategory === "__new__" && !customCategory.trim()) || createPromptMutation.isPending || updatePromptMutation.isPending}
                      >
                        {(createPromptMutation.isPending || updatePromptMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        {editingPromptId ? 'Salvar Alterações' : 'Salvar Prompt'}
                      </Button>
                    </div>
                  </div>
                ) : viewingPrompt ? (
                  /* Action bar when viewing a prompt - styled like input */
                  <div className="border p-4 relative shadow-sm bg-white rounded-[2rem] transition-all duration-200 z-30">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setViewingPrompt(null)}>
                        Cancelar
                      </Button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setDeleteConfirmDialog({ isOpen: true, promptId: viewingPrompt.id });
                          }}
                          className="p-2 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPromptId(viewingPrompt.id);
                            setNewPromptTitle(viewingPrompt.title);
                            setNewPromptContent(viewingPrompt.content);
                            setNewPromptCategory(viewingPrompt.category || "uncategorized");
                            setViewingPrompt(null);
                            setIsCreatePromptOpen(true);
                          }}
                          className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <Button
                          onClick={() => {
                            setMessageInput(viewingPrompt.content);
                            setIsPromptsModalOpen(false);
                            setViewingPrompt(null);
                          }}
                          className="gap-1"
                        >
                          <ArrowRight className="h-4 w-4" /> Usar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Regular input container */
                  <div className={`border p-4 relative shadow-sm bg-white rounded-[2rem] transition-all duration-200 z-30 ${isPromptsModalOpen ? 'opacity-60 pointer-events-none' : 'focus-within:ring-1 focus-within:ring-primary/50'}`}>

                    <div className="flex justify-between items-start mb-2 relative">
                      <Textarea
                        ref={textareaRef}
                        value={messageInput}
                        onChange={(e) => {
                          setMessageInput(e.target.value);
                          adjustTextareaHeight();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="O que posso fazer por você?"
                        className="border-0 shadow-none resize-none min-h-[60px] w-full p-0 pr-[180px] focus-visible:ring-0 bg-transparent text-lg placeholder:text-muted-foreground/50"
                        style={{ maxHeight: "200px" }}
                      />

                      {/* Controles do Input (Modelo + Magic) */}
                      <div className="absolute top-0 right-0 flex items-center gap-1">
                        {/* Indicador de Modelo (Compacto) */}
                        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-primary/5 hover:bg-primary/10 transition-colors rounded-md border border-primary/10 cursor-help select-none mr-1" title={`Modelo: ${settings.data?.llmModel || 'Padrão'}`}>
                          <Bot className="w-3.5 h-3.5 text-primary/70" />
                          <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-tight">
                            {settings.data?.llmModel?.replace(/-/g, " ").toUpperCase() || "GEMINI 2.0 FLASH"}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                          title="Melhorar Prompt (IA)"
                          onClick={handleEnhancePrompt}
                          disabled={!messageInput.trim() || enhancePromptMutation.isPending}
                        >
                          {enhancePromptMutation.isPending ? (
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
                          onClick={open}
                        >
                          <Gavel className="h-4 w-4" />
                          Enviar Processo
                        </Button>

                        {/* Prompts Toggle Button */}
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
                        <Button
                          onClick={handleRecordClick}
                          variant={isRecording ? "destructive" : "ghost"}
                          size="icon"
                          className={`h-10 w-10 rounded-full transition-all ${isRecording ? 'animate-pulse' : 'text-muted-foreground hover:text-primary hover:bg-accent'}`}
                          title={isRecording ? "Parar Gravação" : "Gravar áudio"}
                          disabled={transcribeAudioMutation.isPending}
                        >
                          {transcribeAudioMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Mic className={`h-5 w-5 ${isRecording ? 'fill-current' : ''}`} />
                          )}
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim() && !isProcessing}
                          size="icon"
                          className={`h-10 w-10 rounded-full transition-all duration-300 ${messageInput.trim() ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-105' : 'bg-muted text-muted-foreground'}`}
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
                )}

                {/* Footer Texto */}
                <div className="text-center mt-2">
                  <p className="text-xs text-muted-foreground">O DAVID pode cometer erros. Considere verificar as informações importantes.</p>
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* Dialog de Confirmação de Exclusão */}
        <Dialog open={deleteConfirmDialog.isOpen} onOpenChange={(open) => !open && setDeleteConfirmDialog({ isOpen: false })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                {deleteConfirmDialog.promptIds && deleteConfirmDialog.promptIds.length > 1
                  ? `Tem certeza que deseja excluir ${deleteConfirmDialog.promptIds.length} prompts selecionados?`
                  : 'Tem certeza que deseja excluir este prompt?'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmDialog({ isOpen: false })}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirmDialog.promptIds && deleteConfirmDialog.promptIds.length > 0) {
                    // Delete multiple prompts
                    deleteConfirmDialog.promptIds.forEach(id => deletePromptMutation.mutate({ id }));
                    setSelectedPromptIds([]);
                    setIsSelectMode(false);
                  } else if (deleteConfirmDialog.promptId) {
                    // Delete single prompt
                    deletePromptMutation.mutate({ id: deleteConfirmDialog.promptId });
                  }
                  setDeleteConfirmDialog({ isOpen: false });
                }}
              >
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição de Minuta */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Editar Minuta</DialogTitle>
              <DialogDescription>
                Revise e edite a minuta gerada pelo DAVID antes de aprovar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="draftType">Tipo de Minuta</Label>
                <Select value={draftType} onValueChange={(value: any) => setDraftType(value)}>
                  <SelectTrigger id="draftType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sentenca">Sentença</SelectItem>
                    <SelectItem value="decisao">Decisão Interlocutória</SelectItem>
                    <SelectItem value="despacho">Despacho</SelectItem>
                    <SelectItem value="acordao">Acórdão</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="editedDraft">Conteúdo da Minuta</Label>
                <Textarea
                  id="editedDraft"
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Edite a minuta aqui..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingMessageId(null);
                    setEditedDraft("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEditedDraft}
                  disabled={!editedDraft.trim()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar e Aprovar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog >

        {/* Dialog de Renomear Conversa */}
        < Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen} >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>✏️ Renomear Conversa</DialogTitle>
              <DialogDescription>
                Escolha um novo nome para esta conversa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="conversationTitle">Título da Conversa</Label>
                <Textarea
                  id="conversationTitle"
                  value={newConversationTitle}
                  onChange={(e) => setNewConversationTitle(e.target.value)}
                  className="min-h-[80px]"
                  placeholder="Digite o novo título..."
                  maxLength={200}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRenameDialogOpen(false);
                    setRenamingConversationId(null);
                    setNewConversationTitle("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (renamingConversationId && newConversationTitle.trim()) {
                      renameConversationMutation.mutate({
                        conversationId: renamingConversationId,
                        title: newConversationTitle.trim(),
                      });
                    }
                  }}
                  disabled={!newConversationTitle.trim()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog >

        {/* Dialog de Seleção de Processo */}
        < Dialog open={isProcessSelectorOpen} onOpenChange={setIsProcessSelectorOpen} >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>⚖️ Selecionar Processo Ativo</DialogTitle>
              <DialogDescription>
                Selecione o processo que deseja vincular a esta conversa. O contexto do processo será injetado automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {processes && processes.length > 0 ? (
                <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                  {processes.map((process: any) => (
                    <Card
                      key={process.id}
                      className={`p-4 cursor-pointer transition-colors ${selectedProcessId === process.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                        }`}
                      onClick={() => {
                        setSelectedProcessId(process.id);
                        if (selectedConversationId) {
                          updateProcessMutation.mutate({
                            conversationId: selectedConversationId,
                            processId: process.id,
                          });

                          // Atualizar título da conversa com o número do processo
                          renameConversationMutation.mutate({
                            conversationId: selectedConversationId,
                            title: process.processNumber,
                          });
                        }
                        setIsProcessSelectorOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-mono text-sm font-semibold">
                            {process.processNumber}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Autor:</span> {process.plaintiff}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Réu:</span> {process.defendant}
                          </div>
                          {process.subject && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {process.subject}
                            </div>
                          )}
                        </div>
                        {selectedProcessId === process.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum processo cadastrado</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsProcessSelectorOpen(false);
                      setLocation("/processos");
                    }}
                    className="mt-2"
                  >
                    Cadastrar primeiro processo
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog >

        {/* Dialog de Visualização de Dados do Processo */}
        < Dialog open={isProcessDataOpen} onOpenChange={setIsProcessDataOpen} >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📋 Dados do Processo</DialogTitle>
            </DialogHeader>

            {selectedProcessId && processes && (() => {
              const currentProcess = processes.find((p: any) => p.id === selectedProcessId);
              if (!currentProcess) return <p>Processo não encontrado</p>;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Número do Processo</Label>
                      <p className="font-mono font-semibold">{currentProcess.processNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Data de Distribuição</Label>
                      <p>{currentProcess.distributionDate ? new Date(currentProcess.distributionDate).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Autor/Requerente</Label>
                      <p>{currentProcess.plaintiff}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Réu/Requerido</Label>
                      <p>{currentProcess.defendant}</p>
                    </div>
                  </div>

                  {currentProcess.court && (
                    <div>
                      <Label className="text-muted-foreground">Vara/Juizado</Label>
                      <p>{currentProcess.court}</p>
                    </div>
                  )}

                  {currentProcess.subject && (
                    <div>
                      <Label className="text-muted-foreground">Assunto</Label>
                      <p>{currentProcess.subject}</p>
                    </div>
                  )}



                  {currentProcess.facts && (
                    <div>
                      <Label className="text-muted-foreground">Fatos</Label>
                      <p className="text-sm whitespace-pre-wrap">{currentProcess.facts}</p>
                    </div>
                  )}

                  {currentProcess.requests && (
                    <div>
                      <Label className="text-muted-foreground">Pedidos</Label>
                      <p className="text-sm whitespace-pre-wrap">{currentProcess.requests}</p>
                    </div>
                  )}

                  {currentProcess.evidence && (
                    <div>
                      <Label className="text-muted-foreground">Provas</Label>
                      <p className="text-sm whitespace-pre-wrap">{currentProcess.evidence}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog >

        {/* Dialog de Upload de Documentos */}
        < Dialog open={isUploadDocsOpen} onOpenChange={setIsUploadDocsOpen} >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>📎 Upload de Documentos do Processo</DialogTitle>
              <DialogDescription>
                Adicione documentos relacionados ao processo atual para enriquecer o contexto do DAVID.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PDF, DOCX, TXT
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  id="process-docs-upload"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setUploadingFiles(files);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => document.getElementById('process-docs-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivos
                </Button>
              </div>

              {/* Preview de arquivos selecionados */}
              {uploadingFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Arquivos selecionados:</h4>
                  {uploadingFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      {uploadProgress[file.name] !== undefined && (
                        <span className="text-xs text-muted-foreground">{uploadProgress[file.name]}%</span>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!selectedProcessId) {
                          toast.error("Nenhum processo selecionado");
                          return;
                        }

                        for (const file of uploadingFiles) {
                          try {
                            setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

                            // Ler arquivo como base64
                            const reader = new FileReader();
                            const fileData = await new Promise<string>((resolve, reject) => {
                              reader.onload = () => {
                                const base64 = reader.result as string;
                                resolve(base64.split(',')[1]); // Remove "data:...;base64,"
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });

                            setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

                            // Upload via tRPC
                            const fileType = file.name.split('.').pop() || 'txt';
                            await uploadDocMutation.mutateAsync({
                              processId: selectedProcessId,
                              fileName: file.name,
                              fileData,
                              fileType,
                              documentType: 'outro',
                            });

                            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                            toast.success(`${file.name} enviado com sucesso!`);
                          } catch (error) {
                            console.error('Erro no upload:', error);
                            toast.error(`Erro ao enviar ${file.name}`);
                          }
                        }

                        // Limpar estado
                        setUploadingFiles([]);
                        setUploadProgress({});
                        setIsUploadDocsOpen(false);
                      }}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Enviar Arquivos
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadingFiles([]);
                        setUploadProgress({});
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                💡 <strong>Dica:</strong> Os documentos serão processados e seu conteúdo será disponibilizado para o DAVID usar como referência durante as conversas.
              </div>
            </div>
          </DialogContent>
        </Dialog >

        {/* Dialog de Seleção de Prompt */}
        < Dialog open={isPromptSelectorOpen} onOpenChange={setIsPromptSelectorOpen} >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📝 Aplicar Prompt Especializado</DialogTitle>
              <DialogDescription>
                Selecione um prompt salvo para aplicar na conversa atual.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {!savedPrompts || savedPrompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum prompt salvo encontrado.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setIsPromptSelectorOpen(false);
                      setLocation("/prompts");
                    }}
                  >
                    Criar Primeiro Prompt
                  </Button>
                </div>
              ) : (
                savedPrompts.map((prompt: any) => (
                  <div
                    key={prompt.id}
                    className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      applyPromptMutation.mutate({
                        conversationId: selectedConversationId!,
                        promptId: prompt.id,
                      });
                      setIsPromptSelectorOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold">{prompt.title}</h4>
                        {prompt.category && (
                          <span className="text-xs text-muted-foreground">
                            {prompt.category}
                          </span>
                        )}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {prompt.content}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPromptSelectorOpen(false);
                  setLocation("/prompts");
                }}
              >
                Gerenciar Prompts
              </Button>
            </div>
          </DialogContent>
        </Dialog >

        {/* Dialog de Confirmação de Deletar */}
        < Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>🗑️ Deletar Conversa</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setDeletingConversationId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deletingConversationId) {
                    deleteConversationMutation.mutate({ id: deletingConversationId });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </Button>
            </div>
          </DialogContent>
        </Dialog >

        {/* Dialog de Processo Duplicado */}
        <Dialog
          open={duplicateProcessDialog.isOpen}
          onOpenChange={(open) => setDuplicateProcessDialog(prev => ({ ...prev, isOpen: open }))}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                ⚠️ Processo já existe!
              </DialogTitle>
              <DialogDescription>
                O processo <strong>{duplicateProcessDialog.processNumber}</strong> já está vinculado a outra(s) conversa(s):
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 my-4">
              {duplicateProcessDialog.existingConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm font-medium truncate flex-1">{conv.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedConversationId(conv.id);
                      setDuplicateProcessDialog({ isOpen: false, processNumber: null, existingConversations: [] });
                      toast.info("Navegando para conversa existente...");
                    }}
                  >
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Ir
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDuplicateProcessDialog({ isOpen: false, processNumber: null, existingConversations: [] });
                  toast.success("Processo mantido nesta conversa.");
                }}
              >
                Manter aqui
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout >
  );
}
