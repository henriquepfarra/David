import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Wrench,
  Scale,
  MessageSquare,
  Brain,
  BookOpen,
  ChevronRight,
} from "lucide-react";

interface ToolsMenuProps {
  onSelectProcess?: () => void;
  onViewProcessData?: () => void;
  onUploadDocuments?: () => void;
  onSelectPrompt?: () => void;
  onSearchPrecedents?: () => void;
  onViewMemory?: () => void;
  onUploadKnowledge?: () => void;
  onManageKnowledge?: () => void;
}

export function ToolsMenu({
  onSelectProcess,
  onViewProcessData,
  onUploadDocuments,
  onSelectPrompt,
  onSearchPrecedents,
  onViewMemory,
  onUploadKnowledge,
  onManageKnowledge,
}: ToolsMenuProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action?: () => void) => {
    if (action) {
      action();
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          title="Ferramentas"
        >
          <Wrench className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-1">
          {/* Categoria: Processos */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Scale className="h-4 w-4" />
              Processos
            </div>
            <div className="space-y-0.5 ml-6">
              <button
                onClick={() => handleAction(onSelectProcess)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <span>Selecionar processo ativo</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAction(onViewProcessData)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <span>Ver dados do processo atual</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAction(onUploadDocuments)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <span>Upload de documentos</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-px bg-border my-1" />

          {/* Categoria: Prompts Especializados */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <MessageSquare className="h-4 w-4" />
              Prompts Especializados
            </div>
            <div className="space-y-0.5 ml-6">
              <button
                onClick={() => handleAction(onSelectPrompt)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <span>Aplicar prompt salvo</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-px bg-border my-1" />

          {/* Categoria: Memória do DAVID */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Brain className="h-4 w-4" />
              Memória do DAVID
            </div>
            <div className="space-y-0.5 ml-6">
              <button
                onClick={() => handleAction(onSearchPrecedents)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <span>Buscar precedentes similares</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAction(onViewMemory)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <span>Ver memória completa</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-px bg-border my-1" />

          {/* Categoria: Base de Conhecimento */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <BookOpen className="h-4 w-4" />
              Base de Conhecimento
            </div>
            <div className="space-y-0.5 ml-6">
              <button
                onClick={() => handleAction(onUploadKnowledge)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <span>Upload de documentos</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAction(onManageKnowledge)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <span>Gerenciar documentos</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
