import { Scale, Check, Brain, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/**
 * Componente: Item "Especialização" na Sidebar com Dialog de Seleção
 * Permite ao usuário selecionar o módulo especializado ativo
 */
export function EspecializacaoMenuItem() {
    const [isOpen, setIsOpen] = useState(false);

    // Queries de módulos
    const { data: modulesList } = trpc.modules.list.useQuery();
    const { data: userDefaultModule } = trpc.modules.getUserDefault.useQuery();
    const setUserDefaultModuleMutation = trpc.modules.setUserDefault.useMutation();
    const utils = trpc.useUtils();

    // Encontrar nome do módulo ativo
    const activeModule = modulesList?.find(m => m.slug === userDefaultModule);
    const activeModuleName = activeModule?.name || "Modo Geral";
    const isJEC = userDefaultModule === 'jec';

    const handleSelectModule = (slug: string, name: string) => {
        setUserDefaultModuleMutation.mutate(
            { moduleSlug: slug as any },
            {
                onSuccess: () => {
                    utils.modules.getUserDefault.invalidate();
                    toast.success(`${name} ativado!`);
                    setIsOpen(false);
                },
            }
        );
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left group"
            >
                <Scale className="h-4 w-4 text-primary" />
                <div className="flex-1 min-w-0">
                    <span className="text-sm block">Especialização</span>
                    {/* Mostrar módulo ativo embaixo - maior e colorido */}
                    <span className={`text-xs font-medium truncate block ${isJEC
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}>
                        {activeModuleName}
                    </span>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            ⚡ Especialização Ativa
                        </DialogTitle>
                        <DialogDescription>
                            O DAVID adapta seu raciocínio jurídico para a área selecionada.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap gap-2 py-4">
                        {modulesList?.map((mod) => (
                            <Button
                                key={mod.slug}
                                variant={userDefaultModule === mod.slug ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleSelectModule(mod.slug, mod.name)}
                                disabled={setUserDefaultModuleMutation.isPending}
                                className="gap-2"
                            >
                                {mod.slug === 'jec' && <Scale className="h-3 w-3" />}
                                {mod.slug === 'default' && <Brain className="h-3 w-3" />}
                                {mod.name}
                                {userDefaultModule === mod.slug && <Check className="h-3 w-3" />}
                            </Button>
                        ))}
                    </div>

                    <p className="text-[10px] text-muted-foreground border-t pt-3">
                        * JEC inclui princípios da Lei 9.099/95, enunciados FONAJE e workflows específicos.
                    </p>
                </DialogContent>
            </Dialog>
        </>
    );
}
