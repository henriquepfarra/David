/**
 * UploadProgress - Indicador de progresso de upload
 * 
 * Mostra o progresso durante upload de arquivo.
 */

import { FileText, Loader2 } from 'lucide-react';

export interface UploadState {
    isUploading: boolean;
    stage: 'sending' | 'reading' | 'extracting' | 'done' | null;
    fileName: string | null;
    error: string | null;
}

interface UploadProgressProps {
    uploadState: UploadState;
    className?: string;
}

export function UploadProgress({ uploadState, className = "" }: UploadProgressProps) {
    if (!uploadState.isUploading) return null;

    const getProgressWidth = () => {
        switch (uploadState.stage) {
            case 'sending': return '25%';
            case 'reading': return '50%';
            case 'extracting': return '75%';
            case 'done': return '100%';
            default: return '0%';
        }
    };

    const getStageText = () => {
        switch (uploadState.stage) {
            case 'sending': return 'Enviando...';
            case 'reading': return 'Processando...';
            case 'extracting': return 'Extraindo...';
            case 'done': return 'Concluído!';
            default: return 'Preparando...';
        }
    };

    return (
        <div className={`flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 w-fit max-w-[320px] mb-3 ${className}`}>
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600 relative">
                <FileText className="h-6 w-6" />
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate max-w-[200px]" title={uploadState.fileName || ''}>
                    {uploadState.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-red-500 rounded-full transition-all duration-500"
                            style={{ width: getProgressWidth() }}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {getStageText()}
                    </span>
                </div>
            </div>
        </div>
    );
}
