import { useState, useRef, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Plus, Trash2, FileText, Settings, BookMarked, X, Check, Edit, XCircle, ArrowLeft, Pencil, Upload, MessageSquare, ChevronRight, Pin, PinOff, Gavel, Brain, Mic, Wand2 } from "lucide-react";




import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

export default function David() {
  const [, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<number | undefined>();
  const [messageInput, setMessageInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousConversationIdRef = useRef<number | null>(null);

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

  // Carregar prompts salvos
  const { data: savedPrompts } = trpc.david.savedPrompts.list.useQuery();

  // Mutation para upload de documentos
  const uploadDocMutation = trpc.processDocuments.upload.useMutation();

  // Queries
  const { data: conversations, refetch: refetchConversations } = trpc.david.listConversations.useQuery();
  const { data: processes } = trpc.processes.list.useQuery();
  const { data: conversationData, refetch: refetchMessages } = trpc.david.getConversation.useQuery(
    { id: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  // Mutations
  const createConversationMutation = trpc.david.createConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.id);
      refetchConversations();
      toast.success("Nova conversa criada");
    },
  });

  const utils = trpc.useUtils();

  const updateProcessMutation = trpc.david.updateConversationProcess.useMutation({
    onSuccess: () => {
      refetchMessages();
      toast.success("Processo vinculado à conversa");
    },
    onError: (error) => {
      toast.error("Erro ao vincular processo: " + error.message);
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
    }
    // Atualiza referência
    previousConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

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
              setStreamingMessage((prev) => prev + data.content);
            } else if (data.type === "done") {
              setIsStreaming(false);
              setStreamingMessage("");
              refetchMessages();
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationData?.messages, streamingMessage]);

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setSelectedProcessId(undefined);
    setMessageInput("");
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isStreaming) return;

    const userMessage = messageInput;
    setMessageInput("");

    // Se não tiver conversa selecionada, cria uma nova primeiro
    if (!selectedConversationId) {
      // Otimisticamente mostra loading ou algo, mas aqui vamos esperar a criação
      createConversationMutation.mutate({
        processId: selectedProcessId,
        title: "Nova Conversa" // O backend ou usuário pode renomear depois
      }, {
        onSuccess: async (newConv) => {
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
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4 max-w-4xl mx-auto">
                {conversationData?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <Card
                      className={`p-4 max-w-[80%] ${message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                        }`}
                    >
                      {message.role === "assistant" ? (
                        <>
                          <Streamdown>{message.content}</Streamdown>

                          {/* Botões de aprovação (apenas para minutas - detecta por palavras-chave) */}
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
                              <p className="text-xs opacity-70 mt-2">
                                {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                              </p>
                            );

                            return (
                              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                                <p className="text-xs opacity-70 flex-1">
                                  {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5"
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
                                  Editar e Aprovar
                                </Button>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {new Date(message.createdAt).toLocaleTimeString("pt-BR")}
                          </p>
                        </>
                      )}
                    </Card>
                  </div>
                ))}

                {/* Mensagem em streaming */}
                {isStreaming && streamingMessage && (
                  <div className="flex justify-start">
                    <Card className="p-4 max-w-[80%] bg-muted">
                      <Streamdown>{streamingMessage}</Streamdown>
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <p className="text-xs opacity-70">Gerando...</p>
                      </div>
                    </Card>
                  </div>
                )}
                {isStreaming && (
                  <div className="flex justify-start">
                    <Card className="p-4 bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            // Hero / Estado Vazio
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
              <div className="max-w-md space-y-6">
                <div className="mb-4">
                  <img src="/logo.png" alt="DAVID" className="h-80 w-80 object-contain mx-auto" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-primary">
                    Bem-vindo ao DAVID
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Seu assistente jurídico inteligente para análise de processos e geração de minutas
                  </p>
                </div>
              </div>

            </div>

          )}

          {/* Área global de Drag & Drop oculta (input) */}
          <div {...getRootProps()} className="outline-none">
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
              <div className="max-w-4xl mx-auto border rounded-[2rem] p-4 relative shadow-sm bg-card transition-all focus-within:ring-1 focus-within:ring-primary/50">

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
                    className="border-0 shadow-none resize-none min-h-[60px] w-full p-0 pr-10 focus-visible:ring-0 bg-transparent text-lg placeholder:text-muted-foreground/50"
                    style={{ maxHeight: "200px" }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary absolute top-0 right-0 transition-colors"
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

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 rounded-full h-9 px-3 text-muted-foreground hover:text-primary">
                          <BookMarked className="h-4 w-4" />
                          Prompts
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Prompts Salvos</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {savedPrompts && savedPrompts.length > 0 ? (
                          savedPrompts.map((prompt: any) => (
                            <DropdownMenuItem
                              key={prompt.id}
                              onClick={() => setMessageInput(prompt.content)}
                              className="cursor-pointer"
                            >
                              <span className="truncate">{prompt.title}</span>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhum prompt salvo.
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

              {/* Footer Texto */}
              <div className="text-center mt-2">
                <p className="text-xs text-muted-foreground">O DAVID pode cometer erros. Considere verificar as informações importantes.</p>
              </div>
            </div>
          </div >



        </div >

        {/* Modal de Edição de Minuta */}
        < Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} >
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
      </div >
    </DashboardLayout >
  );
}
