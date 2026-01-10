import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PendingTheses from "./PendingTheses";
import KnowledgeLibrary from "./KnowledgeLibrary";

/**
 * Página Intelligence - Memória Jurídica
 * 
 * Sistema de Active Learning com Quality Gate
 * - Aba 1: Caixa de Entrada (Pending Theses)
 * - Aba 2: Biblioteca (Active Theses + Stats)
 */
export default function IntelligencePage() {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b px-6 py-4">
                <h1 className="text-2xl font-bold">🎓 Memória Jurídica</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Sistema de aprendizado contínuo - Teses e padrões do gabinete
                </p>
            </div>

            {/* Tabs */}
            <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="pending" className="h-full flex flex-col">
                    <TabsList className="mx-6 mt-4">
                        <TabsTrigger value="pending">Caixa de Entrada</TabsTrigger>
                        <TabsTrigger value="library">Biblioteca</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="flex-1 overflow-auto mt-4 px-6">
                        <PendingTheses />
                    </TabsContent>

                    <TabsContent value="library" className="flex-1 overflow-auto mt-4 px-6">
                        <KnowledgeLibrary />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
