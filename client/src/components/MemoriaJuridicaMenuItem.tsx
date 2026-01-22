import { GraduationCap } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * Componente: Item "Memória Jurídica" com Badge de Teses Pendentes
 * 
 * - Query TRPC: thesis.getPendingCount
 * - Polling: 30s (refetch automático)
 * - Badge vermelho: aparecer quando count > 0
 */
export function MemoriaJuridicaMenuItem() {
    const [location, setLocation] = useLocation();

    // Query com polling de 30s para atualizar badge
    const { data: pendingData } = trpc.thesis.getPendingCount.useQuery(undefined, {
        refetchInterval: 30000, // 30 segundos
        staleTime: 60000, // Cache de 1 minuto
    });

    const pendingCount = pendingData?.count ?? 0;
    const isActive = location === "/intelligence";

    return (
        <button
            onClick={() => setLocation("/intelligence")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left relative ${isActive ? "bg-accent" : "hover:bg-accent"
                }`}
        >
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span className="text-sm flex-1">Memória Jurídica</span>
            {pendingCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-red-500 rounded-full shrink-0">
                    {pendingCount > 9 ? "9+" : pendingCount}
                </span>
            )}
        </button>
    );
}
