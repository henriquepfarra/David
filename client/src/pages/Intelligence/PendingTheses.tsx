import { trpc } from "@/lib/trpc";
import ThesisCard from "./components/ThesisCard";
import { Loader2 } from "lucide-react";

export default function PendingTheses() {
    const { data: theses, isLoading, refetch } = trpc.thesis.getPendingTheses.useQuery();
    const approveThesisMutation = trpc.thesis.approveThesis.useMutation({
        onSuccess: () => {
            refetch();
            // Invalidar cache do badge
            trpc.useContext().thesis.getPendingCount.invalidate();
        },
    });
    const editThesisMutation = trpc.thesis.editThesis.useMutation({
        onSuccess: () => {
            refetch();
            trpc.useContext().thesis.getPendingCount.invalidate();
        },
    });
    const rejectThesisMutation = trpc.thesis.rejectThesis.useMutation({
        onSuccess: () => {
            refetch();
            trpc.useContext().thesis.getPendingCount.invalidate();
        },
    });

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

    return (
        <div className="space-y-4 pb-6">
            <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                    📋 {theses.length} {theses.length === 1 ? "tese aguardando" : "teses aguardando"} sua revisão
                </p>
            </div>

            {theses.map((thesis) => (
                <ThesisCard
                    key={thesis.id}
                    thesis={thesis}
                    onApprove={() => approveThesisMutation.mutate({ thesisId: thesis.id })}
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
                    isLoading={
                        approveThesisMutation.isLoading ||
                        editThesisMutation.isLoading ||
                        rejectThesisMutation.isLoading
                    }
                />
            ))}
        </div>
    );
}
