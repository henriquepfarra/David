import { trpc } from "@/lib/trpc";
import StatsWidget from "./components/StatsWidget";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function KnowledgeLibrary() {
    const [search, setSearch] = useState("");
    const { data: stats } = trpc.thesis.getThesisStats.useQuery();
    const { data: theses, isLoading } = trpc.thesis.getActiveTheses.useQuery({
        search,
        limit: 50,
        offset: 0,
    });

    return (
        <div className="space-y-6 pb-6">
            {/* Stats Widget */}
            {stats && <StatsWidget stats={stats} />}

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="🔍 Buscar teses..."
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-sm text-muted-foreground">
                        Nenhuma tese encontrada
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {theses.theses.map((thesis) => (
                        <div
                            key={thesis.id}
                            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium mb-2 line-clamp-2">
                                        {thesis.legalThesis}
                                    </p>
                                    {thesis.keywords && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {thesis.keywords.split(",").map((kw, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs bg-muted px-2 py-0.5 rounded-full"
                                                >
                                                    {kw.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {thesis.legalFoundations && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                            Fundamentos: {thesis.legalFoundations}
                                        </p>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground shrink-0">
                                    #{thesis.id}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
