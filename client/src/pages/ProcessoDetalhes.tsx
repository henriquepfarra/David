import { useParams, useLocation } from "wouter";
import { ArrowLeft, Calendar, FileText, Scale, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

export default function ProcessoDetalhes() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const processId = parseInt(params.id || "0");

  const { data: processos, isLoading } = trpc.processes.list.useQuery();
  const processo = processos?.find(p => p.id === processId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando detalhes do processo...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!processo) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-2">Processo não encontrado</h2>
            <p className="text-muted-foreground mb-6">
              O processo que você está procurando não existe ou foi removido.
            </p>
            <Button onClick={() => setLocation("/processos")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Processos
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/processos")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Processo {processo.processNumber}
            </h1>
            <p className="text-muted-foreground mt-1">
              Detalhes completos do processo judicial
            </p>
          </div>
        </div>

        {/* Informações Principais */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Informações Processuais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Número do Processo
                </label>
                <p className="text-lg font-mono">{processo.processNumber}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Vara/Comarca
                </label>
                <p>{processo.court || "Não informado"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Juiz(a)
                </label>
                <p>{processo.judge || "Não informado"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Status
                </label>
                <div className="mt-1">
                  <Badge variant="secondary">{processo.status || "Em andamento"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Partes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Autor(es)
                </label>
                <p>{processo.plaintiff || "Não informado"}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Réu(s)
                </label>
                <p>{processo.defendant || "Não informado"}</p>
              </div>
              
              <Separator />
              

            </CardContent>
          </Card>
        </div>

        {/* Assunto/Objeto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assunto/Objeto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">
              {processo.subject || "Não informado"}
            </p>
          </CardContent>
        </Card>

        {/* Fatos Relevantes */}
        {processo.facts && (
          <Card>
            <CardHeader>
              <CardTitle>Fatos Relevantes</CardTitle>
              <CardDescription>
                Resumo dos principais fatos do processo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{processo.facts}</p>
            </CardContent>
          </Card>
        )}

        {/* Pedidos */}
        {processo.requests && (
          <Card>
            <CardHeader>
              <CardTitle>Pedidos</CardTitle>
              <CardDescription>
                Pedidos formulados na ação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{processo.requests}</p>
            </CardContent>
          </Card>
        )}

        {/* Datas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informações Temporais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Data de Cadastro
              </label>
              <p>
                {new Date(processo.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Última Atualização
              </label>
              <p>
                {new Date(processo.updatedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
