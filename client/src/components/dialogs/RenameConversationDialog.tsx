/**
 * RenameConversationDialog - Diálogo para renomear conversas
 * 
 * Extraído de David.tsx na Fase 8 do plano de refatoração.
 */

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameConversationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentTitle: string;
    onRename: (newTitle: string) => void;
    isRenaming?: boolean;
}

export function RenameConversationDialog({
    isOpen,
    onClose,
    currentTitle,
    onRename,
    isRenaming = false,
}: RenameConversationDialogProps) {
    const [title, setTitle] = useState(currentTitle);

    // Sync title when dialog opens with new conversation
    useEffect(() => {
        if (isOpen) {
            setTitle(currentTitle);
        }
    }, [isOpen, currentTitle]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onRename(title.trim());
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>✏️ Renomear Conversa</DialogTitle>
                    <DialogDescription>
                        Digite um novo título para esta conversa
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="conversationTitle">Título</Label>
                        <Input
                            id="conversationTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Digite o título..."
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isRenaming}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!title.trim() || isRenaming}>
                            {isRenaming ? "Salvando..." : "Salvar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default RenameConversationDialog;
