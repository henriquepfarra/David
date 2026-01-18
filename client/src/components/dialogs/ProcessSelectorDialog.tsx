/**
 * ProcessSelectorDialog - Seletor de processos para vincular à conversa
 * 
 * Extraído de David.tsx na Fase 8 do plano de refatoração.
 */

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, FileText } from "lucide-react";

interface Process {
    id: number;
    processNumber: string;
    plaintiff: string | null;
    defendant: string | null;
    subject?: string | null;
}

interface ProcessSelectorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    processes?: Process[];
    selectedProcessId?: number;
    onSelectProcess: (process: Process) => void;
    onNavigateToProcesses: () => void;
}

export function ProcessSelectorDialog({
    isOpen,
    onClose,
    processes,
    selectedProcessId,
    onSelectProcess,
    onNavigateToProcesses,
}: ProcessSelectorDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>⚖️ Selecionar Processo Ativo</DialogTitle>
                    <DialogDescription>
                        Selecione o processo que deseja vincular a esta conversa. O contexto do processo será injetado automaticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {processes && processes.length > 0 ? (
                        <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                            {processes.map((process) => (
                                <Card
                                    key={process.id}
                                    className={`p-4 cursor-pointer transition-colors ${selectedProcessId === process.id
                                        ? "border-primary bg-primary/5"
                                        : "hover:border-primary/50"
                                        }`}
                                    onClick={() => onSelectProcess(process)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="font-mono text-sm font-semibold">
                                                {process.processNumber}
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Autor:</span> {process.plaintiff}
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">Réu:</span> {process.defendant}
                                            </div>
                                            {process.subject && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {process.subject}
                                                </div>
                                            )}
                                        </div>
                                        {selectedProcessId === process.id && (
                                            <Check className="h-5 w-5 text-primary" />
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhum processo cadastrado</p>
                            <Button
                                variant="link"
                                onClick={onNavigateToProcesses}
                                className="mt-2"
                            >
                                Cadastrar primeiro processo
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default ProcessSelectorDialog;
