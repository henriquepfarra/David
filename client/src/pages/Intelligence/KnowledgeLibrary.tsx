import { trpc } from "@/lib/trpc";
import StatsWidget from "./components/StatsWidget";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import PendingTheses from "./PendingTheses";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function KnowledgeLibrary() {
    const [search, setSearch] = useState("");
    const { data: stats } = trpc.thesis.getThesisStats.useQuery();
    const { data: theses, isLoading } = trpc.thesis.getActiveTheses.useQuery({
        search,
        limit: 50,
        offset: 0,
    });

    // Buscar contagem de pendentes para o badge da aba
    const { data: pendingData } = trpc.thesis.getPendingCount.useQuery();
    const pendingCount = pendingData?.count ?? 0;

    return (
        <div className="space-y-6 pb-6">
            {/* Stats Widget - Exibido apenas na tab principal ou no topo? No topo fica bom. */}
            {stats && <StatsWidget stats={stats} />}

            <Tabs defaultValue="active" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="active">Teses Ativas</TabsTrigger>
                        <TabsTrigger value="pending" className="relative">
                            Revisão Pendente
                            {pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="active" className="space-y-6">
                    {/* Search */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="🔍 Buscar teses ativas..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Lista de Teses Ativas */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !theses || theses.theses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <div className="text-4xl mb-4">📚</div>
                            <p>Nenhuma tese ativa encontrada</p>
                            {search && <p className="text-sm mt-1">Tente ajustar sua busca</p>}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {theses.theses.map((thesis) => (
                                <div
                                    key={thesis.id}
                                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors bg-card"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium mb-3 text-foreground line-clamp-3">
                                                {thesis.legalThesis}
                                            </p>

                                            {thesis.keywords && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {thesis.keywords.split(",").map((kw, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-[10px] uppercase tracking-wider font-semibold bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-sm"
                                                        >
                                                            {kw.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {thesis.legalFoundations && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/50">
                                                    <span className="font-semibold text-primary/80">Fundamentos: </span>
                                                    {thesis.legalFoundations}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground shrink-0 font-mono bg-muted px-1.5 py-0.5 rounded border">
                                            #{thesis.id}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="pending">
                    <PendingTheses />
                </TabsContent>
            </Tabs>
        </div>
    );
}
