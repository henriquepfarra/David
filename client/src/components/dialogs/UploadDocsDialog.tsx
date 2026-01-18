/**
 * UploadDocsDialog - Dialog para upload de documentos do processo
 * 
 * Extraído de David.tsx na Fase 8 do plano de refatoração.
 * Este dialog permite upload de PDFs, DOCX e TXT para o processo vinculado.
 */

import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";

interface UploadDocsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    processId?: number;
    onUploadFiles: (files: File[]) => Promise<void>;
}

export function UploadDocsDialog({
    isOpen,
    onClose,
    processId,
    onUploadFiles,
}: UploadDocsDialogProps) {
    const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setUploadingFiles(files);
        }
    };

    const handleUpload = async () => {
        if (!processId || uploadingFiles.length === 0) return;

        setIsUploading(true);
        try {
            // Simular progresso para cada arquivo
            for (const file of uploadingFiles) {
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
            }

            await onUploadFiles(uploadingFiles);

            // Marcar como completo
            for (const file of uploadingFiles) {
                setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
            }

            // Limpar e fechar
            setUploadingFiles([]);
            setUploadProgress({});
            onClose();
        } catch {
            // Erro já tratado pelo callback
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        setUploadingFiles([]);
        setUploadProgress({});
    };

    const handleClose = () => {
        handleCancel();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>📎 Upload de Documentos do Processo</DialogTitle>
                    <DialogDescription>
                        Adicione documentos relacionados ao processo atual para enriquecer o contexto do DAVID.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                            Arraste arquivos aqui ou clique para selecionar
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Formatos aceitos: PDF, DOCX, TXT
                        </p>
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            accept=".pdf,.docx,.txt"
                            className="hidden"
                            id="process-docs-upload"
                            onChange={handleFileSelect}
                        />
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => inputRef.current?.click()}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Selecionar Arquivos
                        </Button>
                    </div>

                    {/* Preview de arquivos selecionados */}
                    {uploadingFiles.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Arquivos selecionados:</h4>
                            {uploadingFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span className="text-sm">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            ({(file.size / 1024).toFixed(1)} KB)
                                        </span>
                                    </div>
                                    {uploadProgress[file.name] !== undefined && (
                                        <span className="text-xs text-muted-foreground">
                                            {uploadProgress[file.name]}%
                                        </span>
                                    )}
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleUpload}
                                    className="flex-1"
                                    disabled={isUploading || !processId}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {isUploading ? "Enviando..." : "Enviar Arquivos"}
                                </Button>
                                <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                        💡 <strong>Dica:</strong> Os documentos serão processados e seu conteúdo será disponibilizado para o DAVID usar como referência durante as conversas.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default UploadDocsDialog;
