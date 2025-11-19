import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Gavel, Loader2, Sparkles, BookOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Ghostwriter() {
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [draftType, setDraftType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);

  const { data: processes } = trpc.processes.list.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: knowledgeBase } = trpc.knowledgeBase.list.useQuery();
  
  const generateMutation = trpc.ghostwriter.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setIsGenerating(false);
      toast.success("Minuta gerada com sucesso!");
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error("Erro ao gerar minuta: " + error.message);
    },
  });

  const handleGenerate = () => {
    if (!selectedProcess || !draftType || !title) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!settings?.llmApiKey) {
      toast.error("Configure sua chave de API nas configurações antes de gerar minutas");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");
    
    generateMutation.mutate({
      processId: parseInt(selectedProcess),
      draftType: draftType as "sentenca" | "decisao" | "despacho" | "acordao",
      title,
    });
  };

  const draftTypes = [
    { value: "sentenca", label: "Sentença" },
    { value: "decisao", label: "Decisão Interlocutória" },
    { value: "despacho", label: "Despacho" },
    { value: "acordao", label: "Acórdão" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Gavel className="h-8 w-8" />
            Ghostwriter IA
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gere minutas judiciais automaticamente com inteligência artificial
          </p>
        </div>

        {!settings?.llmApiKey && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-amber-900 dark:text-amber-100">
                Configuração Necessária
              </CardTitle>
              <CardDescription className="text-amber-800 dark:text-amber-200">
                Você precisa configurar sua chave de API de IA antes de gerar minutas.
                Acesse as Configurações no menu lateral.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle>Configurar Geração</CardTitle>
              <CardDescription>
                Selecione o processo e o tipo de minuta a ser gerada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="process">Processo *</Label>
                <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                  <SelectTrigger id="process">
                    <SelectValue placeholder="Selecione um processo" />
                  </SelectTrigger>
                  <SelectContent>
                    {processes?.map((process) => (
                      <SelectItem key={process.id} value={process.id.toString()}>
                        {process.processNumber} - {process.plaintiff || "Sem autor"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="draftType">Tipo de Minuta *</Label>
                <Select value={draftType} onValueChange={setDraftType}>
                  <SelectTrigger id="draftType">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {draftTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título da Minuta *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sentença de Procedência - Ação de Cobrança"
                />
              </div>

              {knowledgeBase && knowledgeBase.length > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg">
                  <Checkbox
                    id="useKnowledge"
                    checked={useKnowledgeBase}
                    onCheckedChange={(checked) => setUseKnowledgeBase(checked as boolean)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="useKnowledge"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Usar Base de Conhecimento
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {knowledgeBase.length} documento(s) disponível(is) para fundamentação
                    </p>
                  </div>
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !settings?.llmApiKey}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando Minuta...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Gerar Minuta com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:row-span-2">
            <CardHeader>
              <CardTitle>Minuta Gerada</CardTitle>
              <CardDescription>
                Visualização do conteúdo gerado pela IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Gerando minuta com IA...</p>
                  <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
                </div>
              ) : generatedContent ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <Streamdown>{generatedContent}</Streamdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma minuta gerada ainda.
                    <br />
                    Preencha os campos ao lado e clique em "Gerar Minuta".
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações */}
          <Card>
            <CardHeader>
              <CardTitle>Como funciona?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  1
                </div>
                <p className="text-muted-foreground">
                  Selecione um processo cadastrado com todas as informações necessárias
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  2
                </div>
                <p className="text-muted-foreground">
                  Escolha o tipo de minuta (sentença, decisão, despacho ou acórdão)
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  3
                </div>
                <p className="text-muted-foreground">
                  A IA analisa os dados e gera uma minuta fundamentada e bem estruturada
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  4
                </div>
                <p className="text-muted-foreground">
                  A minuta é salva automaticamente e pode ser editada posteriormente
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
