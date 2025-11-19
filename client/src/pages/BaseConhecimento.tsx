import DashboardLayout from "@/components/DashboardLayout";
import FileUploader from "@/components/FileUploader";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileProcessingResult } from "@/lib/fileProcessor";
import { trpc } from "@/lib/trpc";
import { BookOpen, FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function BaseConhecimento() {
  const [open, setOpen] = useState(false);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    fileType: "text",
    category: "referencias",
    tags: "",
  });

  const utils = trpc.useUtils();
  const { data: knowledgeItems, isLoading } = trpc.knowledgeBase.list.useQuery();
  
  const createMutation = trpc.knowledgeBase.create.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      setOpen(false);
      setFormData({
        title: "",
        content: "",
        fileType: "text",
        category: "referencias",
        tags: "",
      });
      toast.success("Documento adicionado à base de conhecimento!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar documento: " + error.message);
    },
  });

  const deleteMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      toast.success("Documento excluído!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir documento: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Base de Conhecimento
            </h1>
            <p className="mt-2 text-muted-foreground">
              Gerencie documentos de referência para fundamentar suas minutas
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Documento de Referência</DialogTitle>
                <DialogDescription>
                  Adicione decisões anteriores, teses ou outros documentos de referência
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Botão para alternar upload de PDF */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={showPDFUpload ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowPDFUpload(!showPDFUpload)}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {showPDFUpload ? "Ocultar" : "Importar"} Arquivo (PDF/DOCX/TXT)
                  </Button>
                </div>

                {/* Upload de Arquivos */}
                {showPDFUpload && (
                  <div className="space-y-2">
                    <FileUploader
                      maxFiles={1}
                      onProcessComplete={(result: FileProcessingResult) => {
                        if (result.text) {
                          setFormData(prev => ({
                            ...prev,
                            content: result.text,
                            fileType: result.method === "docx" ? "docx" : result.method === "txt" ? "text" : "pdf",
                          }));
                          toast.success(`Texto extraído via ${result.method.toUpperCase()}`);
                        }
                      }}
                    />
                  </div>
                )}

                <div className="border-t pt-4" />

                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Decisão sobre contratos de consumo"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="decisoes">Decisões Anteriores</SelectItem>
                        <SelectItem value="teses">Teses Jurídicas</SelectItem>
                        <SelectItem value="referencias">Referências Gerais</SelectItem>
                        <SelectItem value="jurisprudencia">Jurisprudência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="Ex: consumidor, contrato, indenização"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo *</Label>
                  <Textarea
                    id="content"
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Cole o texto do documento ou importe de PDF acima"
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.content.length} caracteres
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : knowledgeItems && knowledgeItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {knowledgeItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.category || "Sem categoria"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {item.content}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {item.content.length} caracteres
                  </div>
                  {item.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.split(",").slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Nenhum documento na base de conhecimento
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                Adicione decisões anteriores, teses e referências para fundamentar melhor suas minutas
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Documento
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
