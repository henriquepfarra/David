import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, FileText, Loader2, RefreshCw, RotateCcw, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Configuracoes() {
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmProvider, setLlmProvider] = useState("google");
  const [llmModel, setLlmModel] = useState("");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [modelsError, setModelsError] = useState("");

  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();
  
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  useEffect(() => {
    if (settings) {
      setLlmApiKey(settings.llmApiKey || "");
      setLlmProvider(settings.llmProvider || "google");
      setLlmModel(settings.llmModel || "");
      setCustomSystemPrompt(settings.customSystemPrompt || "");
      
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

  const handleResetSystemPrompt = () => {
    setCustomSystemPrompt("");
    toast.success("System Prompt resetado. Salve para aplicar.");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!llmApiKey) {
      toast.error("Insira a chave de API");
      return;
    }
    
    if (!llmModel) {
      toast.error("Selecione um modelo");
      return;
    }
    
    updateMutation.mutate({
      llmApiKey,
      llmProvider,
      llmModel,
      customSystemPrompt: customSystemPrompt || null,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configurações
          </h1>
          <p className="mt-2 text-muted-foreground">
            Configure sua chave de API, modelo de IA e personalize o System Prompt do David
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração de IA</CardTitle>
            <CardDescription>
              Configure o provedor, modelo e chave de API para geração de minutas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
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
                  placeholder="Insira sua chave de API"
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
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  {modelsError}
                </div>
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
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            {model.supportsVision && (
                              <span className="text-xs text-muted-foreground">(Visão)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {llmModel && availableModels.find(m => m.id === llmModel)?.description && (
                    <p className="text-xs text-muted-foreground">
                      {availableModels.find(m => m.id === llmModel)?.description}
                    </p>
                  )}
                </div>
              )}

              {availableModels.length > 0 && llmModel && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Modelo selecionado: {availableModels.find(m => m.id === llmModel)?.name}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={updateMutation.isPending || !llmModel} 
                className="w-full"
              >
                {updateMutation.isPending ? (
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
            </form>
          </CardContent>
        </Card>

        {/* Card de System Prompt Customizado */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              System Prompt do David
            </CardTitle>
            <CardDescription>
              Personalize o comportamento do David editando o System Prompt. Deixe em branco para usar o padrão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="systemPrompt">System Prompt Customizado</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSystemPrompt}
                  disabled={!customSystemPrompt}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resetar para Padrão
                </Button>
              </div>
              <Textarea
                id="systemPrompt"
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                placeholder="Cole aqui o System Prompt customizado do David, ou deixe em branco para usar o padrão..."
                className="min-h-[400px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {customSystemPrompt 
                  ? `${customSystemPrompt.length} caracteres • System Prompt customizado será usado`
                  : "Usando System Prompt padrão do David (Assessor de Magistrado JEC)"
                }
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar System Prompt
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Como obter uma chave de API?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <h4 className="font-semibold mb-1">Google Gemini</h4>
              <p>
                Acesse{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  aistudio.google.com/app/apikey
                </a>{" "}
                e crie uma chave de API gratuita
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">OpenAI (GPT-4, GPT-3.5)</h4>
              <p>
                Acesse{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  platform.openai.com/api-keys
                </a>{" "}
                e crie uma nova chave de API
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Anthropic (Claude)</h4>
              <p>
                Acesse{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  console.anthropic.com/settings/keys
                </a>{" "}
                e gere sua chave
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
