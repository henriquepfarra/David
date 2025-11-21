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
import { Loader2, Send, Plus, Trash2, FileText, Settings, BookMarked, X, Check, Edit, XCircle, ArrowLeft, Pencil } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

export default function David() {
  const [, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<number | undefined>();
  const [messageInput, setMessageInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
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

  // Carregar prompts salvos
  const { data: savedPrompts } = trpc.david.savedPrompts.list.useQuery();

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

  return (
    <div className="flex h-screen bg-background">
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
          <Button onClick={handleNewConversation} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conversa
          </Button>
        </div>

        <ScrollArea className="flex-1 p-2">
          {conversations?.map((conv) => (
            <Card
              key={conv.id}
              className={`p-3 mb-2 cursor-pointer hover:bg-accent transition-colors ${
                selectedConversationId === conv.id ? "bg-accent" : ""
              }`}
              onClick={() => setSelectedConversationId(conv.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
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
              </div>
            </Card>
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
                {isStreaming ? (
                  <Button
                    onClick={stopGeneration}
                    size="icon"
                    variant="destructive"
                    className="h-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    size="icon"
                    className="h-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
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
  );
}
