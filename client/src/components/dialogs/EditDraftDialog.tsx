/**
 * EditDraftDialog - Diálogo para editar minutas antes de aprovar
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Check } from "lucide-react";

export type DraftType = "sentenca" | "decisao" | "despacho" | "acordao" | "outro";

interface EditDraftDialogProps {
    isOpen: boolean;
    onClose: () => void;
    draft: string;
    onDraftChange: (value: string) => void;
    draftType: DraftType;
    onDraftTypeChange: (value: DraftType) => void;
    onSave: () => void;
    isSaving?: boolean;
}

export function EditDraftDialog({
    isOpen,
    onClose,
    draft,
    onDraftChange,
    draftType,
    onDraftTypeChange,
    onSave,
    isSaving = false,
}: EditDraftDialogProps) {
    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Editar Minuta</DialogTitle>
                    <DialogDescription>
                        Revise e edite a minuta gerada pelo DAVID antes de aprovar
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="draftType">Tipo de Minuta</Label>
                        <Select value={draftType} onValueChange={(value) => onDraftTypeChange(value as DraftType)}>
                            <SelectTrigger id="draftType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sentenca">Sentença</SelectItem>
                                <SelectItem value="decisao">Decisão Interlocutória</SelectItem>
                                <SelectItem value="despacho">Despacho</SelectItem>
                                <SelectItem value="acordao">Acórdão</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="editedDraft">Conteúdo da Minuta</Label>
                        <Textarea
                            id="editedDraft"
                            value={draft}
                            onChange={(e) => onDraftChange(e.target.value)}
                            className="min-h-[400px] font-mono text-sm"
                            placeholder="Edite a minuta aqui..."
                        />
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={handleClose} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={onSave} disabled={!draft.trim() || isSaving}>
                            <Check className="h-4 w-4 mr-2" />
                            {isSaving ? "Salvando..." : "Salvar e Aprovar"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default EditDraftDialog;
