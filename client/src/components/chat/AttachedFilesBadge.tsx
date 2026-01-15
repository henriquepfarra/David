/**
 * AttachedFilesBadge - Badge de arquivos anexados
 * 
 * Mostra os arquivos/processos anexados acima do input.
 */

import { Button } from '@/components/ui/button';
import { FileText, Folder, X } from 'lucide-react';

export interface AttachedFile {
    name: string;
    uri: string;
}

export interface AttachedProcess {
    id: number;
    processNumber: string;
}

interface AttachedFilesBadgeProps {
    /** Arquivos anexados */
    files?: AttachedFile[];
    /** Processo selecionado */
    process?: AttachedProcess | null;
    /** Callback para remover arquivo */
    onRemoveFile?: (uri: string) => void;
    /** Callback para remover processo */
    onRemoveProcess?: () => void;
    /** Classe CSS adicional */
    className?: string;
}

export function AttachedFilesBadge({
    files = [],
    process,
    onRemoveFile,
    onRemoveProcess,
    className = "",
}: AttachedFilesBadgeProps) {
    const hasContent = files.length > 0 || process;

    if (!hasContent) return null;

    return (
        <div className={`flex flex-wrap gap-2 mb-3 ${className}`}>
            {/* Arquivos anexados */}
            {files.map((file) => (
                <div
                    key={file.uri}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 group w-fit max-w-[320px]"
                >
                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate max-w-[200px]" title={file.name}>
                            {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">PDF anexado</p>
                    </div>
                    {onRemoveFile && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveFile(file.uri)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ))}

            {/* Processo selecionado (se não houver arquivos) */}
            {files.length === 0 && process && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 group w-fit max-w-[320px]">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Folder className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate max-w-[200px]" title={process.processNumber}>
                            {process.processNumber || 'Processo anexado'}
                        </p>
                        <p className="text-xs text-muted-foreground">Processo</p>
                    </div>
                    {onRemoveProcess && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={onRemoveProcess}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
