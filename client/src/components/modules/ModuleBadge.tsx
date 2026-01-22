import { Badge } from '@/components/ui/badge';
import { Gavel, Heart, Shield, Building, Scale } from 'lucide-react';

const MODULE_CONFIG = {
    jec: { icon: Gavel, label: 'JEC', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    familia: { icon: Heart, label: 'Família', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    criminal: { icon: Shield, label: 'Penal', color: 'bg-red-100 text-red-700 border-red-200' },
    fazenda: { icon: Building, label: 'Fazenda', color: 'bg-green-100 text-green-700 border-green-200' },
    default: { icon: Scale, label: 'Geral', color: 'bg-gray-100 text-gray-700 border-gray-200' },
} as const;

interface ModuleBadgeProps {
    moduleSlug: string;
    showDefault?: boolean; // Se true, mostra badge mesmo para 'default'
}

export function ModuleBadge({ moduleSlug, showDefault = false }: ModuleBadgeProps) {
    // Não mostra badge para módulo default (a menos que explicitamente solicitado)
    if (moduleSlug === 'default' && !showDefault) {
        return null;
    }

    const config = MODULE_CONFIG[moduleSlug as keyof typeof MODULE_CONFIG] || MODULE_CONFIG.default;
    const Icon = config.icon;

    return (
        <Badge variant="outline" className={`gap-1 ${config.color}`}>
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
}
