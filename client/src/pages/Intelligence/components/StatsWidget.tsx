import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatsWidgetProps {
    stats: {
        activeCount: number;
        approvedDraftsCount: number;
        lastLearningDate: Date | string | null;
    };
}

export default function StatsWidget({ stats }: StatsWidgetProps) {
    const formatDate = (date: Date | string | null) => {
        if (!date) return "Nunca";
        try {
            const d = typeof date === "string" ? new Date(date) : date;
            return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
        } catch {
            return "Nunca";
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Teses Ativas */}
            <Card className="p-4">
                <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Teses Ativas</span>
                    <span className="text-3xl font-bold mt-1">{stats.activeCount}</span>
                </div>
            </Card>

            {/* Card 2: Minutas Aprovadas */}
            <Card className="p-4">
                <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Minutas Aprovadas</span>
                    <span className="text-3xl font-bold mt-1">{stats.approvedDraftsCount}</span>
                    <span className="text-xs text-muted-foreground mt-1">este mês</span>
                </div>
            </Card>

            {/* Card 3: Último Aprendizado */}
            <Card className="p-4">
                <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Último Aprendizado</span>
                    <span className="text-xl font-bold mt-1">
                        {formatDate(stats.lastLearningDate)}
                    </span>
                </div>
            </Card>
        </div>
    );
}
