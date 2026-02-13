import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Key, Brain, FileText, Search, Loader2, Save, Trash2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SettingsAvancadoProps {
  settings: {
    llmApiKey?: string;
    llmProvider?: string | null;
    llmModel?: string | null;
    readerApiKey?: string;
    readerModel?: string | null;
  } | null | undefined;
}

export default function SettingsAvancado({ settings }: SettingsAvancadoProps) {
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmProvider, setLlmProvider] = useState("google");
  const [llmModel, setLlmModel] = useState("");
  const [readerApiKey, setReaderApiKey] = useState("");
  const [readerModel, setReaderModel] = useState("gemini-2.0-flash-lite");
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; isRecommended?: boolean }>>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [showAllModels, setShowAllModels] = useState(false);

  const [originalApiSettings, setOriginalApiSettings] = useState<{
    llmApiKey: string;
    llmProvider: string;
    llmModel: string;
    readerApiKey: string;
    readerModel: string;
  } | null>(null);

  const utils = trpc.useUtils();
  const isLlmConfigured = !!settings?.llmApiKey;

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  useEffect(() => {
    if (settings) {
      const apiKey = "";
      const provider = settings.llmProvider || "google";
      const model = settings.llmModel || "";
      const rApiKey = "";
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

      if (settings.llmApiKey && settings.llmProvider) {
        loadModels(settings.llmProvider, "", true);
      }
    }
  }, [settings]);

  const loadModels = async (provider: string, apiKey: string, silent = false, showAll?: boolean) => {
    const hasStoredKey = !!settings?.llmApiKey;
    if ((!apiKey || apiKey.length < 5) && !hasStoredKey) {
      if (!silent) setModelsError("Insira uma chave de API válida");
      return;
    }
    setIsLoadingModels(true);
    setModelsError("");

    const onlyRecommended = showAll !== undefined ? !showAll : !showAllModels;

    try {
      const models = await utils.client.settings.listModels.query({
        provider,
        apiKey: apiKey || undefined,
        onlyRecommended,
      });
      setAvailableModels(models);
      if (models.length === 0) {
        setModelsError("Nenhum modelo disponível");
      } else if (!silent) {
        toast.success(`${models.length} modelos carregados`);
      }
    } catch (error) {
      setModelsError("Falha ao carregar modelos.");
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

  useEffect(() => {
    if (!llmApiKey || llmApiKey.length < 10) return;
    if (originalApiSettings?.llmApiKey === llmApiKey && originalApiSettings?.llmProvider === llmProvider) return;

    const timer = setTimeout(() => {
      loadModels(llmProvider, llmApiKey, true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [llmApiKey, llmProvider, originalApiSettings]);

  const hasApiSettingsChanged = originalApiSettings ? (
    llmApiKey !== originalApiSettings.llmApiKey ||
    llmProvider !== originalApiSettings.llmProvider ||
    llmModel !== originalApiSettings.llmModel ||
    readerApiKey !== originalApiSettings.readerApiKey ||
    readerModel !== originalApiSettings.readerModel
  ) : false;

  const handleRemoveLlmApiKey = () => {
    if (!window.confirm("Remover a chave de API? Você voltará a usar os créditos do plano.")) return;
    updateSettingsMutation.mutate(
      { llmApiKey: "", llmModel: "" },
      {
        onSuccess: () => {
          setLlmApiKey("");
          setLlmModel("");
          setAvailableModels([]);
          toast.success("Chave removida!");
        },
      }
    );
  };

  const handleSaveApiKeys = () => {
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
          setOriginalApiSettings({ llmApiKey, llmProvider, llmModel, readerApiKey, readerModel });
          toast.success("Configurações de API salvas!");
        },
      }
    );
  };

  const providerLinks: Record<string, { url: string; label: string; color: string }> = {
    google: { url: "https://aistudio.google.com/app/apikey", label: "Google AI Studio", color: "text-blue-500" },
    openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI", color: "text-green-500" },
    anthropic: { url: "https://console.anthropic.com/settings/keys", label: "Anthropic", color: "text-orange-500" },
    groq: { url: "https://console.groq.com/keys", label: "Groq (Grátis)", color: "text-violet-500" },
    deepseek: { url: "https://platform.deepseek.com/api_keys", label: "DeepSeek", color: "text-blue-500" },
  };

  const link = providerLinks[llmProvider];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Avançado</h2>
        <p className="text-muted-foreground mt-1">Use sua própria chave de API para uso ilimitado</p>
      </div>

      {/* Card principal: Chave de API */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            Chave de API
          </CardTitle>
          <CardDescription>
            Configure sua própria chave para remover os limites de créditos diários. O custo de API passa a ser seu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            As chaves do sistema (leitura de PDFs, embeddings) continuam funcionando automaticamente.
            Você configura apenas o <strong>Cérebro</strong> (IA que pensa e escreve).
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {(isLlmConfigured || llmApiKey) ? (
                <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 text-xs gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {llmProvider.charAt(0).toUpperCase() + llmProvider.slice(1)} {llmModel ? `• ${llmModel}` : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Não configurado
                </Badge>
              )}
            </div>
            {link && (
              <a href={link.url} target="_blank" rel="noreferrer" className={`text-xs ${link.color} hover:underline`}>
                Obter chave ({link.label})
              </a>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Provedor de IA</Label>
              <Select value={llmProvider} onValueChange={handleProviderChange}>
                <SelectTrigger className="font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="groq">Groq (Rápido/Gratuito)</SelectItem>
                  <SelectItem value="deepseek">DeepSeek (Econômico)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Chave de API</Label>
              <div className="relative">
                <Input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={llmProvider === "groq" ? "gsk_..." : "sk-..."}
                  className="pr-10"
                />
                {isLlmConfigured ? (
                  <Trash2
                    className="absolute right-3 top-2.5 h-4 w-4 text-destructive opacity-70 hover:opacity-100 cursor-pointer"
                    onClick={handleRemoveLlmApiKey}
                  />
                ) : (
                  <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground">Modelo</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllModels}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setShowAllModels(newValue);
                      if (isLlmConfigured || llmApiKey) {
                        loadModels(llmProvider, llmApiKey, true, newValue);
                      }
                    }}
                    className="w-3 h-3 rounded border-gray-300"
                  />
                  Mostrar todos
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => loadModels(llmProvider, llmApiKey)}
                  disabled={isLoadingModels || (!isLlmConfigured && !llmApiKey)}
                  className="h-6 text-xs"
                >
                  {isLoadingModels ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                  Atualizar
                </Button>
              </div>
            </div>

            {modelsError ? (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">{modelsError}</div>
            ) : (
              <Select value={llmModel} onValueChange={setLlmModel}>
                <SelectTrigger>
                  <SelectValue placeholder={availableModels.length > 0 ? "Selecione o modelo..." : "Insira a chave para carregar modelos"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.length > 0 ? (
                    availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground text-center">Nenhum modelo carregado</div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={handleSaveApiKeys}
              disabled={updateSettingsMutation.isPending || !hasApiSettingsChanged}
              size="sm"
            >
              {updateSettingsMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Salvar Configurações</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Como funciona */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" />
            Como o DAVID funciona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg border">
              <FileText className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Leitura</p>
              <p className="text-xs text-muted-foreground mt-1">Lê PDFs automaticamente</p>
              <Badge variant="outline" className="mt-2 text-xs text-green-600">Automático</Badge>
            </div>
            <div className="text-center p-4 rounded-lg border">
              <Search className="h-6 w-6 mx-auto mb-2 text-violet-500" />
              <p className="text-sm font-medium">Memória</p>
              <p className="text-xs text-muted-foreground mt-1">Súmulas e precedentes</p>
              <Badge variant="outline" className="mt-2 text-xs text-green-600">Automático</Badge>
            </div>
            <div className="text-center p-4 rounded-lg border-2 border-primary/30">
              <Brain className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Cérebro</p>
              <p className="text-xs text-muted-foreground mt-1">Pensa e escreve minutas</p>
              <Badge variant="outline" className="mt-2 text-xs text-primary">Sua chave API</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
