import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Scale, Star, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";

export default function Jurisprudencia() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    court: "",
    caseNumber: "",
    title: "",
    summary: "",
    content: "",
    keywords: "",
    url: "",
  });

  const utils = trpc.useUtils();
  const { data: jurisprudence, isLoading } = trpc.jurisprudence.list.useQuery();
  
  const createMutation = trpc.jurisprudence.create.useMutation({
    onSuccess: () => {
      utils.jurisprudence.list.invalidate();
      setOpen(false);
      setFormData({
        court: "",
        caseNumber: "",
        title: "",
        summary: "",
        content: "",
        keywords: "",
        url: "",
      });
      toast.success("Jurisprudência salva com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar jurisprudência: " + error.message);
    },
  });

  const deleteMutation = trpc.jurisprudence.delete.useMutation({
    onSuccess: () => {
      utils.jurisprudence.list.invalidate();
      toast.success("Jurisprudência excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir jurisprudência: " + error.message);
    },
  });

  const toggleFavoriteMutation = trpc.jurisprudence.update.useMutation({
    onSuccess: () => {
      utils.jurisprudence.list.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    toast("Tem certeza que deseja excluir?", {
      action: {
        label: "Excluir",
        onClick: () => deleteMutation.mutate({ id }),
      },
    });
  };

  const handleToggleFavorite = (id: number, currentFavorite: number) => {
    toggleFavoriteMutation.mutate({
      id,
      isFavorite: currentFavorite === 1 ? 0 : 1,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Scale className="h-8 w-8" />
              Jurisprudência
            </h1>
            <p className="mt-2 text-muted-foreground">
              Consulte e salve jurisprudências relevantes para seus casos
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Jurisprudência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Salvar Jurisprudência</DialogTitle>
                <DialogDescription>
                  Adicione uma nova jurisprudência à sua biblioteca
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="court">Tribunal *</Label>
                    <Input
                      id="court"
                      required
                      value={formData.court}
                      onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                      placeholder="Ex: TJSP, STJ, STF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseNumber">Número do Acórdão</Label>
                    <Input
                      id="caseNumber"
                      value={formData.caseNumber}
                      onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                      placeholder="Ex: 1234567-89.2023.8.26.0000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título/Ementa *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Resumo da decisão"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Resumo</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Breve resumo da jurisprudência"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo Completo *</Label>
                  <Textarea
                    id="content"
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Texto completo da decisão ou acórdão"
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Palavras-chave</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="Ex: dano moral, responsabilidade civil, prescrição"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL de Referência</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : jurisprudence && jurisprudence.length > 0 ? (
          <div className="space-y-4">
            {jurisprudence.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {item.court}
                        </span>
                        {item.caseNumber && (
                          <span className="text-xs text-muted-foreground">{item.caseNumber}</span>
                        )}
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      {item.summary && (
                        <CardDescription className="mt-2">{item.summary}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                        className={item.isFavorite === 1 ? "text-amber-500" : ""}
                      >
                        <Star
                          className="h-5 w-5"
                          fill={item.isFavorite === 1 ? "currentColor" : "none"}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.keywords && (
                    <div className="flex flex-wrap gap-2">
                      {item.keywords.split(",").map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                        >
                          {keyword.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">
                    {item.content}
                  </div>
                  {item.url && (
                    <div className="pt-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Ver fonte completa →
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Scale className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma jurisprudência salva ainda.
                <br />
                Clique em "Nova Jurisprudência" para adicionar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
