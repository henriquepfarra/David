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
import { FileText, Loader2, Save, Upload, Edit, Trash2, RefreshCw, Key, Brain, BookOpen, Database, Check, Search } from "lucide-react";
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
  const { data: knowledgeDocs, isLoading: docsLoading } = trpc.knowledgeBase.listUserDocs.useQuery();
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
      utils.knowledgeBase.listUserDocs.invalidate();
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
      utils.knowledgeBase.listUserDocs.invalidate();
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
      // Carrega o valor salvo OU string vazia (não usa DEFAULT)
      const prompt = settings.customSystemPrompt || "";
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
                      ✏️ Preferências de Estilo do Gabinete
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomSystemPrompt("")}
                      className="text-xs h-7"
                      title="Limpar preferências personalizadas"
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Limpar
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    O DAVID já possui um sistema de raciocínio jurídico avançado. Use este campo apenas para preferências de estilo de escrita do seu gabinete.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <Textarea
                    id="system-prompt"
                    placeholder={`Exemplos de preferências (este texto desaparece ao digitar):

• Prefiro "demandante" em vez de "autor"
• Use parágrafos curtos (máximo 4 linhas)
• Sempre numere os dispositivos da sentença
• Evite a expressão "data venia"
• "Ante o exposto, JULGO PROCEDENTE..."

Deixe vazio se não tiver preferências específicas.`}
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    className="font-mono text-xs flex-1 resize-none min-h-0 placeholder:text-muted-foreground/50 placeholder:italic"
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
                          Salvar Preferências
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleEditDoc(doc)}
                                disabled={doc.source === "sistema"}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleDeleteDoc(doc)}
                                disabled={doc.source === "sistema"}
                              >
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
                  {/* Explicação: Como o DAVID Funciona */}
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900/50 dark:to-blue-950/30 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold flex items-center gap-2 mb-3 text-lg">
                      <Brain className="h-5 w-5 text-primary" />
                      Como o DAVID Funciona
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      <strong>O DAVID foi construído com o que há de mais moderno em IA.</strong> Combina <strong>múltiplos modelos especializados</strong> — um para leitura de documentos, outro para memória jurídica, e o cérebro, responsável por pensar e escrever. O resultado? <strong>Alta performance jurídica, do seu jeito.</strong>
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Card Leitura */}
                      <div className="group relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/50 text-center hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <p className="font-semibold text-sm text-foreground">LEITURA</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Lê PDFs como um humano: texto, tabelas, até imagens.</p>
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/50 text-[11px] font-medium text-green-700 dark:text-green-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Automático
                        </div>
                      </div>
                      {/* Card Memória */}
                      <div className="group relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/50 text-center hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                          <Search className="h-6 w-6 text-white" />
                        </div>
                        <p className="font-semibold text-sm text-foreground">MEMÓRIA</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Lembra de súmulas, teses e precedentes relevantes.</p>
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/50 text-[11px] font-medium text-green-700 dark:text-green-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Automático
                        </div>
                      </div>
                      {/* Card Cérebro */}
                      <div className="group relative bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 backdrop-blur-sm p-5 rounded-xl border-2 border-primary/30 dark:border-primary/40 text-center hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02] transition-all duration-300">
                        <div className="absolute -top-2.5 -right-2.5 bg-primary text-white text-[10px] px-2.5 py-1 rounded-full font-semibold shadow-lg">Configurável</div>
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                          <Brain className="h-6 w-6 text-white" />
                        </div>
                        <p className="font-semibold text-sm text-foreground">CÉREBRO</p>
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Pensa e escreve suas minutas com raciocínio jurídico.</p>
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-[11px] font-medium text-primary">
                          <Key className="w-3 h-3" />
                          Você escolhe
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 bg-blue-50 dark:bg-blue-950/50 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900 leading-relaxed">
                      💡 <strong>Por que deixamos o Cérebro na sua mão?</strong> Cada magistrado tem seu fluxo. Alguns preferem modelos mais rápidos, outros priorizam profundidade. Você escolhe a IA que melhor se adapta ao seu estilo de trabalho.
                    </p>
                  </div>


                  {/* Configuração do Cérebro (LLM) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Label className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          🧠 CÉREBRO (IA Principal)
                        </Label>
                        {llmApiKey && (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-[10px] gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1)} • {llmModel || "Padrão"}
                          </Badge>
                        )}
                        {!llmApiKey && (
                          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-[10px] gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Configuração necessária
                          </Badge>
                        )}
                      </div>

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
