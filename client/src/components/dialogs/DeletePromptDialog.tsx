/**
 * DeletePromptDialog - Diálogo de confirmação para exclusão de prompts
 * 
 * Extraído de David.tsx na Fase 8 do plano de refatoração.
 * Suporta exclusão de um único prompt ou múltiplos prompts selecionados.
 */

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeletePromptDialogProps {
    isOpen: boolean;
    onClose: () => void;
    promptId?: number;
    promptIds?: number[];
    onConfirm: () => void;
    isDeleting?: boolean;
}

export function DeletePromptDialog({
    isOpen,
    onClose,
    promptId,
    promptIds,
    onConfirm,
    isDeleting = false,
}: DeletePromptDialogProps) {
    const isMultiple = promptIds && promptIds.length > 1;
    const count = promptIds?.length || 1;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogDescription>
                        {isMultiple
                            ? `Tem certeza que deseja excluir ${count} prompts selecionados?`
                            : 'Tem certeza que deseja excluir este prompt?'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Excluindo..." : "Excluir"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default DeletePromptDialog;
