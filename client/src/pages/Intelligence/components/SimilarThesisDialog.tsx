import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRightLeft, Copy, Loader2, Merge } from "lucide-react";

interface SimilarThesis {
    id: number;
    legalThesis: string;
    legalFoundations: string | null;
    keywords: string | null;
    similarity: number; // 0-100
}

interface SimilarThesisDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    similarTheses: SimilarThesis[];
    onResolution: (resolution: "keep_both" | "replace" | "merge", replaceThesisId?: number) => void;
    isLoading?: boolean;
}

export default function SimilarThesisDialog({
    open,
    onOpenChange,
    similarTheses,
    onResolution,
    isLoading,
}: SimilarThesisDialogProps) {
    const [selectedThesisId, setSelectedThesisId] = useState<number | null>(null);

    // Selecionar a primeira similar por padrão quando o dialog abre
    const activeThesis = selectedThesisId
        ? similarTheses.find((t) => t.id === selectedThesisId)
        : similarTheses[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Tese similar encontrada
                    </DialogTitle>
                    <DialogDescription>
                        {similarTheses.length === 1
                            ? "Foi encontrada uma tese ativa com conteúdo similar. Como deseja proceder?"
                            : `Foram encontradas ${similarTheses.length} teses ativas com conteúdo similar. Como deseja proceder?`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Lista de teses similares */}
                    {similarTheses.map((thesis) => (
                        <Card
                            key={thesis.id}
                            className={`cursor-pointer transition-colors ${
                                activeThesis?.id === thesis.id
                                    ? "border-primary ring-1 ring-primary"
                                    : "hover:border-muted-foreground/30"
                            }`}
                            onClick={() => setSelectedThesisId(thesis.id)}
                        >
                            <CardContent className="pt-4 pb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">
                                        Tese ativa #{thesis.id}
                                    </span>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {thesis.similarity}% similar
                                    </Badge>
                                </div>
                                <p className="text-sm line-clamp-3">{thesis.legalThesis}</p>
                                {thesis.keywords && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {thesis.keywords
                                            .split(",")
                                            .slice(0, 4)
                                            .map((kw, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs bg-muted px-2 py-0.5 rounded-full"
                                                >
                                                    {kw.trim()}
                                                </span>
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    {/* Substituir */}
                    <Button
                        onClick={() =>
                            onResolution("replace", activeThesis?.id)
                        }
                        disabled={isLoading || !activeThesis}
                        variant="default"
                        className="w-full justify-start"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                        )}
                        Substituir tese #{activeThesis?.id} pela nova
                    </Button>

                    {/* Mesclar */}
                    <Button
                        onClick={() =>
                            onResolution("merge", activeThesis?.id)
                        }
                        disabled={isLoading || !activeThesis}
                        variant="outline"
                        className="w-full justify-start"
                    >
                        <Merge className="h-4 w-4 mr-2" />
                        Mesclar fundamentos e manter a nova
                    </Button>

                    {/* Manter ambas */}
                    <Button
                        onClick={() => onResolution("keep_both")}
                        disabled={isLoading}
                        variant="ghost"
                        className="w-full justify-start"
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Manter ambas (são teses distintas)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
