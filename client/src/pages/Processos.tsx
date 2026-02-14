import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { FileText, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { ProcessRegistrationModal } from "@/components/ProcessRegistrationModal";

export default function Processos() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: processes, isLoading } = trpc.processes.list.useQuery();

  const deleteMutation = trpc.processes.delete.useMutation({
    onSuccess: () => {
      utils.processes.list.invalidate();
      toast.success("Processo excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir processo: " + error.message);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este processo?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Processos</h1>
            <p className="mt-2 text-muted-foreground">
              Importe autos, analise fatos e gerencie sua carga de processual.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} size="lg" className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" />
            Novo Processo
          </Button>
        </div>

        <ProcessRegistrationModal
          open={open}
          onOpenChange={setOpen}
          onSuccess={() => utils.processes.list.invalidate()}
        />

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-9 w-full mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : processes && processes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {processes.map((process) => (
              <Card key={process.id} className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-muted/40 hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-lg font-semibold font-mono tracking-tight text-primary/80">
                        {process.processNumber}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {process.court || "Vara não informada"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(process.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Autor</span>
                      <span className="font-medium truncate max-w-[150px]">{process.plaintiff || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Réu</span>
                      <span className="font-medium truncate max-w-[150px]">{process.defendant || "-"}</span>
                    </div>
                  </div>

                  {process.subject && (
                    <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground line-clamp-2 min-h-[3rem]">
                      {process.subject}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button asChild variant="secondary" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Link href={`/processo/${process.id}`} className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4" />
                        Ver Autos
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-muted/10">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum processo encontrado</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Comece importando um PDF do PJe ou E-SAJ para análise automática.
              </p>
              <Button onClick={() => setOpen(true)} className="mt-6" variant="outline">
                Cadastrar Primeiro Processo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
