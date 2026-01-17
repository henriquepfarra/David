/**
 * FilesModal - Modal para mostrar arquivos anexados
 * 
 * Extraído de David.tsx na Fase 8 do plano de refatoração.
 */

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";

interface AttachedFile {
    name: string;
    uri: string;
}

interface FilesModalProps {
    isOpen: boolean;
    onClose: () => void;
    attachedFiles: AttachedFile[];
}

export function FilesModal({
    isOpen,
    onClose,
    attachedFiles,
}: FilesModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Arquivos</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Seção: Criação */}
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-gray-700">Criação</h3>
                        <p className="text-sm text-gray-500">Você ainda não criou nada</p>
                    </div>

                    {/* Seção: Adicionado */}
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-gray-700">Adicionado</h3>
                        {attachedFiles.length === 0 ? (
                            <p className="text-sm text-gray-500">Nenhum arquivo anexado</p>
                        ) : (
                            <div className="space-y-2">
                                {attachedFiles.map((file) => (
                                    <div
                                        key={file.uri}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                                    >
                                        <div className="p-2 bg-red-50 rounded">
                                            <FileText className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-gray-500">PDF</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default FilesModal;
