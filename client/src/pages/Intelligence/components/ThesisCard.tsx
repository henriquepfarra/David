import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, Edit, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ThesisCardProps {
    thesis: {
        id: number;
        legalThesis: string;
        writingStyleSample: string | null;
        legalFoundations: string | null;
        keywords: string | null;
        createdAt: Date | string;
    };
    onApprove: () => void;
    onEdit: (data: { editedLegalThesis?: string; editedWritingStyle?: string }) => void;
    onReject: (reason: string) => void;
    isLoading?: boolean;
}

export default function ThesisCard({ thesis, onApprove, onEdit, onReject, isLoading }: ThesisCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedLegalThesis, setEditedLegalThesis] = useState(thesis.legalThesis);
    const [editedWritingStyle, setEditedWritingStyle] = useState(thesis.writingStyleSample || "");
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    const handleApprove = () => {
        if (isEditing) {
            // Salvar edições e aprovar
            onEdit({
                editedLegalThesis,
                editedWritingStyle: editedWritingStyle || undefined,
            });
            setIsEditing(false);
        } else {
            // Aprovar sem edições
            onApprove();
        }
    };

    const handleReject = () => {
        if (rejectionReason.trim()) {
            onReject(rejectionReason);
            setRejectDialogOpen(false);
            setRejectionReason("");
        }
    };

    return (
        <>
            <Card className="border-2">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">Tese #{thesis.id}</span>
                                <Badge variant="outline" className="text-xs">Pendente</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Extraída em {new Date(thesis.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Legal Thesis */}
                    <div>
                        <label className="text-sm font-semibold mb-2 block">Tese Jurídica (Motor C - Argumentação)</label>
                        {isEditing ? (
                            <Textarea
                                value={editedLegalThesis}
                                onChange={(e) => setEditedLegalThesis(e.target.value)}
                                className="min-h-[100px]"
                                placeholder="Ratio decidendi..."
                            />
                        ) : (
                            <p className="text-sm bg-muted p-3 rounded-md">{thesis.legalThesis}</p>
                        )}
                    </div>

                    {/* Writing Style */}
                    {(thesis.writingStyleSample || isEditing) && (
                        <div>
                            <label className="text-sm font-semibold mb-2 block">Amostra de Estilo (Motor B - Redação)</label>
                            {isEditing ? (
                                <Textarea
                                    value={editedWritingStyle}
                                    onChange={(e) => setEditedWritingStyle(e.target.value)}
                                    className="min-h-[80px]"
                                    placeholder="Parágrafo representativo do estilo..."
                                />
                            ) : (
                                <p className="text-sm bg-muted p-3 rounded-md italic">{thesis.writingStyleSample}</p>
                            )}
                        </div>
                    )}

                    {/* Legal Foundations */}
                    {thesis.legalFoundations && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Fundamentos</label>
                            <p className="text-sm">{thesis.legalFoundations}</p>
                        </div>
                    )}

                    {/* Keywords */}
                    {thesis.keywords && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1 ">Palavras-chave</label>
                            <div className="flex flex-wrap gap-1">
                                {thesis.keywords.split(",").map((kw, idx) => (
                                    <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                        {kw.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex items-center gap-2 pt-4 border-t">
                    {/* Botão Aprovar - Verde, grande */}
                    <Button
                        onClick={handleApprove}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        <Check className="h-4 w-4 mr-2" />
                        {isEditing ? "Salvar e Aprovar" : "Aprovar"}
                    </Button>

                    {/* Botão Editar */}
                    {!isEditing && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            disabled={isLoading}
                            variant="outline"
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                    )}

                    {/* Cancelar edição */}
                    {isEditing && (
                        <Button
                            onClick={() => {
                                setIsEditing(false);
                                setEditedLegalThesis(thesis.legalThesis);
                                setEditedWritingStyle(thesis.writingStyleSample || "");
                            }}
                            variant="outline"
                        >
                            Cancelar
                        </Button>
                    )}

                    {/* Botão Rejeitar - Discreto */}
                    <Button
                        onClick={() => setRejectDialogOpen(true)}
                        disabled={isLoading}
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Rejeitar
                    </Button>
                </CardFooter>
            </Card>

            {/* Dialog de Rejeição */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeitar Tese</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">
                            Por que está rejeitando esta tese?
                        </label>
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ex: Tese incorreta, não representa meu entendimento, etc."
                            className="min-h-[80px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleReject}
                            disabled={!rejectionReason.trim()}
                            variant="destructive"
                        >
                            Rejeitar Tese
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
