import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface Draft {
  id: number;
  title: string;
  content: string;
  draftType: string;
  createdAt: Date | string;
}

export default function Minutas() {
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: drafts, isLoading } = trpc.drafts.listAll.useQuery();

  const deleteMutation = trpc.drafts.delete.useMutation({
    onSuccess: () => {
      utils.drafts.listAll.invalidate();
      toast.success("Minuta excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir minuta: " + error.message);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta minuta?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleView = (draft: Draft) => {
    setSelectedDraft(draft);
    setViewOpen(true);
  };

  const draftTypeLabels = {
    sentenca: "Sentença",
    decisao: "Decisão",
    despacho: "Despacho",
    acordao: "Acórdão",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Minutas Salvas
          </h1>
          <p className="mt-2 text-muted-foreground">
            Visualize e gerencie suas minutas geradas pelo DAVID
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-3/4 mt-2" />
                  <Skeleton className="h-4 w-1/3 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                  <Skeleton className="h-9 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : drafts && drafts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <Card key={draft.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
                        {draftTypeLabels[draft.draftType as keyof typeof draftTypeLabels]}
                      </span>
                      <CardTitle className="text-lg line-clamp-2">{draft.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(draft.createdAt).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(draft.id)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {draft.content.substring(0, 150)}...
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleView(draft)}
                  >
                    Ver Completo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma minuta salva ainda.
                <br />
                Use o DAVID para gerar minutas automaticamente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de visualização */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDraft?.title}</DialogTitle>
            <DialogDescription>
              {selectedDraft &&
                draftTypeLabels[selectedDraft.draftType as keyof typeof draftTypeLabels]} -{" "}
              {selectedDraft && new Date(selectedDraft.createdAt).toLocaleDateString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {selectedDraft && <Streamdown>{selectedDraft.content}</Streamdown>}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
