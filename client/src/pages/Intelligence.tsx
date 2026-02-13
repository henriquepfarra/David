import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PendingTheses from "./Intelligence/PendingTheses";
import KnowledgeLibrary from "./Intelligence/KnowledgeLibrary";
import ApprovedDrafts from "./Intelligence/ApprovedDrafts";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * Página Intelligence - Memória Jurídica
 *
 * Página unificada de Active Learning:
 * - Aba 1: Caixa de Entrada (Teses pendentes de revisão)
 * - Aba 2: Teses Ativas (Biblioteca + edição/exclusão)
 * - Aba 3: Minutas Aprovadas (Histórico de minutas)
 */
export default function IntelligencePage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="border-b px-6 py-4">
                    <h1 className="text-2xl font-bold">Memória Jurídica</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Teses aprendidas, minutas aprovadas e padrões do gabinete
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="pending" className="h-full flex flex-col">
                        <TabsList className="mx-6 mt-4">
                            <TabsTrigger value="pending">Caixa de Entrada</TabsTrigger>
                            <TabsTrigger value="library">Teses Ativas</TabsTrigger>
                            <TabsTrigger value="drafts">Minutas Aprovadas</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending" className="flex-1 overflow-auto mt-4 px-6">
                            <PendingTheses />
                        </TabsContent>

                        <TabsContent value="library" className="flex-1 overflow-auto mt-4 px-6">
                            <KnowledgeLibrary />
                        </TabsContent>

                        <TabsContent value="drafts" className="flex-1 overflow-auto mt-4 px-6">
                            <ApprovedDrafts />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </DashboardLayout>
    );
}
