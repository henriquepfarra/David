import { useState } from "react";
import { trpc } from "@/lib/trpc";
import StatsWidget from "./components/StatsWidget";
import CurationSuggestions from "./components/CurationSuggestions";
import { Loader2, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { toast } from "sonner";

interface ActiveThesis {
    id: number;
    legalThesis: string;
    writingStyleSample: string;
    legalFoundations: string;
    keywords: string;
    createdAt: Date | string | null;
    updatedAt: Date | string | null;
}

export default function KnowledgeLibrary() {
    const [search, setSearch] = useState("");
    const [editingThesis, setEditingThesis] = useState<ActiveThesis | null>(null);
    const [deletingThesisId, setDeletingThesisId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        legalThesis: "",
        legalFoundations: "",
        keywords: "",
    });

    const utils = trpc.useUtils();
    const { data: stats } = trpc.thesis.getThesisStats.useQuery();
    const { data: theses, isLoading } = trpc.thesis.getActiveTheses.useQuery({
        search,
        limit: 50,
        offset: 0,
    });

    const updateMutation = trpc.thesis.updateActiveThesis.useMutation({
        onSuccess: () => {
            toast.success("Tese atualizada!");
            utils.thesis.getActiveTheses.invalidate();
            utils.thesis.getThesisStats.invalidate();
            setEditingThesis(null);
        },
        onError: (error) => {
            toast.error("Erro ao atualizar: " + error.message);
        },
    });

    const deleteMutation = trpc.thesis.deleteThesis.useMutation({
        onSuccess: () => {
            toast.success("Tese deletada!");
            utils.thesis.getActiveTheses.invalidate();
            utils.thesis.getThesisStats.invalidate();
            setDeletingThesisId(null);
        },
        onError: (error) => {
            toast.error("Erro ao deletar: " + error.message);
        },
    });

    const handleStartEdit = (thesis: ActiveThesis) => {
        setEditingThesis(thesis);
        setEditForm({
            legalThesis: thesis.legalThesis,
            legalFoundations: thesis.legalFoundations,
            keywords: thesis.keywords,
        });
    };

    const handleSaveEdit = () => {
        if (!editingThesis) return;
        updateMutation.mutate({
            thesisId: editingThesis.id,
            ...editForm,
        });
    };

    return (
        <div className="space-y-6 pb-6">
            {stats && <StatsWidget stats={stats} />}

            {/* Sugestões de curadoria */}
            <CurationSuggestions />

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Buscar teses ativas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista de Teses Ativas */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : !theses || theses.theses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <div className="text-4xl mb-4">📚</div>
                    <p>Nenhuma tese ativa encontrada</p>
                    {search && (
                        <p className="text-sm mt-1">Tente ajustar sua busca</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {theses.theses.map((thesis) => (
                        <div
                            key={thesis.id}
                            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors bg-card"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium mb-3 text-foreground line-clamp-3">
                                        {thesis.legalThesis}
                                    </p>

                                    {thesis.keywords && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {thesis.keywords
                                                .split(",")
                                                .map((kw, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-[10px] uppercase tracking-wider font-semibold bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-sm"
                                                    >
                                                        {kw.trim()}
                                                    </span>
                                                ))}
                                        </div>
                                    )}

                                    {thesis.legalFoundations && (
                                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                                            <span className="font-semibold text-primary/80">
                                                Fundamentos:{" "}
                                            </span>
                                            {thesis.legalFoundations}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleStartEdit(thesis)}
                                        >
                                            <Edit className="w-4 h-4 mr-1" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() =>
                                                setDeletingThesisId(thesis.id)
                                            }
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Deletar
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground shrink-0 font-mono bg-muted px-1.5 py-0.5 rounded border">
                                    #{thesis.id}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Dialog: Editar Tese */}
            <Dialog
                open={!!editingThesis}
                onOpenChange={() => setEditingThesis(null)}
            >
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Tese</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="legalThesis">Tese Jurídica</Label>
                            <Textarea
                                id="legalThesis"
                                value={editForm.legalThesis}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        legalThesis: e.target.value,
                                    })
                                }
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="legalFoundations">
                                Fundamentos Legais
                            </Label>
                            <Textarea
                                id="legalFoundations"
                                value={editForm.legalFoundations}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        legalFoundations: e.target.value,
                                    })
                                }
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="keywords">
                                Palavras-chave (separadas por vírgula)
                            </Label>
                            <Input
                                id="keywords"
                                value={editForm.keywords}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        keywords: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingThesis(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                        >
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Confirmar Exclusão */}
            <AlertDialog
                open={!!deletingThesisId}
                onOpenChange={() => setDeletingThesisId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Tese</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja deletar esta tese? Esta ação
                            não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deletingThesisId) {
                                    deleteMutation.mutate({
                                        thesisId: deletingThesisId,
                                    });
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Deletar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
