/**
 * DuplicateProcessDialog - Aviso quando processo já existe em outra conversa
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
import { ChevronRight } from "lucide-react";

interface ExistingConversation {
    id: number;
    title: string;
}

interface DuplicateProcessDialogProps {
    isOpen: boolean;
    onClose: () => void;
    processNumber: string | null;
    existingConversations: ExistingConversation[];
    onNavigateToConversation: (conversationId: number) => void;
    onKeepHere: () => void;
}

export function DuplicateProcessDialog({
    isOpen,
    onClose,
    processNumber,
    existingConversations,
    onNavigateToConversation,
    onKeepHere,
}: DuplicateProcessDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        ⚠️ Processo já existe!
                    </DialogTitle>
                    <DialogDescription>
                        O processo <strong>{processNumber}</strong> já está vinculado a outra(s) conversa(s):
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 my-4">
                    {existingConversations.map((conv) => (
                        <div
                            key={conv.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                            <span className="text-sm font-medium truncate flex-1">{conv.title}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onNavigateToConversation(conv.id)}
                            >
                                <ChevronRight className="h-4 w-4 mr-1" />
                                Ir
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={onKeepHere}>
                        Manter aqui
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default DuplicateProcessDialog;
