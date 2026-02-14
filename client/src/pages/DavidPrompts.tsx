import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, Edit, FileText, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SavedPrompt {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  description?: string | null;
  executionMode?: string | null;
}

export default function DavidPrompts() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    content: "",
    description: "",
    executionMode: "chat",
  });

  const { data: prompts, refetch, isLoading } = trpc.david.savedPrompts.list.useQuery();

  const createMutation = trpc.david.savedPrompts.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      resetForm();
      toast.success("Prompt salvo com sucesso!");
    },
  });

  const updateMutation = trpc.david.savedPrompts.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      resetForm();
      setEditingPrompt(null);
      toast.success("Prompt atualizado!");
    },
  });

  const deleteMutation = trpc.david.savedPrompts.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Prompt deletado com sucesso!");
    },
  });

  const seedTutelaMutation = trpc.david.savedPrompts.seedDefaultTutela.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        refetch();
        toast.success("Prompt padrão de tutela criado com sucesso!");
      } else {
        toast.info("Prompt padrão já existe");
      }
    },
    onError: () => {
      toast.error("Erro ao criar prompt padrão");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      category: "",
      content: "",
      description: "",
      executionMode: "chat",
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.content) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    if (editingPrompt) {
      updateMutation.mutate({
        id: editingPrompt,
        ...formData,
        executionMode: formData.executionMode as "chat" | "full_context",
      });
    } else {
      createMutation.mutate({
        ...formData,
        executionMode: formData.executionMode as "chat" | "full_context",
      });
    }
  };

  const handleEdit = (prompt: SavedPrompt) => {
    setEditingPrompt(prompt.id);
    setFormData({
      title: prompt.title,
      category: prompt.category || "",
      content: prompt.content,
      description: prompt.description || "",
      executionMode: prompt.executionMode || "chat",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja deletar este prompt?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/david")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Biblioteca de Prompts</h1>
              <p className="text-muted-foreground">
                Salve e reutilize prompts especializados
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => seedTutelaMutation.mutate()}
              disabled={seedTutelaMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-2" />
              Criar Prompt de Tutela
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    resetForm();
                    setEditingPrompt(null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPrompt ? "Editar Prompt" : "Novo Prompt"}
                  </DialogTitle>
                  <DialogDescription>
                    Crie um prompt especializado para usar com o DAVID
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Análise de Tutela de Urgência"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Ex: tutela, sentença, decisão"
                    />
                  </div>

                  <div>
                    <Label htmlFor="executionMode">Modo de Execução</Label>
                    <Select
                      value={formData.executionMode}
                      onValueChange={(value) => setFormData({ ...formData, executionMode: value })}
                    >
                      <SelectTrigger id="executionMode">
                        <SelectValue placeholder="Selecione o modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chat">RAG (Padrão)</SelectItem>
                        <SelectItem value="full_context">Auditoria (Leitura Integral)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>RAG:</strong> Busca trechos específicos. Ideal para dúvidas pontuais.<br />
                      <strong>Auditoria:</strong> Lê o processo inteiro. Ideal para análises completas (/analise1).
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o que este prompt faz..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Conteúdo do Prompt *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Digite o prompt completo..."
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingPrompt ? "Atualizar" : "Salvar"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts?.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {prompt.title}
                    </CardTitle>
                    {prompt.category && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                        {prompt.category}
                      </span>
                    )}
                    {prompt.executionMode === 'full_context' && (
                      <span className="inline-block mt-2 ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded font-semibold border border-purple-200">
                        AUDITORIA
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(prompt)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(prompt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {prompt.description && (
                <CardContent>
                  <CardDescription>{prompt.description}</CardDescription>
                </CardContent>
              )}
            </Card>
          ))}

          {prompts?.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum prompt salvo ainda</p>
              <p className="text-sm mt-1">Crie seu primeiro prompt especializado</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
