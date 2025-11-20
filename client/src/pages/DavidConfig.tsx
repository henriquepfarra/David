import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const DEFAULT_SYSTEM_PROMPT = `Você é DAVID, um assistente jurídico especializado em processos judiciais brasileiros.

Sua função é auxiliar na análise de processos, geração de minutas e orientação jurídica com base em:
1. Dados do processo fornecido pelo usuário
2. Legislação brasileira (CPC, CDC, CC, etc.)
3. Jurisprudência do TJSP e tribunais superiores
4. Boas práticas jurídicas

Diretrizes:
- Seja preciso, técnico e fundamentado
- Cite sempre a base legal (artigos, leis)
- Quando sugerir jurisprudência, forneça perfis de busca específicos
- NUNCA invente jurisprudência ou dados
- Seja crítico e realista sobre pontos fortes e fracos
- Use linguagem jurídica clara e acessível
- Quando houver processo selecionado, utilize seus dados no contexto

Formato de resposta:
- Use markdown para estruturar
- Destaque pontos importantes em **negrito**
- Use listas quando apropriado
- Cite dispositivos legais entre parênteses (ex: Art. 300, CPC)`;

export default function DavidConfig() {
  const [, setLocation] = useLocation();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implementar salvamento no backend
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Deseja resetar para as configurações padrão?")) {
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      toast.success("Configurações resetadas");
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/david")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sobre David</h1>
            <p className="text-muted-foreground">Configure o comportamento do assistente</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>
              Defina como o DAVID deve se comportar e responder. Este prompt será usado em todas as
              conversas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Digite o system prompt do DAVID..."
            />

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Configurações"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar Padrão
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Dicas de Personalização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Defina o tom de voz (formal, técnico, didático)</p>
            <p>• Especifique áreas de especialização (cível, trabalhista, etc.)</p>
            <p>• Adicione instruções sobre formatação de respostas</p>
            <p>• Inclua referências a fontes que devem ser priorizadas</p>
            <p>• Configure limites e restrições (ex: não dar consultorias específicas)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
