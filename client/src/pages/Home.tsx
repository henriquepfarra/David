import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FolderOpen, Gavel } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const features = [
    {
      icon: FolderOpen,
      title: "Gestão de Processos",
      description: "Cadastre e organize informações de processos judiciais do e-Proc TJSP",
      href: "/processos",
      color: "text-blue-600",
    },
    {
      icon: Gavel,
      title: "DAVID - Assistente IA",
      description: "Chat conversacional para análise de processos e geração de minutas",
      href: "/david",
      color: "text-purple-600",
    },
    {
      icon: BookOpen,
      title: "Base de Conhecimento",
      description: "Gerencie documentos, enunciados e jurisprudências para o DAVID",
      href: "/base-conhecimento",
      color: "text-green-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bem-vindo ao e-Proc Ghostwriter
          </h1>
          <p className="mt-2 text-muted-foreground">
            Assistente inteligente para geração de minutas judiciais
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.href} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${feature.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription className="mt-1">{feature.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={feature.href} className="w-full">
                      Acessar
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Cadastre seus processos</h3>
                <p className="text-sm text-muted-foreground">
                  Insira manualmente as informações processuais do e-Proc TJSP
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Configure sua API de IA</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione sua chave de API OpenAI ou similar nas configurações
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Converse com DAVID</h3>
                <p className="text-sm text-muted-foreground">
                  Use o assistente conversacional para analisar processos e gerar minutas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
