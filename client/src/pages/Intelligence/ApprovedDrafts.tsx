import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Eye, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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

interface Draft {
    id: number;
    originalDraft: string;
    editedDraft: string | null;
    draftType: string;
    approvalStatus: string | null;
    userNotes: string | null;
    createdAt: Date | string | null;
}

export default function ApprovedDrafts() {
    const [search, setSearch] = useState("");
    const [viewingDraft, setViewingDraft] = useState<Draft | null>(null);
    const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);

    const utils = trpc.useUtils();
    const { data: drafts, isLoading } = trpc.thesis.listApprovedDrafts.useQuery();

    const deleteMutation = trpc.thesis.deleteApprovedDraft.useMutation({
        onSuccess: () => {
            toast.success("Minuta deletada!");
            utils.thesis.listApprovedDrafts.invalidate();
            utils.thesis.getThesisStats.invalidate();
            setDeletingDraftId(null);
        },
        onError: (error) => {
            toast.error("Erro ao deletar: " + error.message);
        },
    });

    const filteredDrafts = (drafts || []).filter(
        (d) =>
            d.originalDraft?.toLowerCase().includes(search.toLowerCase()) ||
            d.draftType?.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">
            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Buscar minutas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista */}
            {filteredDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <div className="text-4xl mb-4">📝</div>
                    <p>Nenhuma minuta aprovada encontrada</p>
                    {search && (
                        <p className="text-sm mt-1">Tente ajustar sua busca</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredDrafts.map((draft) => (
                        <div
                            key={draft.id}
                            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors bg-card"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline">
                                            {draft.draftType}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {draft.createdAt
                                                ? new Date(
                                                      draft.createdAt
                                                  ).toLocaleDateString("pt-BR")
                                                : ""}
                                        </span>
                                    </div>
                                    <p className="text-sm line-clamp-2 text-foreground">
                                        {draft.editedDraft || draft.originalDraft}
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setViewingDraft(draft)
                                            }
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            Ver completo
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() =>
                                                setDeletingDraftId(draft.id)
                                            }
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Deletar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Dialog: Ver Minuta */}
            <Dialog
                open={!!viewingDraft}
                onOpenChange={() => setViewingDraft(null)}
            >
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Minuta Aprovada</DialogTitle>
                        <DialogDescription>
                            Tipo: {viewingDraft?.draftType} | Data:{" "}
                            {viewingDraft?.createdAt
                                ? new Date(
                                      viewingDraft.createdAt
                                  ).toLocaleDateString("pt-BR")
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingDraft && (
                        <div className="mt-2 p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap text-sm">
                            {viewingDraft.editedDraft ||
                                viewingDraft.originalDraft}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog: Confirmar Exclusão */}
            <AlertDialog
                open={!!deletingDraftId}
                onOpenChange={() => setDeletingDraftId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Minuta</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja deletar esta minuta? Esta ação
                            não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deletingDraftId) {
                                    deleteMutation.mutate({
                                        draftId: deletingDraftId,
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
