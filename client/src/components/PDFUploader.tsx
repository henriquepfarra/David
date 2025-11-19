import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { processFile, ProcessingProgress, ProcessingResult } from "@/lib/pdfProcessor";
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface PDFUploaderProps {
  onProcessComplete: (result: ProcessingResult) => void;
  maxFiles?: number;
}

export default function PDFUploader({ onProcessComplete, maxFiles = 5 }: PDFUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [results, setResults] = useState<ProcessingResult[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles,
    onDrop: (acceptedFiles) => {
      setFiles((prev) => [...prev, ...acceptedFiles].slice(0, maxFiles));
      toast.success(`${acceptedFiles.length} arquivo(s) adicionado(s)`);
    },
    onDropRejected: () => {
      toast.error("Apenas arquivos PDF são aceitos");
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      toast.error("Adicione pelo menos um arquivo PDF");
      return;
    }

    setProcessing(true);
    setResults([]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const result = await processFile(file, (prog) => {
          setProgress({
            ...prog,
            message: `[${i + 1}/${files.length}] ${prog.message}`,
          });
        });

        setResults((prev) => [...prev, result]);
        onProcessComplete(result);

        if (result.error) {
          toast.error(`Erro ao processar ${file.name}: ${result.error}`);
        } else {
          toast.success(`${file.name} processado via ${result.method}`);
        }
      } catch (error: any) {
        toast.error(`Erro ao processar ${file.name}`);
        console.error(error);
      }
    }

    setProcessing(false);
    setProgress(null);
  };

  const getMethodLabel = (method: string) => {
    const labels = {
      native: "Texto Nativo",
      ocr: "OCR (Digitalizado)",
      multimodal: "Multimodal (Imagens)",
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getMethodColor = (method: string) => {
    const colors = {
      native: "text-green-600 dark:text-green-400",
      ocr: "text-amber-600 dark:text-amber-400",
      multimodal: "text-blue-600 dark:text-blue-400",
    };
    return colors[method as keyof typeof colors] || "";
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-lg font-medium">Solte os arquivos aqui...</p>
          ) : (
            <>
              <p className="text-lg font-medium mb-2">
                Arraste PDFs aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Suporta até {maxFiles} arquivos PDF
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} arquivo(s) selecionado(s)
            </p>
            <Button
              onClick={processFiles}
              disabled={processing}
              size="sm"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Processar Arquivos
                </>
              )}
            </Button>
          </div>

          {files.map((file, index) => (
            <Card key={index}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {results[index] && (
                    <div className="flex items-center gap-2">
                      {results[index].error ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      <span className={`text-xs font-medium ${getMethodColor(results[index].method)}`}>
                        {getMethodLabel(results[index].method)}
                      </span>
                    </div>
                  )}
                </div>
                {!processing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progress */}
      {processing && progress && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm font-medium">{progress.message}</p>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {results.length > 0 && !processing && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Processamento Concluído
                </p>
                <p className="text-xs text-green-800 dark:text-green-200">
                  {results.length} arquivo(s) processado(s) com sucesso
                </p>
                <div className="text-xs text-green-700 dark:text-green-300 space-y-0.5 mt-2">
                  {results.map((result, index) => (
                    <div key={index}>
                      • {files[index]?.name}: {result.pageCount} página(s) - Método: {getMethodLabel(result.method)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
