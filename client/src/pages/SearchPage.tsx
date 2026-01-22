import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * Página de Pesquisa de Conversas (estilo Gemini)
 * Acessada via /david/search
 * Mantém sidebar persistente usando DashboardLayout
 */
export default function SearchPage() {
    const [, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch all conversations
    const { data: conversations } = trpc.david.listConversations.useQuery();

    // Filter conversations by search query
    const filteredConversations = useMemo(() => {
        if (!conversations) return [];
        if (!searchQuery.trim()) return conversations;

        const query = searchQuery.toLowerCase();
        return conversations.filter(conv =>
            conv.title.toLowerCase().includes(query)
        );
    }, [conversations, searchQuery]);

    const handleSelectConversation = (id: number) => {
        // CORRIGIDO: Usar query params ?c=id como o resto do app
        setLocation(`/david?c=${id}`);
    };

    return (
        <DashboardLayout>
            <div className="flex-1 flex flex-col bg-background min-h-0">
                {/* Header */}
                <div className="border-b px-6 py-4">
                    <div className="flex items-center gap-4 max-w-2xl mx-auto">
                        <h1 className="text-xl font-semibold">Pesquisa</h1>
                    </div>
                </div>

                {/* Search Input */}
                <div className="px-6 py-6">
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                autoFocus
                                placeholder="Buscar em conversas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-12 h-12 text-base rounded-full border-2"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-accent rounded-full transition-colors"
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 px-6 overflow-y-auto">
                    <div className="max-w-2xl mx-auto">
                        {searchQuery && (
                            <p className="text-sm text-muted-foreground mb-4">
                                {filteredConversations.length} resultado(s) para "{searchQuery}"
                            </p>
                        )}

                        <div className="space-y-1">
                            {filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => handleSelectConversation(conv.id)}
                                    className="w-full flex items-start gap-4 p-4 rounded-lg hover:bg-accent transition-colors text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium truncate">{conv.title}</h3>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(new Date(conv.updatedAt), {
                                            addSuffix: false,
                                            locale: ptBR,
                                        })}
                                    </span>
                                </button>
                            ))}

                            {searchQuery && filteredConversations.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground">
                                        Nenhuma conversa encontrada para "{searchQuery}"
                                    </p>
                                </div>
                            )}

                            {!searchQuery && filteredConversations.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-muted-foreground">
                                        Nenhuma conversa ainda. Comece uma nova conversa!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
