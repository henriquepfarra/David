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
import { FileText, Loader2, Save, Upload, Edit, Trash2, RefreshCw, Key, Brain, BookOpen } from "lucide-react";
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
                {/* Indicador de LLM ativa */}
                {!llmApiKey ? (
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>✅ Usando LLM nativa da Manus</strong> - Nenhuma configuração necessária
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Configure uma API externa abaixo se desejar usar um provedor específico
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-900 dark:text-green-100">
                      <strong>✅ Usando API externa configurada ({llmProvider})</strong>
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Modelo: {llmModel || "Não selecionado"}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="provider">Provedor de IA</Label>
                  <Select value={llmProvider} onValueChange={handleProviderChange}>
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                      <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">Chave de API</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Insira sua chave de API (deixe vazio para usar LLM nativa)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sua chave de API é armazenada de forma segura no banco de dados
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLoadModels}
                    disabled={isLoadingModels || !llmApiKey}
                    className="flex-1"
                  >
                    {isLoadingModels ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Carregando Modelos...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Carregar Modelos Disponíveis
                      </>
                    )}
                  </Button>
                </div>

                {modelsError && (
                  <p className="text-sm text-destructive">{modelsError}</p>
                )}

                {availableModels.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Select value={llmModel} onValueChange={setLlmModel}>
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {availableModels.length} modelo(s) disponível(is)
                    </p>
                  </div>
                )}

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
