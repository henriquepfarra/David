/**
 * ProcessDataDialog - Visualização dos dados do processo
 * 
 * Extraído de David.tsx na Fase 8 do plano de refatoração.
 */

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Process {
    id: number;
    processNumber: string;
    plaintiff: string | null;
    defendant: string | null;
    distributionDate?: string | Date | null;
    court?: string | null;
    subject?: string | null;
    facts?: string | null;
    requests?: string | null;
    evidence?: string | null;
}

interface ProcessDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    process?: Process | null;
}

export function ProcessDataDialog({
    isOpen,
    onClose,
    process,
}: ProcessDataDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>📋 Dados do Processo</DialogTitle>
                </DialogHeader>

                {!process ? (
                    <p>Processo não encontrado</p>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Número do Processo</Label>
                                <p className="font-mono font-semibold">{process.processNumber}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Data de Distribuição</Label>
                                <p>
                                    {process.distributionDate
                                        ? new Date(process.distributionDate).toLocaleDateString('pt-BR')
                                        : '-'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Autor/Requerente</Label>
                                <p>{process.plaintiff}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Réu/Requerido</Label>
                                <p>{process.defendant}</p>
                            </div>
                        </div>

                        {process.court && (
                            <div>
                                <Label className="text-muted-foreground">Vara/Juizado</Label>
                                <p>{process.court}</p>
                            </div>
                        )}

                        {process.subject && (
                            <div>
                                <Label className="text-muted-foreground">Assunto</Label>
                                <p>{process.subject}</p>
                            </div>
                        )}

                        {process.facts && (
                            <div>
                                <Label className="text-muted-foreground">Fatos</Label>
                                <p className="text-sm whitespace-pre-wrap">{process.facts}</p>
                            </div>
                        )}

                        {process.requests && (
                            <div>
                                <Label className="text-muted-foreground">Pedidos</Label>
                                <p className="text-sm whitespace-pre-wrap">{process.requests}</p>
                            </div>
                        )}

                        {process.evidence && (
                            <div>
                                <Label className="text-muted-foreground">Provas</Label>
                                <p className="text-sm whitespace-pre-wrap">{process.evidence}</p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default ProcessDataDialog;
