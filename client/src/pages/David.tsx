import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Plus, Trash2, FileText, Settings, BookMarked, X, Check, Edit, ArrowRight, Upload, MessageSquare, ChevronRight, ChevronDown, Pin, PinOff, Gavel, Brain, Mic, Wand2, Bot, Paperclip } from "lucide-react";




import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
import { ToolsMenu } from "@/components/ToolsMenu";
import DashboardLayout from "@/components/DashboardLayout";

import { APP_LOGO } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useChatStream } from "@/hooks/useChatStream";
import { useConversationId } from "@/hooks/useConversationId";
import { usePdfUpload } from "@/hooks/usePdfUpload";
import { usePrompts } from "@/hooks/usePrompts";
import { ChatInput } from "@/components/ChatInput";
import { AttachedFilesBadge, UploadProgress } from "@/components/chat";
import { PromptsModal } from "@/components/prompts";
import {
  DeletePromptDialog,
  EditDraftDialog,
  RenameConversationDialog,
  DeleteConversationDialog,
  FilesModal,
  ProcessSelectorDialog,
  ProcessDataDialog,
  DuplicateProcessDialog,
  type DraftType,
} from "@/components/dialogs";

// Debug logs removidos para limpar console

export default function David() {
  const { user } = useAuth();

  // 🔧 FIX: Single Source of Truth - URL como única fonte de verdade
  // Hook customizado que elimina loops de estado (para navegação entre conversas)
  const [selectedConversationId, setSelectedConversationId] = useConversationId();

  // useLocation mantido para navegação para outras páginas (settings, processos, etc)
  const [, setLocation] = useLocation();

  const [selectedProcessId, setSelectedProcessId] = useState<number | undefined>();
  const [messageInput, setMessageInput] = useState("");
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null); // Mensagem otimista do usuário
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook de streaming refatorado
  const {
    isStreaming,
    streamedContent: streamingMessage,
    thinkingContent: thinkingMessage,
    statusMessage,
    streamMessage: performStream,
    stopGeneration,
    resetStream,
  } = useChatStream();

  // Parse thinking: prioriza thinkingMessage do hook, depois tags no content
  const parsedStreaming = useMemo(() => {
    // Se não há mensagem, retornar vazio
    if (!streamingMessage && !thinkingMessage) {
      return { thinking: "", content: "", inProgress: false };
    }

    const raw = streamingMessage;

    // Fonte 1: thinkingMessage do hook (já vem separado do backend/protocolo v2)
    // Este é o caminho principal - o hook já gerencia o thinking corretamente
    if (thinkingMessage) {
      return {
        thinking: thinkingMessage,
        content: raw.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, "").replace(/<thinking>[\s\S]*/g, "").trim(),
        inProgress: false
      };
    }

    // Fonte 2: Parsing de tags <thinking> no content (fallback / protocolo v1)
    // Verifica tag completa
    const completeMatch = raw.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (completeMatch) {
      const thinking = completeMatch[1].trim();
      const content = raw.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, "").trim();
      return {
        thinking,
        content,
        inProgress: false
      };
    }

    // Verifica se tem tag aberta mas não fechada (streaming em progresso)
    const openMatch = raw.match(/<thinking>([\s\S]*)/);
    if (openMatch) {
      const thinking = openMatch[1].trim();
      const content = raw.substring(0, openMatch.index).trim(); // Mostra apenas o que veio ANTES do thinking
      return {
        thinking,
        content,
        inProgress: true
      };
    }

    // Sem thinking encontrado
    return {
      thinking: "",
      content: raw,
      inProgress: false
    };
  }, [streamingMessage, thinkingMessage]);

  // 🔧 FIX: Mantém apenas previousConversationIdRef para detectar mudança de conversa
  const previousConversationIdRef = useRef<number | null>(null);

  // 🔧 FIX: Resetar stream quando conversa muda (mantido, mas simplificado)
  useEffect(() => {
    if (selectedConversationId !== previousConversationIdRef.current) {
      resetStream();
      previousConversationIdRef.current = selectedConversationId;
    }
  }, [selectedConversationId, resetStream]);

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

  // ✅ CONSOLIDADO: attachedFiles é a única fonte de verdade para arquivos anexados
  // Estados removidos na Fase 0.5: localAttachedFile, activeFile

  // Estado de arquivos anexados à conversa (persiste após criar conversa)
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; uri: string }>>([]);

  // 🔧 INTEGRADO: usePdfUpload hook substitui lógica de upload inline
  const {
    uploadState,
    getRootProps,
    getInputProps,
    isDragActive,
    open,
  } = usePdfUpload({
    selectedConversationId,
    setAttachedFiles,
  });

  // 🔧 INTEGRADO: usePrompts hook substitui lógica de prompts inline
  const {
    // Estados do modal
    isPromptsModalOpen,
    setIsPromptsModalOpen,
    isCreatePromptOpen,
    setIsCreatePromptOpen,
    viewingPrompt,
    setViewingPrompt,
    // Estados do form
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
    hasNextPage,
    isFetchingNextPage,
    // Ações do modal
    toggleModal: togglePromptsModal,
    // Ações de CRUD
    openCreatePrompt,
    closeCreatePrompt: closeCreatePromptAction,
    savePrompt,
    // Ações de seleção
    selectAllPrompts,
    // Ações de coleção
    createCollection: createCollectionAction,
    // Paginação
    fetchNextPage,
    refetchPrompts,
    refetchCollections,
    // Mutations
    deletePromptMutation,
    createPromptMutation,
    updatePromptMutation,
    createCollectionMutation,
  } = usePrompts({
    searchQuery: debouncedSearch,
    selectedCategory,
  });

  // Estado do modal de arquivos
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);

  // ✅ Ref separada APENAS para rastrear se attachedFiles deve persistir
  // Não compartilha com o resetStream para evitar race conditions
  const attachedFilesPreviousIdRef = useRef<number | null>(null);

  // Limpar arquivos ao mudar de conversa
  useEffect(() => {

    // ✅ SOLUÇÃO: Preservar attachedFiles ao criar NOVA conversa (null → id)
    // Usa ref SEPARADA que não é modificada por outros effects
    const previousId = attachedFilesPreviousIdRef.current;
    const wasCreatingNewConversation = previousId === null && selectedConversationId !== null;



    if (!wasCreatingNewConversation) {
      // Se está trocando entre conversas existentes OU indo para HOME, limpa attachedFiles

      setAttachedFiles([]);
    } else {
      // Criando nova conversa - PRESERVA attachedFiles!

    }

    // Atualiza ref APÓS a lógica de preservação
    attachedFilesPreviousIdRef.current = selectedConversationId;

    // TODO: Futuramente, carregar attachedFiles do backend para cada conversa
  }, [selectedConversationId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);


  // 🔧 REMOVIDO: Query listPaginated e estados de prompts
  // Agora vêm do usePrompts hook (linha 226)

  // 🔧 REMOVIDO: Mutations de prompts (create, update, delete, createCollection)
  // Agora vêm do usePrompts hook (linha 226)


  // Mutation para upload de documentos
  const uploadDocMutation = trpc.processDocuments.upload.useMutation({
    onError: (error) => {
      console.error("[UploadDoc] Erro ao fazer upload:", error);
      // Erro já é tratado no catch onde mutateAsync é chamado
    },
  });

  // Queries
  const { data: conversations, refetch: refetchConversations } = trpc.david.listConversations.useQuery();
  const { data: processes } = trpc.processes.list.useQuery();
  const { data: conversationData, refetch: refetchMessages, isFetching, error: conversationError, status: conversationStatus } = trpc.david.getConversation.useQuery(
    { id: selectedConversationId! },
    {
      enabled: !!selectedConversationId,
      staleTime: 30000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  // Debug de erros de carregamento
  useEffect(() => {
    if (conversationError) {
      console.error("[David] Erro carregando conversa:", conversationError);
      toast.error("Erro ao carregar conversa. Tente recarregar a página.");
    }
  }, [conversationError]);

  // Debug de navegação removido

  // Log de render removido - era fonte de spam no console

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
  // 🔧 REMOVIDO: Query promptCollections e estados de navegação
  // Agora vêm do usePrompts hook (linha 226)

  // Mutations
  const createConversationMutation = trpc.david.createConversation.useMutation({
    onSuccess: (data) => {
      // Navegar para nova conversa
      setSelectedConversationId(data.id);
      refetchConversations();
    },
    onError: (error) => {
      toast.error("Erro ao criar conversa: " + error.message);
      console.error("[CreateConv] Erro ao criar conversa:", error);
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
    onError: (error) => {
      console.error("[TitleGen] Erro ao gerar título:", error.message);
      // Não mostrar toast pois é operação em background
    },
  });

  // Mutation para atualizar arquivo Google na conversa
  const updateGoogleFileMutation = trpc.david.updateGoogleFile.useMutation({
    onSuccess: () => {
      // Arquivo vinculado silenciosamente
    },
    onError: (error) => {
      console.error("[UpdateGoogle] Erro:", error.message);
    },
  });

  // Mutation para limpar arquivo Google ao sair da conversa
  const cleanupGoogleFileMutation = trpc.david.cleanupGoogleFile.useMutation({
    onSuccess: () => {
      // Arquivo limpo silenciosamente
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
        refetchConversations();
      }
    },
    onError: (error) => {
      console.error("[Cleanup] Erro ao limpar conversa vazia:", error.message);
      // Não mostrar toast pois é operação em background
    },
  });

  // 🔧 REMOVIDO: uploadState, uploadPdfQuickMutation, onDrop, useDropzone
  // Agora vêm do usePdfUpload hook (linha 211)

  // NOTA: registerFromUploadMutation ainda existe mas não é usado pelo fluxo atual
  // (uploadPdfQuick não extrai mais o processo automaticamente)

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
    const previousId = previousConversationIdRef.current;

    // Se trocou de conversa e tinha uma anterior
    if (
      previousId !== null &&
      previousId !== selectedConversationId
    ) {
      // Faz cleanup da conversa anterior (com delay para evitar race conditions)
      setTimeout(() => {
        cleanupGoogleFileMutation.mutate({
          conversationId: previousId
        });
        cleanupIfEmptyMutation.mutate({
          conversationId: previousId
        });
      }, 100);
    }
    // Atualiza referência
    previousConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Effect para cleanup ao desmontar componente (navegação para outra rota)
  // Effect para cleanup ao desmontar componente (navegação para outra rota)
  useEffect(() => {
    return () => {
      const previousId = previousConversationIdRef.current;
      if (previousId) {
        // Delay para evitar race conditions
        setTimeout(() => {
          cleanupIfEmptyMutation.mutate({
            conversationId: previousId
          });
        }, 100);
      }
    };
  }, []); // Mutation é estável, não precisa nas dependências

  // Effect para cleanup ao fechar o navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedConversationId) {
        // Usa sendBeacon para garantir que a requisição seja enviada
        // mesmo com o navegador fechando
        try {
          const data = JSON.stringify({ conversationId: selectedConversationId });
          const blob = new Blob([data], { type: 'application/json' });
          const queued = navigator.sendBeacon('/api/david/cleanup', blob);

          if (!queued) {
            console.warn('[Cleanup] sendBeacon falhou ao enfileirar requisição');
          }
        } catch (error) {
          console.error('[Cleanup] Erro ao enviar beacon:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedConversationId]);

  // Função para fazer streaming (usando hook useChatStream)
  const streamMessage = async (conversationId: number, content: string) => {
    // IMPORTANTE: Resetar stream do ANTERIOR aqui, no início da NOVA mensagem
    // Isso evita o "piscar" porque a mensagem anterior já está renderizada do banco
    resetStream();

    // ✅ CRÍTICO: Pegar googleFileUri do primeiro arquivo anexado (se existir)
    const googleFileUri = attachedFiles.length > 0 ? attachedFiles[0].uri : undefined;

    await performStream(conversationId, content, {
      googleFileUri, // ✅ Passar arquivo ao backend
      onDone: async () => {
        try {
          // Buscar novas mensagens do banco (inclui a que acabou de ser salva)
          await refetchMessages();

          // AGORA resetar o stream - mensagens do banco já estão carregadas
          // Isso elimina o gap visual entre isStreaming=false e mensagens do banco
          resetStream();
          setPendingUserMessage(null);

          // ❌ REMOVIDO: setAttachedFiles([]) limpava badge antes de renderizar no CHAT
          // Badge deve persistir para mostrar arquivos anexados à conversa

          // Gerar título automático após primeira resposta (se título é genérico)
          const currentTitle = conversationData?.conversation?.title?.trim();
          if (conversationId && (!currentTitle || currentTitle.toLowerCase() === "nova conversa")) {
            generateTitleMutation.mutate({ conversationId });
          }
        } catch (error) {
          console.error("[Stream] Erro ao finalizar streaming:", error);
          toast.error("Resposta recebida, mas houve erro ao atualizar mensagens");
          // Garantir que estados sejam resetados mesmo com erro
          resetStream();
          setPendingUserMessage(null);
        }
      },
      onError: (error) => {
        toast.error(error || "Erro ao enviar mensagem");
        resetStream();
      },
    });
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

  // Função para parar a geração (agora usa hook)
  const handleStopGeneration = () => {
    stopGeneration();
    toast.info("Geração interrompida");
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
    // Resetar estados ao criar nova conversa
    // NOTA: attachedFiles é limpo pelo useEffect de selectedConversationId
    setSelectedConversationId(null);
    setSelectedProcessId(undefined);
    setMessageInput("");
    setPendingUserMessage(null);
    resetStream();
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isStreaming) return;

    const userMessage = messageInput;
    setMessageInput("");
    setPendingUserMessage(userMessage); // Mostrar mensagem imediatamente (otimista)

    // Forçar scroll para o fundo imediatamente para ver a mensagem pendente
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);

    // Se não tiver conversa selecionada, cria uma nova primeiro
    if (!selectedConversationId) {
      // Otimisticamente mostra loading ou algo, mas aqui vamos esperar a criação
      createConversationMutation.mutate({
        processId: selectedProcessId,
        title: "Nova Conversa" // O backend ou usuário pode renomear depois
      }, {
        onSuccess: async (newConv) => {
          // 🔧 FIX: Usar novo hook que gerencia URL automaticamente
          setSelectedConversationId(newConv.id);

          // ✅ CRÍTICO: Vincular attachedFiles à nova conversa (se existirem)
          if (attachedFiles.length > 0) {
            const firstFile = attachedFiles[0];
            updateGoogleFileMutation.mutate({
              conversationId: newConv.id,
              googleFileUri: firstFile.uri,
              googleFileName: firstFile.name,
            });
          }

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
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">



          {/* Chat principal */}


          {/* Header minimalista - badge agora fica na área do input */}
          <div className="p-2 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Espaço reservado para possíveis controles futuros */}
            </div>
          </div>

          {selectedConversationId ? (
            <div className="flex-1 min-h-0 relative">
              <div className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
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
                              {conversationData?.processData?.processNumber || processes?.find(p => p.id === selectedProcessId)?.processNumber || "Carregando..."}
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
                  {isStreaming && !parsedStreaming.content && !parsedStreaming.thinking && (
                    <div className="flex justify-start py-2">
                      <div className="thinking-indicator">
                        <div className="thinking-circle">
                          <img src={APP_LOGO} alt="D" className="thinking-logo" />
                        </div>
                        <span className="text-sm text-muted-foreground">{statusMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Mensagem em streaming (inclui thinking estilo Gemini) */}
                  {isStreaming && (parsedStreaming.thinking || parsedStreaming.content) && (
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
                  )}

                  {/* Elemento invisível para scroll automático */}
                  <div ref={messagesEndRef} />
                </div>
              </div>
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
                            <p className="text-sm font-medium truncate max-w-[200px]" title={uploadState.fileName || ''}>{uploadState.fileName}</p>
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
                                onClick={() => {
                                  setAttachedFiles(prev => prev.filter(f => f.uri !== file.uri));
                                }}
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

                        {/* Botão enviar */}
                        <Button
                          disabled={!messageInput.trim() || isStreaming || createConversationMutation.isPending}
                          onClick={handleSendMessage}
                          size="icon"
                          className="h-10 w-10 rounded-full shrink-0 bg-blue-900 hover:bg-blue-800 text-white"
                          title="Enviar mensagem"
                        >
                          {createConversationMutation.isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                      {/* Fim do container input flex horizontal */}
                    </div>
                    {/* Fim do container geral rounded-2xl */}
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
                    onClick={() => setIsFilesModalOpen(true)}
                  >
                    <Paperclip className="h-4 w-4" />
                    Arquivos ({attachedFiles.length})
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
          )}          {/* Modal de Prompts - Na HOME aparece centralizado */}
          {!selectedConversationId && (
            <PromptsModal
              variant="centered"
              isOpen={isPromptsModalOpen}
              onClose={() => setIsPromptsModalOpen(false)}
              onSelectPrompt={(content) => setMessageInput(content)}
              isCreatePromptOpen={isCreatePromptOpen}
              setIsCreatePromptOpen={setIsCreatePromptOpen}
              viewingPrompt={viewingPrompt}
              setViewingPrompt={setViewingPrompt}
              editingPromptId={editingPromptId}
              setEditingPromptId={setEditingPromptId}
              newPromptTitle={newPromptTitle}
              setNewPromptTitle={setNewPromptTitle}
              newPromptContent={newPromptContent}
              setNewPromptContent={setNewPromptContent}
              newPromptCategory={newPromptCategory}
              setNewPromptCategory={setNewPromptCategory}
              customCategory={customCategory}
              setCustomCategory={setCustomCategory}
              isCreatingCollection={isCreatingCollection}
              setIsCreatingCollection={setIsCreatingCollection}
              newCollectionName={newCollectionName}
              setNewCollectionName={setNewCollectionName}
              currentCollectionId={currentCollectionId}
              setCurrentCollectionId={setCurrentCollectionId}
              currentCollection={currentCollection}
              promptCollections={promptCollections}
              isSelectMode={isSelectMode}
              setIsSelectMode={setIsSelectMode}
              selectedPromptIds={selectedPromptIds}
              setSelectedPromptIds={setSelectedPromptIds}
              deleteConfirmDialog={deleteConfirmDialog}
              setDeleteConfirmDialog={setDeleteConfirmDialog}
              filteredPrompts={filteredPrompts}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              openCreatePrompt={openCreatePrompt}
              savePrompt={savePrompt}
              selectAllPrompts={selectAllPrompts}
              createPromptMutation={createPromptMutation}
              updatePromptMutation={updatePromptMutation}
              createCollectionMutation={createCollectionMutation}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearchOpen={isSearchOpen}
              setIsSearchOpen={setIsSearchOpen}
            />
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
              <div className="max-w-4xl mx-auto relative">                {/* Modal de Prompts no CHAT - acoplado à barra de input */}
                {selectedConversationId && (
                  <PromptsModal
                    variant="anchored"
                    isOpen={isPromptsModalOpen}
                    onClose={() => setIsPromptsModalOpen(false)}
                    onSelectPrompt={(content) => setMessageInput(content)}
                    isCreatePromptOpen={isCreatePromptOpen}
                    setIsCreatePromptOpen={setIsCreatePromptOpen}
                    viewingPrompt={viewingPrompt}
                    setViewingPrompt={setViewingPrompt}
                    editingPromptId={editingPromptId}
                    setEditingPromptId={setEditingPromptId}
                    newPromptTitle={newPromptTitle}
                    setNewPromptTitle={setNewPromptTitle}
                    newPromptContent={newPromptContent}
                    setNewPromptContent={setNewPromptContent}
                    newPromptCategory={newPromptCategory}
                    setNewPromptCategory={setNewPromptCategory}
                    customCategory={customCategory}
                    setCustomCategory={setCustomCategory}
                    isCreatingCollection={isCreatingCollection}
                    setIsCreatingCollection={setIsCreatingCollection}
                    newCollectionName={newCollectionName}
                    setNewCollectionName={setNewCollectionName}
                    currentCollectionId={currentCollectionId}
                    setCurrentCollectionId={setCurrentCollectionId}
                    currentCollection={currentCollection}
                    promptCollections={promptCollections}
                    isSelectMode={isSelectMode}
                    setIsSelectMode={setIsSelectMode}
                    selectedPromptIds={selectedPromptIds}
                    setSelectedPromptIds={setSelectedPromptIds}
                    deleteConfirmDialog={deleteConfirmDialog}
                    setDeleteConfirmDialog={setDeleteConfirmDialog}
                    filteredPrompts={filteredPrompts}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                    openCreatePrompt={openCreatePrompt}
                    savePrompt={savePrompt}
                    selectAllPrompts={selectAllPrompts}
                    createPromptMutation={createPromptMutation}
                    updatePromptMutation={updatePromptMutation}
                    createCollectionMutation={createCollectionMutation}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isSearchOpen={isSearchOpen}
                    setIsSearchOpen={setIsSearchOpen}
                  />
                )}




                {/* Input Container */}
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


                    {/* 🎯 BADGE FLUTUANTE - Usando componente UploadProgress */}
                    {uploadState.isUploading && (
                      <div className="absolute -top-[90px] left-0 right-0 px-4 z-50 pointer-events-none">
                        <div className="bg-white rounded-xl border border-border shadow-lg p-3 max-w-md mx-auto pointer-events-auto">
                          <UploadProgress uploadState={uploadState} />
                        </div>
                      </div>
                    )}
                    {/* Badge do Processo/Arquivo - Usando componentes extraídos */}
                    {(uploadState.isUploading || attachedFiles.length > 0 || selectedProcessId) && (
                      <div className="flex-shrink-0 min-h-[80px] mb-3">
                        {uploadState.isUploading ? (
                          <UploadProgress uploadState={uploadState} />
                        ) : (
                          <AttachedFilesBadge
                            files={attachedFiles}
                            process={selectedProcessId ? {
                              id: selectedProcessId,
                              processNumber: processes?.find(p => p.id === selectedProcessId)?.processNumber || 'Processo anexado'
                            } : null}
                            onRemoveFile={(uri) => setAttachedFiles(prev => prev.filter(f => f.uri !== uri))}
                            onRemoveProcess={() => setSelectedProcessId(undefined)}
                          />
                        )}
                      </div>
                    )}

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
        <DeletePromptDialog
          isOpen={deleteConfirmDialog.isOpen}
          onClose={() => setDeleteConfirmDialog({ isOpen: false })}
          promptId={deleteConfirmDialog.promptId}
          promptIds={deleteConfirmDialog.promptIds}
          onConfirm={() => {
            if (deleteConfirmDialog.promptIds && deleteConfirmDialog.promptIds.length > 0) {
              deleteConfirmDialog.promptIds.forEach(id => deletePromptMutation.mutate({ id }));
              setSelectedPromptIds([]);
              setIsSelectMode(false);
            } else if (deleteConfirmDialog.promptId) {
              deletePromptMutation.mutate({ id: deleteConfirmDialog.promptId });
            }
            setDeleteConfirmDialog({ isOpen: false });
          }}
          isDeleting={deletePromptMutation.isPending}
        />

        {/* Modal de Edição de Minuta */}
        <EditDraftDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingMessageId(null);
            setEditedDraft("");
          }}
          draft={editedDraft}
          onDraftChange={setEditedDraft}
          draftType={draftType}
          onDraftTypeChange={(value) => setDraftType(value as DraftType)}
          onSave={handleSaveEditedDraft}
        />

        {/* Dialog de Renomear Conversa */}
        <RenameConversationDialog
          isOpen={isRenameDialogOpen}
          onClose={() => {
            setIsRenameDialogOpen(false);
            setRenamingConversationId(null);
            setNewConversationTitle("");
          }}
          currentTitle={newConversationTitle}
          onRename={(newTitle) => {
            if (renamingConversationId && newTitle.trim()) {
              renameConversationMutation.mutate({
                conversationId: renamingConversationId,
                title: newTitle.trim(),
              });
            }
          }}
          isRenaming={renameConversationMutation.isPending}
        />

        {/* Dialog de Seleção de Processo */}
        <ProcessSelectorDialog
          isOpen={isProcessSelectorOpen}
          onClose={() => setIsProcessSelectorOpen(false)}
          processes={processes}
          selectedProcessId={selectedProcessId}
          onSelectProcess={(process) => {
            setSelectedProcessId(process.id);
            if (selectedConversationId) {
              updateProcessMutation.mutate({
                conversationId: selectedConversationId,
                processId: process.id,
              });
              renameConversationMutation.mutate({
                conversationId: selectedConversationId,
                title: process.processNumber,
              });
            }
            setIsProcessSelectorOpen(false);
          }}
          onNavigateToProcesses={() => {
            setIsProcessSelectorOpen(false);
            setLocation("/processos");
          }}
        />

        {/* Dialog de Visualização de Dados do Processo */}
        <ProcessDataDialog
          isOpen={isProcessDataOpen}
          onClose={() => setIsProcessDataOpen(false)}
          process={processes?.find((p) => p.id === selectedProcessId)}
        />

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
                savedPrompts.map((prompt) => (
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
        <DeleteConversationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingConversationId(null);
          }}
          onConfirm={() => {
            if (deletingConversationId) {
              deleteConversationMutation.mutate({ id: deletingConversationId });
            }
          }}
          isDeleting={deleteConversationMutation.isPending}
        />

        {/* Dialog de Processo Duplicado */}
        <DuplicateProcessDialog
          isOpen={duplicateProcessDialog.isOpen}
          onClose={() => setDuplicateProcessDialog({ isOpen: false, processNumber: null, existingConversations: [] })}
          processNumber={duplicateProcessDialog.processNumber}
          existingConversations={duplicateProcessDialog.existingConversations}
          onNavigateToConversation={(conversationId) => {
            setSelectedConversationId(conversationId);
            setDuplicateProcessDialog({ isOpen: false, processNumber: null, existingConversations: [] });
            toast.info("Navegando para conversa existente...");
          }}
          onKeepHere={() => {
            setDuplicateProcessDialog({ isOpen: false, processNumber: null, existingConversations: [] });
            toast.success("Processo mantido nesta conversa.");
          }}
        />
      </div>

      {/* Modal de Arquivos Anexados */}
      <FilesModal
        isOpen={isFilesModalOpen}
        onClose={() => setIsFilesModalOpen(false)}
        attachedFiles={attachedFiles}
      />

    </DashboardLayout >
  );
}
