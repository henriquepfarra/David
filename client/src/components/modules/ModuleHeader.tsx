import { ModuleSelector } from './ModuleSelector';
import { ModuleBadge } from './ModuleBadge';
import type { ModuleSlug } from '@/types/modules';

interface ModuleHeaderProps {
    currentModule: ModuleSlug;
    onModuleChange: (moduleSlug: ModuleSlug) => void;
    showInChat?: boolean; // Se true, mostra no header do chat; se false, não renderiza (usado na home)
}

/**
 * Header de módulos - Selector + Badge
 * Componente extraído seguindo padrão de refatoração
 */
export function ModuleHeader({ currentModule, onModuleChange, showInChat = true }: ModuleHeaderProps) {
    if (!showInChat) {
        return null;
    }

    const handleModuleChange = (moduleSlug: string) => {
        onModuleChange(moduleSlug as ModuleSlug);
    };

    return (
        <div className="flex items-center gap-2">
            <ModuleBadge moduleSlug={currentModule} />
            <ModuleSelector currentModule={currentModule} onModuleChange={handleModuleChange} />
        </div>
    );
}
