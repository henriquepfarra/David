/**
 * ProcessBanner - Card mostrando processo vinculado à conversa
 * 
 * Extraído de David.tsx na Fase 5 do plano de refatoração.
 */

import { Card } from "@/components/ui/card";
import { Gavel } from "lucide-react";

interface ProcessBannerProps {
    processNumber: string;
}

export function ProcessBanner({ processNumber }: ProcessBannerProps) {
    return (
        <div className="flex justify-start mb-6 animate-in slide-in-from-left-2 duration-300">
            <Card className="p-4 bg-secondary/20 border border-primary/20 max-w-[85%] sm:max-w-md shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Gavel className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            Processo Vinculado
                            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        </h3>
                        <p className="text-sm font-medium text-foreground/90 font-mono tracking-tight">
                            {processNumber}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            O contexto deste processo está ativo. Todas as perguntas serão respondidas com base nos documentos dos autos.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default ProcessBanner;
