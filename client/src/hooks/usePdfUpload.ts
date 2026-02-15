/**
 * usePdfUpload - Hook para gerenciar upload de PDF
 * 
 * Extraído de David.tsx na Fase 1 do plano de refatoração.
 * Centraliza toda a lógica de upload de arquivos PDF.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

// Tipos
export interface UploadState {
    isUploading: boolean;
    stage: 'sending' | 'reading' | 'extracting' | 'done' | null;
    fileName: string | null;
    error: string | null;
}

export interface AttachedFile {
    name: string;
    uri: string;
    extractedText?: string | null;
}

interface UsePdfUploadOptions {
    /** ID da conversa atual (null = home) */
    selectedConversationId: number | null;
    /** Setter para arquivos anexados (integração direta com David.tsx) */
    setAttachedFiles?: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
    /** Callback quando arquivo é anexado (alternativo ao setter) */
    onFileAttached?: (file: AttachedFile) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function usePdfUpload({
    selectedConversationId,
    setAttachedFiles,
    onFileAttached,
}: UsePdfUploadOptions) {

    // Estado do upload
    const [uploadState, setUploadState] = useState<UploadState>({
        isUploading: false,
        stage: null,
        fileName: null,
        error: null,
    });

    // Utils para invalidação
    const utils = trpc.useUtils();

    // Mutation para atualizar arquivo na conversa
    const updateGoogleFileMutation = trpc.david.updateGoogleFile.useMutation();

    // Mutation para upload rápido (PDF → Google File API)
    const uploadPdfQuickMutation = trpc.processes.uploadPdfQuick.useMutation({
        onMutate: () => {
            setUploadState(prev => ({ ...prev, stage: 'reading' }));
        },
        onSuccess: (data) => {
            setUploadState(prev => ({ ...prev, stage: 'done' }));

            // Vincular arquivo à conversa SE já existir
            if (selectedConversationId) {
                updateGoogleFileMutation.mutate({
                    conversationId: selectedConversationId,
                    googleFileUri: data.fileUri,
                    googleFileName: data.displayName,
                    pdfExtractedText: data.extractedText ?? null,
                });
            }

            // Atualizar attachedFiles (se setter foi passado)
            if (setAttachedFiles) {
                setAttachedFiles(prev => {
                    // Evitar duplicados
                    if (prev.some(f => f.uri === data.fileUri)) return prev;
                    return [...prev, { name: data.displayName, uri: data.fileUri, extractedText: data.extractedText ?? null }];
                });
            }

            // Callback alternativo
            onFileAttached?.({ name: data.displayName, uri: data.fileUri, extractedText: data.extractedText ?? null });

            // Manter isUploading=true por 1s para mostrar animação
            setTimeout(() => {
                setUploadState({ isUploading: false, stage: null, fileName: null, error: null });
            }, 1000);
        },
        onError: (error) => {
            console.error("[UploadQuick] Erro:", error);
            setUploadState(prev => ({ ...prev, isUploading: false, error: error.message }));
            toast.error("Erro no upload: " + error.message);
        }
    });

    // Handler para arquivos dropados
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];

        // Validação de tamanho
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`Arquivo muito grande! Máx: 50MB. Seu: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            return;
        }

        // Validação de tipo
        if (file.type !== 'application/pdf') {
            toast.error(`Tipo não permitido: ${file.type}. Apenas PDF.`);
            return;
        }

        // Validação de extensão
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'pdf') {
            toast.error(`Extensão não permitida: .${extension}. Apenas .pdf`);
            return;
        }

        // Inicia upload
        setUploadState({
            isUploading: true,
            stage: 'sending',
            fileName: file.name,
            error: null,
        });

        try {
            // Converter para base64
            const buffer = await file.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(buffer)
                    .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            await uploadPdfQuickMutation.mutateAsync({
                filename: file.name,
                fileData: base64,
                fileType: 'pdf'
            });

        } catch (error) {
            setUploadState({
                isUploading: false,
                stage: null,
                fileName: null,
                error: (error as Error).message,
            });
            toast.error("Erro no upload: " + (error as Error).message);
        }
    }, [selectedConversationId, uploadPdfQuickMutation]);

    // Configuração do dropzone
    const dropzoneProps = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf']
        },
        maxFiles: 1,
        noClick: true,
        noKeyboard: true
    });

    // Função para resetar estado
    const resetUpload = useCallback(() => {
        setUploadState({
            isUploading: false,
            stage: null,
            fileName: null,
            error: null,
        });
    }, []);

    return {
        // Estado
        uploadState,
        isUploading: uploadState.isUploading,

        // Dropzone props
        ...dropzoneProps,

        // Ações
        resetUpload,

        // Mutations expostas (caso necessário)
        uploadPdfQuickMutation,
    };
}
