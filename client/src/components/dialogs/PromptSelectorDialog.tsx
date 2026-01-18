/**
 * PromptSelectorDialog - Dialog para selecionar e aplicar prompts salvos
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
import { MessageSquare, ChevronRight } from "lucide-react";

interface SavedPrompt {
    id: number;
    title: string;
    content: string;
    category?: string | null;
}

interface PromptSelectorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    prompts?: SavedPrompt[];
    onSelectPrompt: (prompt: SavedPrompt) => void;
    onNavigateToPrompts: () => void;
}

export function PromptSelectorDialog({
    isOpen,
    onClose,
    prompts,
    onSelectPrompt,
    onNavigateToPrompts,
}: PromptSelectorDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>📝 Aplicar Prompt Especializado</DialogTitle>
                    <DialogDescription>
                        Selecione um prompt salvo para aplicar na conversa atual.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {!prompts || prompts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum prompt salvo encontrado.</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => {
                                    onClose();
                                    onNavigateToPrompts();
                                }}
                            >
                                Criar Primeiro Prompt
                            </Button>
                        </div>
                    ) : (
                        prompts.map((prompt) => (
                            <div
                                key={prompt.id}
                                className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                                onClick={() => onSelectPrompt(prompt)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{prompt.title}</h4>
                                        {prompt.category && (
                                            <span className="text-xs text-muted-foreground">
                                                {prompt.category}
                                            </span>
                                        )}
                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                            {prompt.content}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onClose();
                            onNavigateToPrompts();
                        }}
                    >
                        Gerenciar Prompts
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default PromptSelectorDialog;
