import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Brain, FileText, TrendingUp, Calendar, Search, Eye, Edit, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function MemoriaDavid() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedThesis, setSelectedThesis] = useState<any>(null);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [editingThesis, setEditingThesis] = useState<any>(null);
  const [thesisToDelete, setThesisToDelete] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    thesis: "",
    legalFoundations: "",
    keywords: "",
    decisionPattern: "",
  });

  // Queries
  const utils = trpc.useUtils();
  const thesesQuery = trpc.david.learnedTheses.list.useQuery();
  const draftsQuery = trpc.david.approvedDrafts.list.useQuery();

  // Mutations
  const updateThesisMutation = trpc.david.learnedTheses.update.useMutation({
    onSuccess: () => {
      toast.success("Tese atualizada com sucesso!");
      utils.david.learnedTheses.list.invalidate();
      setEditingThesis(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tese: " + error.message);
    },
  });

  const deleteThesisMutation = trpc.david.learnedTheses.delete.useMutation({
    onSuccess: () => {
      toast.success("Tese deletada com sucesso!");
      utils.david.learnedTheses.list.invalidate();
      setThesisToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao deletar tese: " + error.message);
    },
  });

  // Funções
  const handleEditThesis = (thesis: any) => {
    setEditingThesis(thesis);
    setEditForm({
      thesis: thesis.thesis || "",
      legalFoundations: thesis.legalFoundations || "",
      keywords: thesis.keywords || "",
      decisionPattern: thesis.decisionPattern || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingThesis) return;
    updateThesisMutation.mutate({
      id: editingThesis.id,
      ...editForm,
    });
  };

  const handleToggleObsolete = (thesis: any) => {
    const newObsoleteValue = thesis.isObsolete ? 0 : 1;
    updateThesisMutation.mutate({
      id: thesis.id,
      isObsolete: newObsoleteValue,
    });
  };

  const handleDeleteThesis = () => {
    if (!thesisToDelete) return;
    deleteThesisMutation.mutate({ id: thesisToDelete });
  };

  const theses = thesesQuery.data || [];
  const drafts = draftsQuery.data || [];

  // Estatísticas
  const totalTheses = theses.length;
  const totalDrafts = drafts.length;

  // Extrair temas mais recorrentes das palavras-chave
  const themeCount: Record<string, number> = {};
  theses.forEach((thesis) => {
    const keywords = thesis.keywords?.split(",").map((k) => k.trim()) || [];
    keywords.forEach((keyword) => {
      if (keyword) {
        themeCount[keyword] = (themeCount[keyword] || 0) + 1;
      }
    });
  });

  const topThemes = Object.entries(themeCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([theme, count]) => ({ theme, count }));

  // Filtrar teses por busca
  const filteredTheses = theses.filter((thesis) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      thesis.thesis?.toLowerCase().includes(searchLower) ||
      thesis.keywords?.toLowerCase().includes(searchLower) ||
      thesis.legalFoundations?.toLowerCase().includes(searchLower)
    );
  });

  // Filtrar minutas por busca
  const filteredDrafts = drafts.filter((draft) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      draft.originalDraft?.toLowerCase().includes(searchLower) ||
      draft.editedDraft?.toLowerCase().includes(searchLower) ||
      draft.draftType?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-purple-600" />
          Memória do DAVID
        </h1>
        <p className="text-muted-foreground">
          Visualize e gerencie o conhecimento acumulado pelo assistente
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teses Aprendidas</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTheses}</div>
            <p className="text-xs text-muted-foreground">
              Decisões consolidadas em teses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minutas Aprovadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrafts}</div>
            <p className="text-xs text-muted-foreground">
              Minutas salvas como referência
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temas Recorrentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topThemes.length}</div>
            <p className="text-xs text-muted-foreground">
              Áreas de maior atuação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Temas Mais Recorrentes */}
      {topThemes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Temas Mais Recorrentes</CardTitle>
            <CardDescription>
              Assuntos que você mais decide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topThemes.map(({ theme, count }) => (
                <Badge key={theme} variant="secondary" className="text-sm">
                  {theme} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por tema, fundamento legal ou conteúdo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs: Teses vs Minutas */}
      <Tabs defaultValue="theses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="theses">
            Teses Aprendidas ({filteredTheses.length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Minutas Aprovadas ({filteredDrafts.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Teses */}
        <TabsContent value="theses" className="space-y-4">
          {filteredTheses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhuma tese encontrada com esse termo"
                    : "Nenhuma tese aprendida ainda. Aprove minutas para começar!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTheses.map((thesis) => (
              <Card key={thesis.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <CardTitle className="text-lg flex-1">{thesis.thesis}</CardTitle>
                        {thesis.isObsolete === 1 && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-300">
                            Obsoleta
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3" />
                          {new Date(thesis.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedThesis(thesis)}
                        title="Visualizar detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditThesis(thesis)}
                        title="Editar tese"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleObsolete(thesis)}
                        title={thesis.isObsolete ? "Marcar como atual" : "Marcar como obsoleta"}
                        className={thesis.isObsolete ? "text-orange-500" : ""}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setThesisToDelete(thesis.id)}
                        title="Deletar tese"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Fundamentos Legais:</p>
                    <p className="text-sm text-muted-foreground">
                      {thesis.legalFoundations}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {thesis.keywords?.split(",").map((keyword: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword.trim()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Tab: Minutas */}
        <TabsContent value="drafts" className="space-y-4">
          {filteredDrafts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhuma minuta encontrada com esse termo"
                    : "Nenhuma minuta aprovada ainda"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDrafts.map((draft) => (
              <Card key={draft.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {draft.draftType === "sentenca"
                            ? "Sentença"
                            : draft.draftType === "decisao"
                            ? "Decisão"
                            : "Despacho"}
                        </CardTitle>
                        <Badge variant={draft.approvalStatus === "approved" ? "default" : "secondary"}>
                          {draft.approvalStatus === "approved" ? "Aprovada" : "Editada"}
                        </Badge>
                      </div>
                      <CardDescription className="mt-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3" />
                          {new Date(draft.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDraft(draft)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {draft.editedDraft || draft.originalDraft}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Detalhes da Tese */}
      <Dialog open={!!selectedThesis} onOpenChange={() => setSelectedThesis(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Tese</DialogTitle>
            <DialogDescription>
              Tese extraída automaticamente em{" "}
              {selectedThesis && new Date(selectedThesis.createdAt).toLocaleDateString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          {selectedThesis && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Tese Firmada (Ratio Decidendi)</h3>
                <p className="text-sm">{selectedThesis.thesis}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Fundamentos Legais</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedThesis.legalFoundations}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Palavras-chave</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedThesis.keywords?.split(",").map((keyword: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {keyword.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
              {selectedThesis.decisionPattern && (
                <div>
                  <h3 className="font-semibold mb-2">Padrão de Redação</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedThesis.decisionPattern}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da Minuta */}
      <Dialog open={!!selectedDraft} onOpenChange={() => setSelectedDraft(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDraft?.draftType === "sentenca"
                ? "Sentença"
                : selectedDraft?.draftType === "decisao"
                ? "Decisão"
                : "Despacho"}{" "}
              Aprovada
            </DialogTitle>
            <DialogDescription>
              Aprovada em{" "}
              {selectedDraft && new Date(selectedDraft.createdAt).toLocaleDateString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          {selectedDraft && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Conteúdo</h3>
                <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                  {selectedDraft.editedDraft || selectedDraft.originalDraft}
                </div>
              </div>
              {selectedDraft.editedDraft && selectedDraft.editedDraft !== selectedDraft.originalDraft && (
                <div>
                  <Badge variant="secondary">Minuta foi editada antes da aprovação</Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Tese */}
      <Dialog open={!!editingThesis} onOpenChange={() => setEditingThesis(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Tese</DialogTitle>
            <DialogDescription>
              Refine a tese extraída automaticamente ou atualize fundamentos legais
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="thesis">Tese Firmada (Ratio Decidendi)</Label>
              <Textarea
                id="thesis"
                value={editForm.thesis}
                onChange={(e) => setEditForm({ ...editForm, thesis: e.target.value })}
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="legalFoundations">Fundamentos Jurídicos</Label>
              <Textarea
                id="legalFoundations"
                value={editForm.legalFoundations}
                onChange={(e) => setEditForm({ ...editForm, legalFoundations: e.target.value })}
                rows={3}
                className="mt-1"
                placeholder="Art. 300 CPC, Art. 14 CDC, etc."
              />
            </div>
            <div>
              <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="keywords"
                value={editForm.keywords}
                onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                className="mt-1"
                placeholder="tutela de urgência, gravame, leasing"
              />
            </div>
            <div>
              <Label htmlFor="decisionPattern">Padrão de Redação</Label>
              <Textarea
                id="decisionPattern"
                value={editForm.decisionPattern}
                onChange={(e) => setEditForm({ ...editForm, decisionPattern: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingThesis(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateThesisMutation.isPending}>
              {updateThesisMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar Exclusão */}
      <AlertDialog open={!!thesisToDelete} onOpenChange={() => setThesisToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tese será permanentemente removida da memória do DAVID.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteThesis}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteThesisMutation.isPending ? "Deletando..." : "Deletar Tese"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
