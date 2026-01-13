import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Brain, FileText, Tag, Search, Eye, Edit, Archive, Trash2, CheckSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

interface Thesis {
  id: number;
  thesis: string;
  legalFoundations?: string | null;
  keywords?: string | null;
  decisionPattern?: string | null;
  isObsolete?: number;
}

interface Draft {
  id: number;
  originalDraft: string;
  editedDraft?: string | null;
  draftType: string;
  createdAt: string;
}

export default function MemoriaDavid() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("teses");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Seleção múltipla
  const [selectedTheses, setSelectedTheses] = useState<Set<number>>(new Set());
  const [selectedDrafts, setSelectedDrafts] = useState<Set<number>>(new Set());
  
  // Dialogs
  const [viewingThesis, setViewingThesis] = useState<Thesis | null>(null);
  const [viewingDraft, setViewingDraft] = useState<Draft | null>(null);
  const [editingThesis, setEditingThesis] = useState<Thesis | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<"theses" | "drafts" | null>(null);
  
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
    },
    onError: (error) => {
      toast.error("Erro ao deletar tese: " + error.message);
    },
  });

  const deleteDraftMutation = trpc.david.approvedDrafts.delete.useMutation({
    onSuccess: () => {
      toast.success("Minuta deletada com sucesso!");
      utils.david.approvedDrafts.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar minuta: " + error.message);
    },
  });

  // Funções de seleção
  const toggleThesisSelection = (id: number) => {
    const newSelection = new Set(selectedTheses);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTheses(newSelection);
  };

  const toggleAllTheses = () => {
    if (selectedTheses.size === filteredTheses.length) {
      setSelectedTheses(new Set());
    } else {
      setSelectedTheses(new Set(filteredTheses.map(t => t.id)));
    }
  };

  const toggleDraftSelection = (id: number) => {
    const newSelection = new Set(selectedDrafts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedDrafts(newSelection);
  };

  const toggleAllDrafts = () => {
    if (selectedDrafts.size === filteredDrafts.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(filteredDrafts.map(d => d.id)));
    }
  };

  // Ações em massa
  const handleBulkDeleteTheses = async () => {
    for (const id of Array.from(selectedTheses)) {
      await deleteThesisMutation.mutateAsync({ id });
    }
    setSelectedTheses(new Set());
    setDeleteConfirm(null);
  };

  const handleBulkDeleteDrafts = async () => {
    for (const id of Array.from(selectedDrafts)) {
      await deleteDraftMutation.mutateAsync({ id });
    }
    setSelectedDrafts(new Set());
    setDeleteConfirm(null);
  };

  const handleBulkMarkObsolete = async () => {
    for (const id of Array.from(selectedTheses)) {
      await updateThesisMutation.mutateAsync({ id, isObsolete: 1 });
    }
    setSelectedTheses(new Set());
    toast.success("Teses marcadas como obsoletas!");
  };

  // Edição
  const handleEditThesis = (thesis: Thesis) => {
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

  // Filtros
  const filteredTheses = (thesesQuery.data || []).filter(thesis =>
    thesis.thesis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    thesis.keywords?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDrafts = (draftsQuery.data || []).filter(draft =>
    draft.originalDraft?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    draft.draftType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupamento por temas (keywords)
  const themeGroups = filteredTheses.reduce((acc, thesis) => {
    const keywords = thesis.keywords?.split(",").map(k => k.trim()) || ["Sem tema"];
    keywords.forEach(keyword => {
      if (!acc[keyword]) acc[keyword] = [];
      acc[keyword].push(thesis);
    });
    return acc;
  }, {} as Record<string, Thesis[]>);

  const themes = Object.entries(themeGroups)
    .map(([theme, theses]) => ({ theme, count: theses.length }))
    .sort((a, b) => b.count - a.count);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        <div>
          <h1 className="text-3xl font-bold">Memória do DAVID</h1>
          <p className="text-muted-foreground">
            Gerencie teses aprendidas, minutas aprovadas e temas recorrentes
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teses">
            <Brain className="w-4 h-4 mr-2" />
            Teses Aprendidas
          </TabsTrigger>
          <TabsTrigger value="minutas">
            <FileText className="w-4 h-4 mr-2" />
            Minutas Aprovadas
          </TabsTrigger>
          <TabsTrigger value="temas">
            <Tag className="w-4 h-4 mr-2" />
            Temas
          </TabsTrigger>
        </TabsList>

        {/* ABA TESES */}
        <TabsContent value="teses" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar teses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedTheses.size > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBulkMarkObsolete}
                  disabled={updateThesisMutation.isPending}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Marcar Obsoletas ({selectedTheses.size})
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirm("theses")}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deletar ({selectedTheses.size})
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Teses ({filteredTheses.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedTheses.size === filteredTheses.length && filteredTheses.length > 0}
                    onCheckedChange={toggleAllTheses}
                  />
                  <span className="text-sm text-muted-foreground">Selecionar todos</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {thesesQuery.isLoading && <p>Carregando...</p>}
              {filteredTheses.length === 0 && !thesesQuery.isLoading && (
                <p className="text-muted-foreground text-center py-8">Nenhuma tese encontrada</p>
              )}
              <div className="space-y-4">
                {filteredTheses.map((thesis) => (
                  <div
                    key={thesis.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedTheses.has(thesis.id)}
                        onCheckedChange={() => toggleThesisSelection(thesis.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{thesis.thesis}</p>
                          {thesis.isObsolete === 1 && (
                            <Badge variant="secondary">Obsoleta</Badge>
                          )}
                        </div>
                        {thesis.keywords && (
                          <div className="flex flex-wrap gap-1">
                            {thesis.keywords.split(",").map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingThesis(thesis)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver detalhes
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditThesis(thesis)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA MINUTAS */}
        <TabsContent value="minutas" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar minutas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedDrafts.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirm("drafts")}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar ({selectedDrafts.size})
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Minutas Aprovadas ({filteredDrafts.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedDrafts.size === filteredDrafts.length && filteredDrafts.length > 0}
                    onCheckedChange={toggleAllDrafts}
                  />
                  <span className="text-sm text-muted-foreground">Selecionar todos</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {draftsQuery.isLoading && <p>Carregando...</p>}
              {filteredDrafts.length === 0 && !draftsQuery.isLoading && (
                <p className="text-muted-foreground text-center py-8">Nenhuma minuta encontrada</p>
              )}
              <div className="space-y-4">
                {filteredDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedDrafts.has(draft.id)}
                        onCheckedChange={() => toggleDraftSelection(draft.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge>{draft.draftType}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(draft.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">
                          {draft.editedDraft || draft.originalDraft}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingDraft(draft)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver completo
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA TEMAS */}
        <TabsContent value="temas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Temas Recorrentes</CardTitle>
              <CardDescription>
                Agrupamento automático de teses por palavras-chave
              </CardDescription>
            </CardHeader>
            <CardContent>
              {themes.length === 0 && (
                <p className="text-muted-foreground text-center py-8">Nenhum tema encontrado</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.map(({ theme, count }) => (
                  <Card
                    key={theme}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setSearchTerm(theme);
                      setActiveTab("teses");
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{theme}</CardTitle>
                      <CardDescription>{count} {count === 1 ? "tese" : "teses"}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Ver Tese */}
      <Dialog open={!!viewingThesis} onOpenChange={() => setViewingThesis(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Tese</DialogTitle>
          </DialogHeader>
          {viewingThesis && (
            <div className="space-y-4">
              <div>
                <Label>Tese</Label>
                <p className="text-sm mt-1">{viewingThesis.thesis}</p>
              </div>
              {viewingThesis.legalFoundations && (
                <div>
                  <Label>Fundamentos Legais</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{viewingThesis.legalFoundations}</p>
                </div>
              )}
              {viewingThesis.keywords && (
                <div>
                  <Label>Palavras-chave</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingThesis.keywords.split(",").map((keyword: string, idx: number) => (
                      <Badge key={idx} variant="outline">{keyword.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewingThesis.decisionPattern && (
                <div>
                  <Label>Padrão de Decisão</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{viewingThesis.decisionPattern}</p>
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
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="thesis">Tese</Label>
              <Textarea
                id="thesis"
                value={editForm.thesis}
                onChange={(e) => setEditForm({ ...editForm, thesis: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="legalFoundations">Fundamentos Legais</Label>
              <Textarea
                id="legalFoundations"
                value={editForm.legalFoundations}
                onChange={(e) => setEditForm({ ...editForm, legalFoundations: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="keywords"
                value={editForm.keywords}
                onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="decisionPattern">Padrão de Decisão</Label>
              <Textarea
                id="decisionPattern"
                value={editForm.decisionPattern}
                onChange={(e) => setEditForm({ ...editForm, decisionPattern: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingThesis(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateThesisMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver Minuta */}
      <Dialog open={!!viewingDraft} onOpenChange={() => setViewingDraft(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Minuta Aprovada</DialogTitle>
            <DialogDescription>
              Tipo: {viewingDraft?.draftType} | Data: {viewingDraft && new Date(viewingDraft.createdAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {viewingDraft && (
            <div className="space-y-4">
              <div>
                <Label>Conteúdo</Label>
                <div className="mt-2 p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                  {viewingDraft.editedDraft || viewingDraft.originalDraft}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Deleção em Massa */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm === "theses" && (
                <>Tem certeza que deseja deletar {selectedTheses.size} tese(s)? Esta ação não pode ser desfeita.</>
              )}
              {deleteConfirm === "drafts" && (
                <>Tem certeza que deseja deletar {selectedDrafts.size} minuta(s)? Esta ação não pode ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm === "theses") handleBulkDeleteTheses();
                if (deleteConfirm === "drafts") handleBulkDeleteDrafts();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
