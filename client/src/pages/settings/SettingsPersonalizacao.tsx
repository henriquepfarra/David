import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, Save, Upload, Edit, Trash2, RefreshCw, Brain, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface KnowledgeDoc {
  id: number;
  title: string;
  content: string;
  source: string;
}

interface SettingsPersonalizacaoProps {
  settings: {
    customSystemPrompt?: string | null;
  } | null | undefined;
}

export default function SettingsPersonalizacao({ settings }: SettingsPersonalizacaoProps) {
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [editingDoc, setEditingDoc] = useState<KnowledgeDoc | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<KnowledgeDoc | null>(null);

  const { data: knowledgeDocs, isLoading: docsLoading } = trpc.knowledgeBase.listUserDocs.useQuery();
  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const updateDocMutation = trpc.knowledgeBase.update.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.listUserDocs.invalidate();
      toast.success("Documento atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingDoc(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar documento: " + error.message);
    },
  });

  const deleteDocMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.listUserDocs.invalidate();
      toast.success("Documento deletado com sucesso!");
      setIsDeleteDialogOpen(false);
      setDocToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao deletar documento: " + error.message);
    },
  });

  useEffect(() => {
    if (settings) {
      const prompt = settings.customSystemPrompt || "";
      setCustomSystemPrompt(prompt);
      setOriginalPrompt(prompt);
    }
  }, [settings]);

  const hasPromptChanged = customSystemPrompt !== originalPrompt;

  const handleSaveSystemPrompt = () => {
    updateSettingsMutation.mutate(
      { customSystemPrompt },
      {
        onSuccess: () => {
          setOriginalPrompt(customSystemPrompt);
          toast.success("Instruções salvas com sucesso!");
        },
      }
    );
  };

  const handleEditDoc = (doc: KnowledgeDoc) => {
    setEditingDoc(doc);
    setEditedContent(doc.content);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingDoc) return;
    updateDocMutation.mutate({ id: editingDoc.id, content: editedContent });
  };

  const handleDeleteDoc = (doc: KnowledgeDoc) => {
    setDocToDelete(doc);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!docToDelete) return;
    deleteDocMutation.mutate({ id: docToDelete.id });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Personalização</h2>
        <p className="text-muted-foreground mt-1">Configure o estilo do DAVID e sua base de conhecimento</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Preferências de Estilo */}
        <Card className="flex flex-col h-[600px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4" />
                Preferências de Estilo
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCustomSystemPrompt("")}
                className="text-xs h-7"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            </div>
            <CardDescription className="text-xs">
              O DAVID já possui raciocínio jurídico avançado. Use este campo para preferências de estilo do seu gabinete.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 pt-0">
            <Textarea
              placeholder={`Exemplos de preferências:

• Prefiro "demandante" em vez de "autor"
• Use parágrafos curtos (máximo 4 linhas)
• Sempre numere os dispositivos da sentença
• Evite a expressão "data venia"

Deixe vazio se não tiver preferências específicas.`}
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              className="font-mono text-xs flex-1 resize-none min-h-0 placeholder:text-muted-foreground/50 placeholder:italic"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSystemPrompt}
                disabled={updateSettingsMutation.isPending || !hasPromptChanged}
                size="sm"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-3 w-3" />
                    Salvar Preferências
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Base de Conhecimento */}
        <Card className="flex flex-col h-[600px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                Base de Conhecimento
              </CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Upload className="mr-1 h-3 w-3" />
                Adicionar
              </Button>
            </div>
            <CardDescription className="text-xs">
              {knowledgeDocs?.length || 0} documentos que o DAVID usa para fundamentar respostas
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pt-0">
            {docsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : knowledgeDocs && knowledgeDocs.length > 0 ? (
              <div className="space-y-2 overflow-y-auto h-full pr-1">
                {knowledgeDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="border rounded-lg p-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <h3 className="font-medium truncate text-sm">{doc.title}</h3>
                          <Badge
                            variant="outline"
                            className={doc.source === "sistema"
                              ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 text-[9px] px-1 py-0"
                              : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 text-[9px] px-1 py-0"
                            }
                          >
                            {doc.source === "sistema" ? "Sistema" : "Usuário"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 ml-5">
                          {doc.content.substring(0, 80)}...
                        </p>
                      </div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEditDoc(doc)}
                          disabled={doc.source === "sistema"}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDeleteDoc(doc)}
                          disabled={doc.source === "sistema"}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">Nenhum documento</p>
                <p className="text-xs">Adicione documentos para o DAVID consultar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>{editingDoc?.title}</DialogDescription>
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateDocMutation.isPending}>
              {updateDocMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Salvar</>
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
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteDocMutation.isPending}>
              {deleteDocMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deletando...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" />Deletar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
