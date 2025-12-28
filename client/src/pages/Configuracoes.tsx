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
  const [readerApiKey, setReaderApiKey] = useState("");
  const [readerModel, setReaderModel] = useState("gemini-2.0-flash-lite");
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState("");

  // Track original values for "has changes" detection
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [originalApiSettings, setOriginalApiSettings] = useState<{
    llmApiKey: string;
    llmProvider: string;
    llmModel: string;
    readerApiKey: string;
    readerModel: string;
  } | null>(null);

  const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery();
  const { data: knowledgeDocs, isLoading: docsLoading } = trpc.knowledgeBase.list.useQuery();
  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
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
      const prompt = settings.customSystemPrompt || DEFAULT_DAVID_SYSTEM_PROMPT;
      setCustomSystemPrompt(prompt);
      setOriginalPrompt(prompt);

      const apiKey = settings.llmApiKey || "";
      const provider = settings.llmProvider || "google";
      const model = settings.llmModel || "";
      const rApiKey = settings.readerApiKey || "";
      const rModel = settings.readerModel || "gemini-2.0-flash";

      setLlmApiKey(apiKey);
      setLlmProvider(provider);
      setLlmModel(model);
      setReaderApiKey(rApiKey);
      setReaderModel(rModel);

      setOriginalApiSettings({
        llmApiKey: apiKey,
        llmProvider: provider,
        llmModel: model,
        readerApiKey: rApiKey,
        readerModel: rModel,
      });

      // Carregar modelos se já tiver API key (silenciosamente, sem toast)
      if (settings.llmApiKey && settings.llmProvider) {
        loadModels(settings.llmProvider, settings.llmApiKey, true);
      }
    }
  }, [settings]);

  const loadModels = async (provider: string, apiKey: string, silent = false) => {
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
      } else if (!silent) {
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

  // Auto-load models when API Key is present/changed (Debounced, silent)
  useEffect(() => {
    if (!llmApiKey || llmApiKey.length < 10) return;
    // Só auto-carregar se a key mudou do original
    if (originalApiSettings?.llmApiKey === llmApiKey && originalApiSettings?.llmProvider === llmProvider) return;

    const timer = setTimeout(() => {
      loadModels(llmProvider, llmApiKey, true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [llmApiKey, llmProvider, originalApiSettings]);

  // Computed: has prompt changed?
  const hasPromptChanged = customSystemPrompt !== originalPrompt;

  // Computed: has API settings changed?
  const hasApiSettingsChanged = originalApiSettings ? (
    llmApiKey !== originalApiSettings.llmApiKey ||
    llmProvider !== originalApiSettings.llmProvider ||
    llmModel !== originalApiSettings.llmModel ||
    readerApiKey !== originalApiSettings.readerApiKey ||
    readerModel !== originalApiSettings.readerModel
  ) : false;

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

    updateSettingsMutation.mutate(
      {
        llmApiKey: llmApiKey || undefined,
        llmProvider,
        llmModel: llmModel || undefined,
        readerApiKey: readerApiKey || undefined,
        readerModel: readerModel || undefined,
      },
      {
        onSuccess: () => {
          // Atualizar valores originais após salvar
          setOriginalApiSettings({
            llmApiKey,
            llmProvider,
            llmModel,
            readerApiKey,
            readerModel,
          });
          toast.success("Configurações de API salvas!");
        },
      }
    );
  };

  const handleSaveSystemPrompt = () => {
    updateSettingsMutation.mutate(
      {
        customSystemPrompt,
      },
      {
        onSuccess: () => {
          setOriginalPrompt(customSystemPrompt);
          toast.success("Instruções salvas com sucesso!");
        },
      }
    );
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

        <Tabs defaultValue="personalizacao" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="personalizacao" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Personalização do Assistente
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Chaves de API
            </TabsTrigger>
          </TabsList>

          {/* Aba Personalização do Assistente - Layout 2 Colunas */}
          <TabsContent value="personalizacao">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda: Instruções */}
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Brain className="h-4 w-4" />
                      🧠 Instruções do DAVID
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomSystemPrompt(DEFAULT_DAVID_SYSTEM_PROMPT)}
                      className="text-xs h-7"
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Restaurar
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Defina como o DAVID deve se comportar e responder
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <Textarea
                    id="system-prompt"
                    placeholder="Edite as instruções do DAVID..."
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    className="font-mono text-xs flex-1 resize-none min-h-0"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSystemPrompt}
                      disabled={updateSettingsMutation.isPending || !hasPromptChanged}
                      size="sm"
                    >
                      {updateSettingsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-3 w-3" />
                          Salvar Instruções
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Coluna Direita: Base de Conhecimento */}
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4" />
                      📚 Base de Conhecimento
                    </CardTitle>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Upload className="mr-1 h-3 w-3" />
                      Adicionar
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    {knowledgeDocs?.length || 0} documentos que o DAVID usa para fundamentar respostas
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden pt-0">
                  {docsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : knowledgeDocs && knowledgeDocs.length > 0 ? (
                    <div className="space-y-2 overflow-y-auto h-full pr-1">
                      {knowledgeDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="border rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <h3 className="font-medium truncate text-sm">{doc.title}</h3>
                                <Badge
                                  variant="outline"
                                  className={doc.source === "sistema"
                                    ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 text-[9px] px-1 py-0"
                                    : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-[9px] px-1 py-0"
                                  }
                                >
                                  {doc.source === "sistema" ? "Sistema" : "Usuário"}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground line-clamp-1 ml-5">
                                {doc.content.substring(0, 80)}...
                              </p>
                            </div>
                            <div className="flex gap-0.5 flex-shrink-0">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditDoc(doc)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteDoc(doc)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <FileText className="h-10 w-10 mb-2 opacity-40" />
                      <p className="text-sm">Nenhum documento</p>
                      <p className="text-xs">Adicione documentos para o DAVID consultar</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba Chaves de API */}
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
                        <p>É o modelo de IA que "pensa" e escreve as respostas. Você pode usar modelos potentes (ex: <strong>GPT-4.1, Gemini 3, Claude Sonnet 4</strong>) ou opções rápidas.</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">📄 Leitura de Documentos</p>
                        <p>Permite que o DAVID <strong>leia seus PDFs na íntegra</strong> — textos, imagens, tabelas, prints de conversas. Tudo é analisado visualmente, como um humano faria.</p>
                      </div>
                    </div>
                  </div>

                  {/* Indicador de Status */}
                  {!llmApiKey ? (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <p className="text-sm text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <strong>Configuração Necessária</strong>
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 ml-4">
                        Configure sua chave de API para utilizar o DAVID. Escolha um provedor abaixo.
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
                        🧠 CÉREBRO (IA Principal)
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
                      {llmProvider === 'deepseek' && (
                        <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          Obter Chave (DeepSeek) <Upload className="h-3 w-3 rotate-45" />
                        </a>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="provider" className="text-xs text-muted-foreground">Provedor de IA</Label>
                        <Select value={llmProvider} onValueChange={handleProviderChange}>
                          <SelectTrigger id="provider" className="font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Top de Linha */}
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">⭐ Top de Linha</div>
                            <SelectItem value="openai" className="font-medium text-gray-700 dark:text-gray-300">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                                OpenAI (GPT)
                              </span>
                            </SelectItem>
                            <SelectItem value="google" className="font-medium text-blue-600 dark:text-blue-400">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500"></span>
                                Google (Gemini)
                              </span>
                            </SelectItem>
                            <SelectItem value="anthropic" className="font-medium text-orange-600 dark:text-orange-400">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                Anthropic (Claude)
                              </span>
                            </SelectItem>
                            {/* Custo-Benefício */}
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 border-t pt-2">💰 Custo-Benefício</div>
                            <SelectItem value="groq" className="font-medium text-violet-600">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                                Groq (Rápido/Gratuito)
                              </span>
                            </SelectItem>
                            <SelectItem value="deepseek" className="font-medium text-blue-600">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                DeepSeek (Econômico)
                              </span>
                            </SelectItem>
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
                        * Modelos recomendados: <strong>llama-3.3-70b</strong> (Groq), <strong>gemini-2.5-pro</strong> (Google), <strong>gpt-4.1</strong> (OpenAI), <strong>claude-sonnet-4</strong> (Anthropic)
                      </p>
                    </div>
                  </div>

                  <hr className="border-border/50" />

                  {/* Configuração da Leitura de Documentos (File API) */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        📄 LEITURA DE DOCUMENTOS (File API)
                      </Label>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        Obter Chave Gemini <Upload className="h-3 w-3 rotate-45" />
                      </a>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-200 mb-2">
                      📄 <strong>Leitura Visual:</strong> O DAVID "enxerga" todo o conteúdo do PDF — textos, imagens, tabelas, gráficos e até prints de conversas. Escolha um modelo abaixo (modelos mais baratos funcionam bem para leitura).
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="readerApiKey" className="text-xs text-muted-foreground">Chave Gemini para Leitura</Label>
                        <div className="relative">
                          <Input
                            id="readerApiKey"
                            type="password"
                            value={readerApiKey}
                            onChange={(e) => setReaderApiKey(e.target.value)}
                            placeholder="AIza..."
                            className={`pr-10 ${readerApiKey?.startsWith('AIza') ? 'border-green-500 ring-green-500/20' : ''}`}
                          />
                          {readerApiKey?.startsWith('AIza') ? (
                            <Check className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                          ) : (
                            <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="readerModel" className="text-xs text-muted-foreground">Modelo de Leitura</Label>
                        <Select value={readerModel} onValueChange={setReaderModel}>
                          <SelectTrigger id="readerModel">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gemini-2.0-flash-lite">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Gemini 2.0 Flash Lite - $0.075/1M ✓ Mais Barato
                              </span>
                            </SelectItem>
                            <SelectItem value="gemini-2.0-flash">
                              Gemini 2.0 Flash - $0.10/1M (Equilibrado)
                            </SelectItem>
                            <SelectItem value="gemini-2.5-flash-lite">
                              Gemini 2.5 Flash Lite - $0.10/1M
                            </SelectItem>
                            <SelectItem value="gemini-2.5-flash">
                              Gemini 2.5 Flash - $0.30/1M (1M contexto)
                            </SelectItem>
                            <SelectItem value="gemini-3-flash-preview">
                              Gemini 3 Flash Preview - $0.50/1M (Mais Inteligente)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveApiKeys}
                    disabled={updateSettingsMutation.isPending || !hasApiSettingsChanged}
                    size="sm"
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
                </div>
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
