import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
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
import { Loader2, Send, Plus, Trash2, FileText, Settings, BookMarked, X, Check, Edit, XCircle, ArrowLeft, Pencil, Upload, MessageSquare, ChevronRight, Pin, PinOff } from "lucide-react";
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

export default function David() {
  const [, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<number | undefined>();
  const [messageInput, setMessageInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<number | null>(null);
  
  // Estados para funcionalidades do menu de ferramentas
  const [isProcessSelectorOpen, setIsProcessSelectorOpen] = useState(false);
  const [isProcessDataOpen, setIsProcessDataOpen] = useState(false);
  const [isUploadDocsOpen, setIsUploadDocsOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isPromptSelectorOpen, setIsPromptSelectorOpen] = useState(false);

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
        body: JSON.stringify({ conversationId, content }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Erro ao iniciar streaming");
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
    createConversationMutation.mutate({
      processId: selectedProcessId,
      title: selectedProcessId 
        ? `Conversa sobre processo ${processes?.find(p => p.id === selectedProcessId)?.processNumber}` 
        : "Nova conversa",
    });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || isStreaming) return;

    const userMessage = messageInput;
    setMessageInput("");
    
    // Iniciar streaming
    await streamMessage(selectedConversationId, userMessage);
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
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                title="Voltar para início"
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">DAVID</h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLocation("/david/config")}
              title="Configurações do DAVID"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleNewConversation} className="w-full" size="sm" disabled={isSelectionMode}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conversa
          </Button>
          
          {/* Botões de seleção múltipla */}
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedConversations(new Set());
              }} 
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              {isSelectionMode ? "Cancelar" : "Selecionar"}
            </Button>
            
            {isSelectionMode && (
              <>
                <Button 
                  onClick={toggleSelectAll} 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  {selectedConversations.size === conversations?.length ? "Desmarcar" : "Todas"}
                </Button>
                <Button 
                  onClick={handleDeleteSelected} 
                  variant="destructive" 
                  size="sm"
                  disabled={selectedConversations.size === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 p-2">
          {conversations?.map((conv) => (
            <ContextMenu key={conv.id}>
              <ContextMenuTrigger asChild>
                <Card
                  className={`p-3 mb-2 cursor-pointer hover:bg-accent transition-colors ${
                    selectedConversationId === conv.id ? "bg-accent" : ""
                  } ${selectedConversations.has(conv.id) ? "ring-2 ring-primary" : ""}`}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleConversationSelection(conv.id);
                    } else {
                      setSelectedConversationId(conv.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    {isSelectionMode && (
                      <Checkbox 
                        checked={selectedConversations.has(conv.id)}
                        onCheckedChange={() => toggleConversationSelection(conv.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {conv.isPinned === 1 && (
                          <Pin className="h-3 w-3 text-primary" />
                        )}
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.updatedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    
                    {!isSelectionMode && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Renomear conversa"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingConversationId(conv.id);
                            setNewConversationTitle(conv.title);
                            setIsRenameDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          title="Deletar conversa"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingConversationId(conv.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </ContextMenuTrigger>
              
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => togglePinMutation.mutate({ id: conv.id })}
                >
                  {conv.isPinned === 1 ? (
                    <>
                      <PinOff className="h-4 w-4 mr-2" />
                      Desafixar
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 mr-2" />
                      Fixar
                    </>
                  )}
                </ContextMenuItem>
                
                <ContextMenuItem
                  onClick={() => {
                    setRenamingConversationId(conv.id);
                    setNewConversationTitle(conv.title);
                    setIsRenameDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Renomear
                </ContextMenuItem>
                
                <ContextMenuSeparator />
                
                <ContextMenuItem
                  onClick={() => {
                    setDeletingConversationId(conv.id);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </ScrollArea>
      </div>

      {/* Área Principal - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Header com seletor de processo */}
            <div className="p-4 border-b flex items-center gap-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <Select
                value={conversationData?.conversation.processId?.toString() || "none"}
                onValueChange={(value) => {
                  const processId = value === "none" ? null : parseInt(value);
                  setSelectedProcessId(processId || undefined);
                  
                  // Atualizar processo da conversa no backend
                  if (selectedConversationId) {
                    updateProcessMutation.mutate({
                      conversationId: selectedConversationId,
                      processId,
                    });
                  }
                }}
              >
                <SelectTrigger className="w-[400px]">
                  <SelectValue placeholder="Selecione um processo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum processo selecionado</SelectItem>
                  {processes?.map((process) => (
                    <SelectItem key={process.id} value={process.id.toString()}>
                      {process.processNumber} - {process.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conversationData?.processData && (
                <div className="text-sm text-muted-foreground">
                  Autor: {conversationData.processData.plaintiff} vs {conversationData.processData.defendant}
                </div>
              )}
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4 max-w-4xl mx-auto">
                {conversationData?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <Card
                      className={`p-4 max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <>
                          <Streamdown>{message.content}</Streamdown>
                          
                          {/* Botões de aprovação (apenas para mensagens do assistente) */}
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

            {/* Input de mensagem */}
            <div className="p-4 border-t">
              <div className="max-w-4xl mx-auto space-y-2">
                {/* Botão de prompts salvos */}
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <BookMarked className="h-4 w-4 mr-2" />
                        Usar Prompt Salvo
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Prompts Salvos</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {savedPrompts && savedPrompts.length > 0 ? (
                        savedPrompts.map((prompt: any) => (
                          <DropdownMenuItem
                            key={prompt.id}
                            onClick={() => {
                              setMessageInput(prompt.content);
                              toast.success(`Prompt "${prompt.title}" aplicado`);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{prompt.title}</span>
                              {prompt.category && (
                                <span className="text-xs text-muted-foreground">
                                  {prompt.category}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>
                          Nenhum prompt salvo
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex gap-2">
                  <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
                  className="resize-none"
                  rows={3}
                  disabled={isStreaming}
                />
                <div className="flex flex-col gap-2">
                  <ToolsMenu
                    onSelectProcess={() => {
                      setIsProcessSelectorOpen(true);
                    }}
                    onViewProcessData={() => {
                      if (!selectedProcessId) {
                        toast.error("Nenhum processo selecionado");
                        return;
                      }
                      setIsProcessDataOpen(true);
                    }}
                    onUploadDocuments={() => {
                      if (!selectedProcessId) {
                        toast.error("Selecione um processo primeiro");
                        return;
                      }
                      setIsUploadDocsOpen(true);
                    }}
                    onSelectPrompt={() => {
                      setIsPromptSelectorOpen(true);
                    }}
                    onSearchPrecedents={() => {
                      if (!selectedProcessId) {
                        toast.error("Selecione um processo primeiro");
                        return;
                      }
                      // Redirecionar para página de Memória com filtro do processo atual
                      setLocation("/memoria");
                      toast.info("🔍 Buscando casos similares ao processo atual...");
                    }}
                    onViewMemory={() => {
                      setLocation("/memoria");
                    }}
                    onUploadKnowledge={() => {
                      setLocation("/base-conhecimento");
                    }}
                    onManageKnowledge={() => {
                      setLocation("/base-conhecimento");
                    }}
                  />
                  {isStreaming ? (
                    <Button
                      onClick={stopGeneration}
                      size="icon"
                      variant="destructive"
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      size="icon"
                      className="h-9 w-9"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Bem-vindo ao DAVID</h2>
              <p className="text-muted-foreground mb-6">
                Seu assistente jurídico inteligente para análise de processos e geração de minutas
              </p>
              <Button onClick={handleNewConversation} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Iniciar Nova Conversa
              </Button>
            </div>
          </div>
        )}
      </div>
      
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
      </Dialog>

      {/* Dialog de Renomear Conversa */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
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
      </Dialog>

      {/* Dialog de Seleção de Processo */}
      <Dialog open={isProcessSelectorOpen} onOpenChange={setIsProcessSelectorOpen}>
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
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedProcessId === process.id
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
      </Dialog>

      {/* Dialog de Visualização de Dados do Processo */}
      <Dialog open={isProcessDataOpen} onOpenChange={setIsProcessDataOpen}>
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
      </Dialog>

      {/* Dialog de Upload de Documentos */}
      <Dialog open={isUploadDocsOpen} onOpenChange={setIsUploadDocsOpen}>
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
      </Dialog>

      {/* Dialog de Seleção de Prompt */}
      <Dialog open={isPromptSelectorOpen} onOpenChange={setIsPromptSelectorOpen}>
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
      </Dialog>

      {/* Dialog de Confirmação de Deletar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
      </Dialog>
      </div>
    </DashboardLayout>
  );
}
