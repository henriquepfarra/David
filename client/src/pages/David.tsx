import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { FEATURES } from "@/const";

import { useAuth } from "@/_core/hooks/useAuth";
import { useChatStream } from "@/hooks/useChatStream";
import { useConversationId } from "@/hooks/useConversationId";
import { usePdfUpload } from "@/hooks/usePdfUpload";
// useModuleState removido - módulo agora é config global
import { usePrompts } from "@/hooks/usePrompts";
import { useDavidMutations } from "@/hooks/useDavidMutations";
import { MessageList, ChatInputArea } from "@/components/chat";
import { HomeScreen } from "@/components/HomeScreen";
import { PromptsModal } from "@/components/prompts";
// ModuleHeader removido - módulo agora é config global em Settings
import {
  DeletePromptDialog,
  EditDraftDialog,
  RenameConversationDialog,
  DeleteConversationDialog,
  FilesModal,
  ProcessSelectorDialog,
  ProcessDataDialog,
  DuplicateProcessDialog,
  UploadDocsDialog,
  PromptSelectorDialog,
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

  // Módulo agora é config global em Settings, não por conversa

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
  const settings = trpc.settings.get.useQuery();
  const trpcUtils = trpc.useUtils();

  const selectModelMutation = trpc.settings.selectModel.useMutation({
    onSuccess: () => {
      trpcUtils.settings.get.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao trocar modelo: " + error.message);
    },
  });

  // 🔧 INTEGRADO: useDavidMutations hook substitui todas as mutations inline
  const {
    createConversationMutation,
    renameConversationMutation,
    deleteConversationMutation,
    togglePinMutation,
    deleteMultipleMutation,
    updateProcessMutation,
    generateTitleMutation,
    updateGoogleFileMutation,
    cleanupGoogleFileMutation,
    cleanupIfEmptyMutation,
    approveDraftMutation,
    applyPromptMutation,
    enhancePromptMutation,
    transcribeAudioMutation,
    uploadDocMutation,
  } = useDavidMutations({
    onConversationCreated: (data) => setSelectedConversationId(data.id),
    onConversationDeleted: () => {
      setSelectedConversationId(null);
      setIsDeleteDialogOpen(false);
      setDeletingConversationId(null);
    },
    onConversationRenamed: () => {
      setIsRenameDialogOpen(false);
      setRenamingConversationId(null);
      setNewConversationTitle("");
    },
    onConversationsRefetch: refetchConversations,
    onMessagesRefetch: refetchMessages,
    onSelectionCleared: () => setSelectedConversations(new Set()),
    onSelectionModeOff: () => setIsSelectionMode(false),
  });

  // Debug de erros de carregamento
  useEffect(() => {
    if (conversationError) {
      console.error("[David] Erro carregando conversa:", conversationError);
      toast.error("Erro ao carregar conversa. Tente recarregar a página.");
    }
  }, [conversationError]);

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
      // moduleSlug agora é pego pelo backend via userSettings
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

  // Smart auto-scroll: só scrolls se usuário está perto do fim
  // Isso permite que o usuário scrolle para cima para ver o thinking sem ser forçado para baixo
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const userHasScrolledUp = useRef(false);

  // Detectar se usuário scrollou para cima
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Se está a mais de 200px do fim, usuário scrollou para cima
      userHasScrolledUp.current = distanceFromBottom > 200;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll ao receber novas mensagens ou durante streaming
  // Só faz scroll se usuário NÃO scrollou manualmente para cima
  useEffect(() => {
    if (!userHasScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationData?.messages, streamingMessage, pendingUserMessage]);

  // Resetar flag de scroll quando nova mensagem é enviada
  useEffect(() => {
    if (pendingUserMessage) {
      userHasScrolledUp.current = false;
    }
  }, [pendingUserMessage]);

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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleEnhancePrompt = () => {
    if (!messageInput.trim()) return;
    enhancePromptMutation.mutate({ prompt: messageInput }, {
      onSuccess: (data) => {
        setMessageInput(data.content);
        toast.success("Prompt melhorado!");
        adjustTextareaHeight();
      },
    });
  };

  const handleTranscribeAudio = (base64Audio: string) => {
    transcribeAudioMutation.mutate({ audio: base64Audio }, {
      onSuccess: (data) => {
        setMessageInput((prev) => (prev ? prev + " " : "") + data.text);
        if (textareaRef.current) {
          textareaRef.current.focus();
          adjustTextareaHeight();
        }
      },
    });
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
            handleTranscribeAudio(base64Audio);
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


          {/* Header minimalista */}
          <div className="p-2 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            {/* Módulo agora é config global em Settings */}
          </div>

          {selectedConversationId ? (
            <div className="flex-1 min-h-0 relative">
              <div ref={chatContainerRef} className="h-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="space-y-4 max-w-4xl mx-auto pb-4">

                  <MessageList
                    messages={conversationData?.messages || []}
                    pendingUserMessage={pendingUserMessage}
                    isStreaming={isStreaming}
                    parsedStreaming={parsedStreaming}
                    statusMessage={statusMessage}
                    onApproveDraft={handleApproveDraft}
                    onEditDraft={handleEditAndApprove}
                    messagesEndRef={messagesEndRef}
                    processNumber={
                      selectedProcessId
                        ? conversationData?.processData?.processNumber ||
                        processes?.find((p) => p.id === selectedProcessId)?.processNumber ||
                        "Carregando..."
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            // HOME - Estado sem conversa selecionada (Estilo Gemini)
            <HomeScreen
              userName={user?.name?.split(' ')[0] || 'Usuário'}
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              onSendMessage={handleSendMessage}
              onOpenUpload={open}
              onOpenPrompts={() => setIsPromptsModalOpen(true)}
              onOpenFiles={() => setIsFilesModalOpen(true)}
              onOpenSettings={() => setLocation("/settings")}
              uploadState={uploadState}
              attachedFiles={attachedFiles}
              onRemoveFile={(uri) => setAttachedFiles(prev => prev.filter(f => f.uri !== uri))}
              isRecording={isRecording}
              onRecordClick={handleRecordClick}
              isTranscribing={transcribeAudioMutation.isPending}
              isCreatingConversation={createConversationMutation.isPending}
              isStreaming={isStreaming}
              showMicButton={FEATURES.AUDIO_TRANSCRIPTION}
              llmModel={settings.data?.llmModel}
              llmProvider={settings.data?.llmProvider}
              onSelectModel={(curatedModelId) => selectModelMutation.mutate({ curatedModelId })}
              isSelectingModel={selectModelMutation.isPending}
            />
          )}

          {/* Modal de Prompts - Na HOME aparece centralizado */}
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
              <div className="max-w-4xl mx-auto relative">
                {/* Modal de Prompts no CHAT - acoplado à barra de input */}
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

                <ChatInputArea
                  // Input
                  messageInput={messageInput}
                  setMessageInput={setMessageInput}
                  onSendMessage={handleSendMessage}
                  isProcessing={isProcessing}
                  // Upload
                  openUpload={open}
                  uploadState={uploadState}
                  // Files
                  attachedFiles={attachedFiles}
                  onRemoveFile={(uri) => setAttachedFiles(prev => prev.filter(f => f.uri !== uri))}
                  selectedProcessId={selectedProcessId}
                  processNumber={processes?.find(p => p.id === selectedProcessId)?.processNumber}
                  onRemoveProcess={() => setSelectedProcessId(undefined)}
                  // Prompts Modal
                  isPromptsModalOpen={isPromptsModalOpen}
                  setIsPromptsModalOpen={setIsPromptsModalOpen}
                  // Create/Edit Prompt
                  isCreatePromptOpen={isCreatePromptOpen}
                  setIsCreatePromptOpen={setIsCreatePromptOpen}
                  newPromptTitle={newPromptTitle}
                  setNewPromptTitle={setNewPromptTitle}
                  newPromptContent={newPromptContent}
                  setNewPromptContent={setNewPromptContent}
                  newPromptCategory={newPromptCategory}
                  setNewPromptCategory={setNewPromptCategory}
                  customCategory={customCategory}
                  setCustomCategory={setCustomCategory}
                  editingPromptId={editingPromptId}
                  setEditingPromptId={setEditingPromptId}
                  onCreatePrompt={() => {
                    let finalCategory: string | undefined = undefined;
                    if (newPromptCategory === "__new__") {
                      finalCategory = customCategory.trim() || undefined;
                    } else if (newPromptCategory !== "none") {
                      finalCategory = newPromptCategory;
                    }
                    createPromptMutation.mutate({
                      title: newPromptTitle.trim(),
                      content: newPromptContent.trim(),
                      category: finalCategory,
                    });
                  }}
                  onUpdatePrompt={() => {
                    let finalCategory: string | undefined = undefined;
                    if (newPromptCategory === "__new__") {
                      finalCategory = customCategory.trim() || undefined;
                    } else if (newPromptCategory !== "none") {
                      finalCategory = newPromptCategory;
                    }
                    if (editingPromptId) {
                      updatePromptMutation.mutate({
                        id: editingPromptId,
                        title: newPromptTitle.trim(),
                        content: newPromptContent.trim(),
                        category: finalCategory,
                      });
                    }
                  }}
                  isCreatingPrompt={createPromptMutation.isPending}
                  isUpdatingPrompt={updatePromptMutation.isPending}
                  // Viewing Prompt
                  viewingPrompt={viewingPrompt}
                  setViewingPrompt={setViewingPrompt}
                  onDeletePromptRequest={(promptId) => setDeleteConfirmDialog({ isOpen: true, promptId })}
                  // Audio
                  isRecording={isRecording}
                  onRecordClick={handleRecordClick}
                  isTranscribing={transcribeAudioMutation.isPending}
                  showMicButton={FEATURES.AUDIO_TRANSCRIPTION}
                  // Enhance
                  onEnhancePrompt={handleEnhancePrompt}
                  isEnhancing={enhancePromptMutation.isPending}
                  // Settings
                  llmModel={settings.data?.llmModel}
                  llmProvider={settings.data?.llmProvider}
                  onSelectModel={(curatedModelId) => selectModelMutation.mutate({ curatedModelId })}
                  isSelectingModel={selectModelMutation.isPending}
                />

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
        <UploadDocsDialog
          isOpen={isUploadDocsOpen}
          onClose={() => setIsUploadDocsOpen(false)}
          processId={selectedProcessId}
          onUploadFiles={async (files) => {
            if (!selectedProcessId) {
              toast.error("Nenhum processo selecionado");
              return;
            }

            for (const file of files) {
              try {
                // Ler arquivo como base64
                const reader = new FileReader();
                const fileData = await new Promise<string>((resolve, reject) => {
                  reader.onload = () => {
                    const base64 = reader.result as string;
                    resolve(base64.split(',')[1]);
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });

                const fileType = file.name.split('.').pop() || 'txt';
                await uploadDocMutation.mutateAsync({
                  processId: selectedProcessId,
                  fileName: file.name,
                  fileData,
                  fileType,
                  documentType: 'outro',
                });

                toast.success(`${file.name} enviado com sucesso!`);
              } catch (error) {
                console.error('Erro no upload:', error);
                toast.error(`Erro ao enviar ${file.name}`);
                throw error;
              }
            }
          }}
        />

        {/* Dialog de Seleção de Prompt */}
        <PromptSelectorDialog
          isOpen={isPromptSelectorOpen}
          onClose={() => setIsPromptSelectorOpen(false)}
          prompts={savedPrompts}
          onSelectPrompt={(prompt) => {
            applyPromptMutation.mutate({
              conversationId: selectedConversationId!,
              promptId: prompt.id,
            });
            setIsPromptSelectorOpen(false);
          }}
          onNavigateToPrompts={() => setLocation("/prompts")}
        />

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
