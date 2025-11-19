import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { processFile, FileProcessingResult } from "@/lib/fileProcessor";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface FileUploaderProps {
  maxFiles?: number;
  onProcessComplete: (result: FileProcessingResult) => void;
  acceptedTypes?: string[];
}

export default function FileUploader({ 
  maxFiles = 5, 
  onProcessComplete,
  acceptedTypes = [".pdf", ".docx", ".txt"]
}: FileUploaderProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const filesToProcess = acceptedFiles.slice(0, maxFiles);
      setFiles(filesToProcess);
      setProcessing(true);
      setProgress("Iniciando processamento...");

      try {
        for (let i = 0; i < filesToProcess.length; i++) {
          const file = filesToProcess[i];
          setProgress(`Processando ${file.name} (${i + 1}/${filesToProcess.length})...`);

          const result = await processFile(file);

          if (result.error) {
            toast.error(`Erro ao processar ${file.name}: ${result.error}`);
            continue;
          }

          if (result.text) {
            onProcessComplete(result);
            toast.success(`${file.name} processado com sucesso via ${result.method.toUpperCase()}`);
          } else {
            toast.error(`Nenhum texto encontrado em ${file.name}`);
          }
        }

        setProgress("Processamento concluído!");
        setTimeout(() => {
          setFiles([]);
          setProgress("");
        }, 2000);
      } catch (error: any) {
        console.error("Erro no processamento:", error);
        toast.error("Erro ao processar arquivos: " + error.message);
      } finally {
        setProcessing(false);
      }
    },
    [maxFiles, onProcessComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles,
    disabled: processing,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        } ${processing ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {processing ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">{progress}</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isDragActive
                    ? "Solte os arquivos aqui"
                    : "Arraste arquivos ou clique para selecionar"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Suporta PDF, DOCX e TXT • Máximo {maxFiles} arquivo(s)
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {files.length > 0 && !processing && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Arquivos selecionados:</p>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-muted rounded-md"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
