import { useState } from "react";
import { trpc } from "@/lib/trpc";
import ThesisCard from "./components/ThesisCard";
import SimilarThesisDialog from "./components/SimilarThesisDialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PendingTheses() {
    const utils = trpc.useUtils();
    const { data: theses, isLoading, refetch } = trpc.thesis.getPendingTheses.useQuery();

    // Estado para fluxo de deduplicação
    const [checkingThesisId, setCheckingThesisId] = useState<number | null>(null);
    const [similarTheses, setSimilarTheses] = useState<Array<{
        id: number;
        legalThesis: string;
        legalFoundations: string | null;
        keywords: string | null;
        similarity: number;
    }>>([]);
    const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

    const invalidateAll = () => {
        refetch();
        utils.thesis.getPendingCount.invalidate();
        utils.thesis.getActiveTheses.invalidate();
        utils.thesis.getThesisStats.invalidate();
    };

    const approveThesisMutation = trpc.thesis.approveThesis.useMutation({
        onSuccess: () => invalidateAll(),
    });

    const approveWithResolutionMutation = trpc.thesis.approveWithResolution.useMutation({
        onSuccess: () => {
            invalidateAll();
            setConflictDialogOpen(false);
            setCheckingThesisId(null);
            toast.success("Tese aprovada com sucesso!");
        },
    });

    const editThesisMutation = trpc.thesis.editThesis.useMutation({
        onSuccess: () => invalidateAll(),
    });

    const rejectThesisMutation = trpc.thesis.rejectThesis.useMutation({
        onSuccess: () => invalidateAll(),
    });

    // Fluxo de aprovação com verificação de similaridade
    const handleApprove = async (thesisId: number) => {
        setCheckingThesisId(thesisId);
        try {
            const result = await utils.thesis.checkSimilarTheses.fetch({ thesisId });

            if (result.similarTheses.length > 0) {
                // Teses similares encontradas — mostrar dialog
                setSimilarTheses(result.similarTheses);
                setConflictDialogOpen(true);
            } else {
                // Nenhuma similar — aprovar direto
                approveThesisMutation.mutate({ thesisId });
                setCheckingThesisId(null);
            }
        } catch {
            // Fallback: aprovar sem verificação
            approveThesisMutation.mutate({ thesisId });
            setCheckingThesisId(null);
        }
    };

    const handleResolution = (resolution: "keep_both" | "replace" | "merge", replaceThesisId?: number) => {
        if (!checkingThesisId) return;
        approveWithResolutionMutation.mutate({
            thesisId: checkingThesisId,
            resolution,
            replaceThesisId,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!theses || theses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma tese pendente</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    Aprove minutas para que o David aprenda com suas decisões.
                    As teses extraídas aparecerão aqui para sua revisão.
                </p>
            </div>
        );
    }

    const isMutating =
        approveThesisMutation.isPending ||
        editThesisMutation.isPending ||
        rejectThesisMutation.isPending ||
        approveWithResolutionMutation.isPending;

    return (
        <>
            <div className="space-y-4 pb-6">
                <div className="mb-6">
                    <p className="text-sm text-muted-foreground">
                        {theses.length} {theses.length === 1 ? "tese aguardando" : "teses aguardando"} sua revisão
                    </p>
                </div>

                {theses.map((thesis) => (
                    <ThesisCard
                        key={thesis.id}
                        thesis={thesis}
                        onApprove={() => handleApprove(thesis.id)}
                        onEdit={(editedData) =>
                            editThesisMutation.mutate({
                                thesisId: thesis.id,
                                ...editedData,
                            })
                        }
                        onReject={(reason) =>
                            rejectThesisMutation.mutate({
                                thesisId: thesis.id,
                                rejectionReason: reason,
                            })
                        }
                        isLoading={isMutating || checkingThesisId === thesis.id}
                    />
                ))}
            </div>

            <SimilarThesisDialog
                open={conflictDialogOpen}
                onOpenChange={(open) => {
                    setConflictDialogOpen(open);
                    if (!open) setCheckingThesisId(null);
                }}
                similarTheses={similarTheses}
                onResolution={handleResolution}
                isLoading={approveWithResolutionMutation.isPending}
            />
        </>
    );
}
