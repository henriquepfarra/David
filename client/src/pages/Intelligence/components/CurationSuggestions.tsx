import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Layers, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CurationSuggestions() {
    const [expanded, setExpanded] = useState(true);
    const [deletingThesisId, setDeletingThesisId] = useState<number | null>(null);

    const utils = trpc.useUtils();
    const { data, isLoading } = trpc.thesis.getCurationSuggestions.useQuery(undefined, {
        staleTime: 5 * 60 * 1000, // Cache 5 min
    });

    const deleteMutation = trpc.thesis.deleteThesis.useMutation({
        onSuccess: () => {
            toast.success("Tese removida!");
            utils.thesis.getCurationSuggestions.invalidate();
            utils.thesis.getActiveTheses.invalidate();
            utils.thesis.getThesisStats.invalidate();
            setDeletingThesisId(null);
        },
        onError: (error) => {
            toast.error("Erro: " + error.message);
        },
    });

    if (isLoading) return null;
    if (!data) return null;

    const totalSuggestions = data.unusedTheses.length + data.clusters.length;
    if (totalSuggestions === 0) return null;

    return (
        <>
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader
                    className="pb-2 cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-600" />
                            Sugestoes de curadoria
                            <Badge variant="secondary" className="text-xs">
                                {totalSuggestions}
                            </Badge>
                        </span>
                        {expanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </CardTitle>
                </CardHeader>

                {expanded && (
                    <CardContent className="space-y-4 pt-0">
                        {/* Teses nunca usadas */}
                        {data.unusedTheses.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Teses nunca resgatadas pelo David
                                </h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Estas teses foram criadas ha mais de 30 dias e nunca foram
                                    utilizadas nas respostas. Considere revisar ou remover.
                                </p>
                                <div className="space-y-2">
                                    {data.unusedTheses.map((thesis) => (
                                        <div
                                            key={thesis.id}
                                            className="flex items-start justify-between gap-3 p-3 bg-background rounded-md border"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        #{thesis.id}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px]"
                                                    >
                                                        {thesis.daysSinceCreation} dias
                                                    </Badge>
                                                </div>
                                                <p className="text-sm line-clamp-2">
                                                    {thesis.legalThesis}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 text-destructive hover:text-destructive h-8 w-8"
                                                onClick={() => setDeletingThesisId(thesis.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Clusters de teses similares */}
                        {data.clusters.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Teses com conteudo similar
                                </h4>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Estes grupos contem teses com alta similaridade. Considere
                                    mesclar ou remover duplicatas.
                                </p>
                                <div className="space-y-3">
                                    {data.clusters.map((cluster, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-background rounded-md border"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-xs font-medium">
                                                    {cluster.theses.length} teses
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px]"
                                                >
                                                    {cluster.avgSimilarity}% similar
                                                </Badge>
                                            </div>
                                            <div className="space-y-1.5">
                                                {cluster.theses.map((t) => (
                                                    <div
                                                        key={t.id}
                                                        className="flex items-start justify-between gap-2"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-[10px] font-mono text-muted-foreground mr-1">
                                                                #{t.id}
                                                            </span>
                                                            <span className="text-xs line-clamp-1">
                                                                {t.legalThesis}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="shrink-0 text-destructive hover:text-destructive h-6 w-6"
                                                            onClick={() =>
                                                                setDeletingThesisId(t.id)
                                                            }
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Dialog: Confirmar Exclusão */}
            <AlertDialog
                open={!!deletingThesisId}
                onOpenChange={() => setDeletingThesisId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover Tese</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover esta tese? Esta acao nao pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deletingThesisId) {
                                    deleteMutation.mutate({ thesisId: deletingThesisId });
                                }
                            }}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
