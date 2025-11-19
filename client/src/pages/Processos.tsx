import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FileText, FolderOpen, Loader2, Plus, Trash2, Upload } from "lucide-react";
import PDFUploader from "@/components/PDFUploader";
import { ProcessingResult } from "@/lib/pdfProcessor";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Processos() {
  const [open, setOpen] = useState(false);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    processNumber: "",
    court: "",
    judge: "",
    plaintiff: "",
    defendant: "",
    subject: "",
    facts: "",
    evidence: "",
    requests: "",
    status: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: processes, isLoading } = trpc.processes.list.useQuery();
  const createMutation = trpc.processes.create.useMutation({
    onSuccess: () => {
      utils.processes.list.invalidate();
      setOpen(false);
      setFormData({
        processNumber: "",
        court: "",
        judge: "",
        plaintiff: "",
        defendant: "",
        subject: "",
        facts: "",
        evidence: "",
        requests: "",
        status: "",
        notes: "",
      });
      toast.success("Processo cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar processo: " + error.message);
    },
  });

  const deleteMutation = trpc.processes.delete.useMutation({
    onSuccess: () => {
      utils.processes.list.invalidate();
      toast.success("Processo excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir processo: " + error.message);
    },
  });

  const extractMutation = trpc.processes.extractFromPDF.useMutation({
    onSuccess: (data) => {
      console.log('Dados recebidos da extração:', data);
      // Preencher formulário com dados extraídos
      setFormData(prev => ({
        ...prev,
        processNumber: data.numeroProcesso || prev.processNumber,
        plaintiff: data.autor || prev.plaintiff,
        defendant: data.reu || prev.defendant,
        court: data.vara || prev.court,
        subject: data.assunto || prev.subject,
        facts: data.resumoFatos || prev.facts,
        requests: Array.isArray(data.pedidos) ? data.pedidos.join('\n') : (data.pedidos || prev.requests),
      }));
      
      setExtractedFields(data.extractedFields);
      
      const confidence = data.confidence === 'high' ? 'alta' : data.confidence === 'medium' ? 'média' : 'baixa';
      toast.success(`Dados extraídos com confiança ${confidence}! Revise antes de salvar.`);
      setIsExtracting(false);
    },
    onError: (error) => {
      toast.error("Erro ao extrair dados: " + error.message);
      setIsExtracting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este processo?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Processos</h1>
            <p className="mt-2 text-muted-foreground">
              Gerencie as informações dos processos judiciais
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Processo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Processo</DialogTitle>
                <DialogDescription>
                  Preencha as informações do processo judicial ou importe de PDF
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Botão para alternar upload de PDF */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={showPDFUpload ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowPDFUpload(!showPDFUpload)}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {showPDFUpload ? "Ocultar" : "Importar"} PDF
                  </Button>
                </div>

                {/* Upload de PDF */}
                {showPDFUpload && (
                  <div className="space-y-3">
                    <PDFUploader
                      maxFiles={1}
                      onProcessComplete={(result: ProcessingResult) => {
                        if (result.text) {
                          setExtractedText(result.text);
                          toast.success(`Texto extraído via ${result.method}`);
                        }
                        if (result.images) {
                          setExtractedImages(result.images);
                        }
                      }}
                    />
                    
                    {extractedText && (
                      <Button
                        type="button"
                        onClick={() => {
                          setIsExtracting(true);
                          extractMutation.mutate({
                            text: extractedText,
                            images: extractedImages.length > 0 ? extractedImages : undefined,
                          });
                        }}
                        disabled={isExtracting}
                        className="w-full"
                        variant="secondary"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Extraindo dados com IA...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Extrair Dados Automaticamente
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                <div className="border-t pt-4" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="processNumber" className="flex items-center gap-2">
                      Número do Processo *
                      {extractedFields?.includes('numeroProcesso') && (
                        <span className="text-xs text-green-600 dark:text-green-400">✓ Extraído</span>
                      )}
                    </Label>
                    <Input
                      id="processNumber"
                      required
                      value={formData.processNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, processNumber: e.target.value })
                      }
                      placeholder="0000000-00.0000.0.00.0000"
                      className={extractedFields?.includes('numeroProcesso') ? 'border-green-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="court" className="flex items-center gap-2">
                      Vara/Comarca
                      {extractedFields?.includes('vara') && (
                        <span className="text-xs text-green-600 dark:text-green-400">✓ Extraído</span>
                      )}
                    </Label>
                    <Input
                      id="court"
                      value={formData.court}
                      onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                      placeholder="Ex: 1ª Vara Cível"
                      className={extractedFields?.includes('vara') ? 'border-green-500' : ''}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="judge">Juiz(a)</Label>
                    <Input
                      id="judge"
                      value={formData.judge}
                      onChange={(e) => setFormData({ ...formData, judge: e.target.value })}
                      placeholder="Nome do magistrado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Input
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      placeholder="Ex: Em andamento"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plaintiff" className="flex items-center gap-2">
                    Autor(es)
                    {extractedFields?.includes('autor') && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓ Extraído</span>
                    )}
                  </Label>
                  <Input
                    id="plaintiff"
                    value={formData.plaintiff}
                    onChange={(e) => setFormData({ ...formData, plaintiff: e.target.value })}
                    placeholder="Nome do(s) autor(es)"
                    className={extractedFields?.includes('autor') ? 'border-green-500' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defendant" className="flex items-center gap-2">
                    Réu(s)
                    {extractedFields?.includes('reu') && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓ Extraído</span>
                    )}
                  </Label>
                  <Input
                    id="defendant"
                    value={formData.defendant}
                    onChange={(e) => setFormData({ ...formData, defendant: e.target.value })}
                    placeholder="Nome do(s) réu(s)"
                    className={extractedFields?.includes('reu') ? 'border-green-500' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="flex items-center gap-2">
                    Assunto/Objeto
                    {extractedFields?.includes('assunto') && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓ Extraído</span>
                    )}
                  </Label>
                  <Textarea
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Descrição do objeto da ação"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facts">Fatos Relevantes</Label>
                  <Textarea
                    id="facts"
                    value={formData.facts}
                    onChange={(e) => setFormData({ ...formData, facts: e.target.value })}
                    placeholder="Resumo dos fatos principais (ou importe de PDF acima)"
                    rows={3}
                  />
                  {extractedText && (
                    <p className="text-xs text-muted-foreground">
                      Texto extraído do PDF ({extractedText.length} caracteres)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evidence">Provas</Label>
                  <Textarea
                    id="evidence"
                    value={formData.evidence}
                    onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                    placeholder="Descrição das provas apresentadas"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requests">Pedidos</Label>
                  <Textarea
                    id="requests"
                    value={formData.requests}
                    onChange={(e) => setFormData({ ...formData, requests: e.target.value })}
                    placeholder="Pedidos formulados na ação"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Anotações adicionais"
                    rows={2}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Cadastrar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : processes && processes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {processes.map((process) => (
              <Card key={process.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{process.processNumber}</CardTitle>
                      <CardDescription className="mt-1">
                        {process.court || "Vara não informada"}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(process.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {process.plaintiff && (
                    <div className="text-sm">
                      <span className="font-medium">Autor:</span> {process.plaintiff}
                    </div>
                  )}
                  {process.defendant && (
                    <div className="text-sm">
                      <span className="font-medium">Réu:</span> {process.defendant}
                    </div>
                  )}
                  {process.subject && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {process.subject}
                    </div>
                  )}
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/processo/${process.id}`} className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Ver Detalhes
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum processo cadastrado ainda.
                <br />
                Clique em "Novo Processo" para começar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
