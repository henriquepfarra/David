/**
 * DeleteConversationDialog - Diálogo de confirmação para deletar conversa
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
import { Trash2 } from "lucide-react";

interface DeleteConversationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting?: boolean;
}

export function DeleteConversationDialog({
    isOpen,
    onClose,
    onConfirm,
    isDeleting = false,
}: DeleteConversationDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>🗑️ Deletar Conversa</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? "Deletando..." : "Deletar"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default DeleteConversationDialog;
