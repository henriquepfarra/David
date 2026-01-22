import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Scale, Gavel, Heart, Shield, Building } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const MODULE_ICONS = {
    default: Scale,
    jec: Gavel,
    familia: Heart,
    criminal: Shield,
    fazenda: Building,
} as const;

interface ModuleSelectorProps {
    currentModule: string;
    onModuleChange: (moduleSlug: string) => void;
}

export function ModuleSelector({ currentModule, onModuleChange }: ModuleSelectorProps) {
    const { data: modules } = trpc.modules.list.useQuery();

    const currentModuleData = modules?.find(m => m.slug === currentModule);
    const CurrentIcon = MODULE_ICONS[currentModule as keyof typeof MODULE_ICONS] || Scale;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <CurrentIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentModuleData?.shortName || 'Geral'}</span>
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold">Módulo Especializado</div>
                <DropdownMenuSeparator />
                {modules?.map((module) => {
                    const Icon = MODULE_ICONS[module.slug as keyof typeof MODULE_ICONS] || Scale;
                    const isActive = currentModule === module.slug;
                    const isDisabled = !module.isAvailable;

                    return (
                        <DropdownMenuItem
                            key={module.slug}
                            onClick={() => !isDisabled && onModuleChange(module.slug)}
                            disabled={isDisabled}
                            className={`gap-2 ${isActive ? 'bg-accent' : ''}`}
                        >
                            <Icon className="h-4 w-4" />
                            <div className="flex flex-col flex-1">
                                <span className="font-medium">{module.name}</span>
                                {isDisabled && (
                                    <span className="text-xs text-muted-foreground">Em breve</span>
                                )}
                            </div>
                            {isActive && (
                                <div className="h-2 w-2 rounded-full bg-blue-600" />
                            )}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
