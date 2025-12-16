import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, Save, Upload, Edit, Trash2, RefreshCw, Key, Brain, BookOpen, Database, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_DAVID_SYSTEM_PROMPT } from "@shared/defaultPrompts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Configuracoes() {
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<any>(null);

  // API Keys states
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmProvider, setLlmProvider] = useState("google");
  const [llmModel, setLlmModel] = useState("");
  const [openaiEmbeddingsKey, setOpenaiEmbeddingsKey] = useState(""); // State para chave de embeddings
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState("");

  const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery();
  const { data: knowledgeDocs, isLoading: docsLoading } = trpc.knowledgeBase.list.useQuery();
  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("System Prompt salvo com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const updateDocMutation = trpc.knowledgeBase.update.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      toast.success("Documento atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingDoc(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar documento: " + error.message);
    },
  });

  const deleteDocMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      toast.success("Documento deletado com sucesso!");
      setIsDeleteDialogOpen(false);
      setDocToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar documento: " + error.message);
    },
  });

  useEffect(() => {
    if (settings) {
      // Carregar o prompt customizado OU o prompt padrão
      setCustomSystemPrompt(settings.customSystemPrompt || DEFAULT_DAVID_SYSTEM_PROMPT);
      setLlmApiKey(settings.llmApiKey || "");
      setLlmProvider(settings.llmProvider || "google");
      setLlmModel(settings.llmModel || "");
      setOpenaiEmbeddingsKey(settings.openaiEmbeddingsKey || "");

      // Carregar modelos se já tiver API key
      if (settings.llmApiKey && settings.llmProvider) {
        loadModels(settings.llmProvider, settings.llmApiKey);
      }
    }
  }, [settings]);

  const loadModels = async (provider: string, apiKey: string) => {
    if (!apiKey || apiKey.length < 10) {
      setModelsError("Insira uma chave de API válida");
      return;
    }
    setIsLoadingModels(true);
    setModelsError("");

    try {
      const models = await utils.client.settings.listModels.query({
        provider,
        apiKey,
      });

      setAvailableModels(models);

      if (models.length === 0) {
        setModelsError("Nenhum modelo disponível");
      } else {
        toast.success(`${models.length} modelos carregados`);
      }
    } catch (error: any) {
      setModelsError("Falha ao carregar modelos. Usando lista padrão.");
      console.error("Erro ao carregar modelos:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    setLlmProvider(newProvider);
    setLlmModel("");
    setAvailableModels([]);
    setModelsError("");
  };

  const handleApiKeyChange = (newApiKey: string) => {
    setLlmApiKey(newApiKey);
    setAvailableModels([]);
    setModelsError("");
  };

  // Auto-load models when API Key is present/changed (Debounced)
  useEffect(() => {
    if (!llmApiKey || llmApiKey.length < 10) return;

    const timer = setTimeout(() => {
      handleLoadModels();
    }, 1000); // 1.5s delay to allow finish typing

    return () => clearTimeout(timer);
  }, [llmApiKey, llmProvider]);

  const handleLoadModels = () => {
    if (!llmApiKey) {
      toast.error("Insira a chave de API primeiro");
      return;
    }
    loadModels(llmProvider, llmApiKey);
  };

  const handleSaveApiKeys = () => {
    // Permitir salvar sem API key (usar LLM nativa)
    if (llmApiKey && !llmModel) {
      toast.error("Selecione um modelo");
      return;
    }

    updateSettingsMutation.mutate({
      llmApiKey: llmApiKey || undefined,
      llmProvider,
      llmModel: llmModel || undefined,
      openaiEmbeddingsKey: openaiEmbeddingsKey || undefined,
    });
  };

  const handleSaveSystemPrompt = () => {
    updateSettingsMutation.mutate({
      customSystemPrompt,
    });
  };

  const handleEditDoc = (doc: any) => {
    setEditingDoc(doc);
    setEditedContent(doc.content);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingDoc) return;
    updateDocMutation.mutate({
      id: editingDoc.id,
      content: editedContent,
    });
  };

  const handleDeleteDoc = (doc: any) => {
    setDocToDelete(doc);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!docToDelete) return;
    deleteDocMutation.mutate({ id: docToDelete.id });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as configurações do sistema e da base de conhecimento
          </p>
        </div>

        <Tabs defaultValue="system-prompt" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="system-prompt" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              System Prompt
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="knowledge-base" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Base de Conhecimento
            </TabsTrigger>
          </TabsList>

          {/* Aba System Prompt */}
          <TabsContent value="system-prompt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Instruções do DAVID
                </CardTitle>
                <CardDescription>
                  Personalize o comportamento e as instruções do assistente jurídico DAVID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="system-prompt">System Prompt do DAVID</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomSystemPrompt(DEFAULT_DAVID_SYSTEM_PROMPT)}
                      className="text-xs"
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Restaurar Padrão
                    </Button>
                  </div>
                  <Textarea
                    id="system-prompt"
                    placeholder="Edite as instruções do DAVID..."
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Edite o prompt do DAVID conforme necessário. Use o botão "Restaurar Padrão" para voltar ao prompt original.
                  </p>
                </div>

                <Button
                  onClick={handleSaveSystemPrompt}
                  disabled={updateSettingsMutation.isPending}
                  className="w-full"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Instruções
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba API Keys */}
          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Chaves de API
                </CardTitle>
                <CardDescription>
                  Configure suas chaves de API para integrações externas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-6">
                  {/* Explicação Didática */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold flex items-center gap-2 mb-2 text-primary">
                      <Brain className="h-4 w-4" />
                      Como funciona o Cérebro do DAVID?
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground mb-1">🧠 Cérebro (Raciocínio)</p>
                        <p>É o modelo de IA que "pensa" e escreve as respostas. Você pode usar modelos potentes (ex: <strong>GPT 5.2, Gemini 3, Claude 4.5 Sonnet</strong>) ou opções rápidas.</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">📚 Memória (Embeddings)</p>
                        <p>É a tecnologia que permite ao DAVID "ler" seus PDFs. Atualmente requer uma chave da <strong>OpenAI</strong>, mas estamos trabalhando para torná-la flexível.</p>
                      </div>
                    </div>
                  </div>

                  {/* Indicador de Status */}
                  {!llmApiKey ? (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <strong>Modo Nativo (Manus)</strong>
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 ml-4">
                        Você está usando a estrutura padrão. Configure abaixo para usar seu próprio cérebro.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <p className="text-sm text-green-900 dark:text-green-100 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        <strong>Provedor Ativo: {llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1)}</strong>
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1 ml-4 flex items-center gap-2">
                        Modelo selecionado: <Badge variant="outline" className="bg-green-100 dark:bg-green-900 border-green-300">{llmModel || "Automático"}</Badge>
                      </p>
                    </div>
                  )}

                  <hr className="border-border/50" />

                  {/* Configuração do Cérebro (LLM) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        1. Escolha seu Cérebro (LLM)
                      </Label>

                      {/* Links Dinâmicos por Provedor */}
                      {llmProvider === 'groq' && (
                        <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-xs text-violet-500 hover:underline flex items-center gap-1">
                          Obter Chave Grátis (Groq) <Upload className="h-3 w-3 rotate-45" />
                        </a>
                      )}
                      {llmProvider === 'google' && (
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          Obter Chave (Google AI Studio) <Upload className="h-3 w-3 rotate-45" />
                        </a>
                      )}
                      {llmProvider === 'openai' && (
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-green-500 hover:underline flex items-center gap-1">
                          Obter Chave (OpenAI) <Upload className="h-3 w-3 rotate-45" />
                        </a>
                      )}
                      {llmProvider === 'anthropic' && (
                        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                          Obter Chave (Anthropic) <Upload className="h-3 w-3 rotate-45" />
                        </a>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="provider" className="text-xs text-muted-foreground">Provedor</Label>
                        <Select value={llmProvider} onValueChange={handleProviderChange}>
                          <SelectTrigger id="provider" className="font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google">Google (Gemini)</SelectItem>
                            <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                            <SelectItem value="groq" className="font-bold text-violet-500">Groq (Recomendado/Rápido)</SelectItem>
                            <SelectItem value="deepseek" className="font-bold text-blue-600">DeepSeek (Custo-Benefício)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiKey" className="text-xs text-muted-foreground">Chave de API (Secret Key)</Label>
                        <div className="relative">
                          <Input
                            id="apiKey"
                            type="password"
                            value={llmApiKey}
                            onChange={(e) => handleApiKeyChange(e.target.value)}
                            placeholder={llmProvider === 'groq' ? "gsk_..." : "sk-..."}
                            className="pr-10"
                          />
                          <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="model" className="text-xs text-muted-foreground">Modelo de Raciocínio</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleLoadModels}
                          disabled={isLoadingModels || !llmApiKey}
                          className="h-6 text-xs"
                        >
                          {isLoadingModels ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          Atualizar Lista
                        </Button>
                      </div>

                      {modelsError ? (
                        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">{modelsError}</div>
                      ) : (
                        <Select value={llmModel} onValueChange={setLlmModel}>
                          <SelectTrigger id="model">
                            <SelectValue placeholder={availableModels.length > 0 ? "Selecione o modelo..." : "Insira a chave para carregar modelos"} />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Curated or Filtered List Logic could go here, for now showing all but styled */}
                            {availableModels.length > 0 ? (
                              availableModels.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-xs text-muted-foreground text-center">Nenhum modelo carregado</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        * Modelos recomendados: <strong>llama-3.1-70b</strong> (Groq), <strong>gemini-1.5-flash</strong> (Google), <strong>gpt-4o</strong> (OpenAI).
                      </p>
                    </div>
                  </div>

                  <hr className="border-border/50" />

                  {/* Configuração da Memória (Embeddings) */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4 text-orange-500" />
                        2. Configurar Memória (RAG)
                      </Label>
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        Obter Chave OpenAI <Upload className="h-3 w-3 rotate-45" />
                      </a>
                    </div>

                    {!openaiEmbeddingsKey ? (
                      <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg border border-orange-100 dark:border-orange-900/50 text-xs text-orange-800 dark:text-orange-200 mb-2">
                        ⚠️ <strong>Importante:</strong> Para que o DAVID leia seus PDFs e processos, ele precisa de uma chave da <strong>OpenAI</strong> (mesmo que você use Groq/Google para o cérebro). Isso é necessário para gerar os "vetores" de memória.
                      </div>
                    ) : (
                      <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-100 dark:border-green-900/50 text-xs text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        <strong>Memória Ativa:</strong> Chave de Embeddings configurada com sucesso.
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="embeddingsKey" className="text-xs text-muted-foreground">Chave OpenAI para Embeddings</Label>
                      <div className="relative">
                        <Input
                          id="embeddingsKey"
                          type="password"
                          value={openaiEmbeddingsKey}
                          onChange={(e) => setOpenaiEmbeddingsKey(e.target.value)}
                          placeholder="sk-..."
                          className={`pr-10 ${openaiEmbeddingsKey?.startsWith('sk-') ? 'border-green-500 ring-green-500/20' : 'border-orange-200 dark:border-orange-900'}`}
                        />
                        {openaiEmbeddingsKey?.startsWith('sk-') ? (
                          <Check className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                        ) : (
                          <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                <Button
                  onClick={handleSaveApiKeys}
                  disabled={updateSettingsMutation.isPending}
                  className="w-full"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Base de Conhecimento */}
          <TabsContent value="knowledge-base">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Gerenciar Base de Conhecimento
                </CardTitle>
                <CardDescription>
                  Visualize, edite e gerencie os documentos da base de conhecimento do DAVID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {knowledgeDocs?.length || 0} documentos na base
                  </p>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Adicionar Documento
                  </Button>
                </div>

                {docsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-4">Carregando documentos...</p>
                  </div>
                ) : knowledgeDocs && knowledgeDocs.length > 0 ? (
                  <div className="space-y-3">
                    {knowledgeDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold truncate">{doc.title}</h3>
                              <Badge
                                variant={doc.source === "sistema" ? "default" : "secondary"}
                                className={doc.source === "sistema"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700"
                                }
                              >
                                {doc.source === "sistema" ? "Sistema" : "Usuário"}
                              </Badge>
                              {doc.documentType && (
                                <Badge variant="outline" className="text-xs">
                                  {doc.documentType}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {doc.content.substring(0, 200)}...
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {doc.content.length.toLocaleString()} caracteres
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDoc(doc)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDoc(doc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum documento na base de conhecimento</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Editar Documento</DialogTitle>
              <DialogDescription>
                {editingDoc?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {editedContent.length.toLocaleString()} caracteres
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateDocMutation.isPending}>
                {updateDocMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Deleção */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Deleção</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja deletar o documento "{docToDelete?.title}"?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteDocMutation.isPending}
              >
                {deleteDocMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
