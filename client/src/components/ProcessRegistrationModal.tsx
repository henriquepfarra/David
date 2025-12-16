import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
    FileText,
    Upload,
    Loader2,
    CheckCircle2,
    User,
    Gavel,
    Scale,
    FileSearch,
    ChevronRight,
    ArrowLeft,
    Sparkles
} from "lucide-react";
import PDFUploader from "@/components/PDFUploader";
import { ProcessingResult } from "@/lib/pdfProcessor";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProcessRegistrationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

type Step = "upload" | "review";

export function ProcessRegistrationModal({
    open,
    onOpenChange,
    onSuccess
}: ProcessRegistrationModalProps) {
    const [step, setStep] = useState<Step>("upload");
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedText, setExtractedText] = useState("");
    const [extractedImages, setExtractedImages] = useState<string[]>([]);
    const [extractedFields, setExtractedFields] = useState<string[]>([]);

    // Form State
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

    const extractMutation = trpc.processes.extractFromPDF.useMutation({
        onSuccess: (data) => {
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

            if (data.extractedFields) {
                setExtractedFields(data.extractedFields);
            }

            const confidence = data.confidence === 'high' ? 'alta' : data.confidence === 'medium' ? 'média' : 'baixa';
            toast.success(`Dados extraídos com confiança ${confidence}!`);
            setIsExtracting(false);
            setStep("review"); // Auto-advance to review on success
        },
        onError: (error) => {
            toast.error("Erro na extração: " + error.message);
            setIsExtracting(false);
        },
    });

    const createMutation = trpc.processes.create.useMutation({
        onSuccess: () => {
            toast.success("Processo cadastrado com sucesso!");
            resetForm();
            onSuccess();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error("Erro ao salvar: " + error.message);
        },
    });

    const resetForm = () => {
        setStep("upload");
        setExtractedText("");
        setExtractedImages([]);
        setExtractedFields([]);
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
    };

    const handleExtraction = () => {
        if (!extractedText) return;
        setIsExtracting(true);
        extractMutation.mutate({
            text: extractedText,
            images: extractedImages.length > 0 ? extractedImages : undefined,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    // Helper for field highlighting
    const isExtracted = (field: string) => extractedFields.includes(field);
    const fieldClass = (field: string) => cn(
        "transition-all duration-300",
        isExtracted(field) ? "ring-2 ring-green-500/20 border-green-500 bg-green-50/10" : ""
    );

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }}>
            <DialogContent className="max-w-4xl h-[90vh] md:h-[85vh] p-0 overflow-hidden flex flex-col bg-background/80 backdrop-blur-xl border-white/20">

                {/* HEADER */}
                <DialogHeader className="px-6 py-4 border-b border-border/40 flex-shrink-0 bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Gavel className="h-5 w-5" />
                                </div>
                                Novo Processo
                            </DialogTitle>
                            <DialogDescription className="mt-1 ml-11">
                                {step === "upload" ? "Importe os autos (PDF) para análise automática." : "Revise e complemente os dados extraídos."}
                            </DialogDescription>
                        </div>

                        {/* Steps Indicator */}
                        <div className="hidden md:flex items-center gap-2 text-sm bg-background/50 p-1 rounded-full border">
                            <div className={cn("px-3 py-1 rounded-full transition-colors", step === "upload" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground")}>
                                1. Importação
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                            <div className={cn("px-3 py-1 rounded-full transition-colors", step === "review" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground")}>
                                2. Revisão
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* CONTENT AREA - SCROLLABLE */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {step === "upload" ? (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-8 flex flex-col items-center justify-center min-h-[400px]"
                                key="upload-step"
                            >
                                <div className="w-full max-w-xl space-y-8">
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-bold tracking-tight">Vamos começar</h3>
                                        <p className="text-muted-foreground">O DAVID analisará o PDF para preencher os dados automaticamente.</p>
                                    </div>

                                    <div className="bg-card/50 border-2 border-dashed rounded-3xl p-1 transition-all hover:border-primary/50 hover:bg-card/80">
                                        <PDFUploader
                                            maxFiles={1}
                                            onProcessComplete={(result) => {
                                                if (result.text) {
                                                    setExtractedText(result.text);
                                                    // Optional: Auto-trigger extraction immediately?
                                                    // user usually likes control, so showing button is better
                                                }
                                                if (result.images) setExtractedImages(result.images);
                                            }}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <Button
                                            size="lg"
                                            className="w-full h-12 text-base shadow-lg shadow-primary/20"
                                            disabled={!extractedText || isExtracting}
                                            onClick={handleExtraction}
                                        >
                                            {isExtracting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Analisando Documento...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-2 h-5 w-5" />
                                                    Analisar com IA
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            onClick={() => setStep("review")}
                                            className="w-full text-muted-foreground hover:text-foreground"
                                        >
                                            Pular para preenchimento manual
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="p-6 md:p-8"
                                key="review-step"
                            >
                                <form id="process-form" onSubmit={handleSubmit} className="space-y-8">

                                    {/* Section 1: Basic Info */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                            <FileSearch className="h-5 w-5 text-primary" />
                                            <h4 className="font-semibold text-lg">Dados Processuais</h4>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="flex justify-between">
                                                    Número do Processo {isExtracted('numeroProcesso') && <Sparkles className="h-3 w-3 text-green-500" />}
                                                </Label>
                                                <Input
                                                    value={formData.processNumber}
                                                    onChange={e => setFormData({ ...formData, processNumber: e.target.value })}
                                                    placeholder="0000000-00.0000.0.00.0000"
                                                    className={fieldClass('numeroProcesso')}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex justify-between">Vara / Comarca {isExtracted('vara') && <Sparkles className="h-3 w-3 text-green-500" />}</Label>
                                                <Input
                                                    value={formData.court}
                                                    onChange={e => setFormData({ ...formData, court: e.target.value })}
                                                    className={fieldClass('vara')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Juiz(a)</Label>
                                                <Input
                                                    value={formData.judge}
                                                    onChange={e => setFormData({ ...formData, judge: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Status</Label>
                                                <Input
                                                    value={formData.status}
                                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                    placeholder="Ex: Em andamento, Concluso"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 2: Parties */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                            <User className="h-5 w-5 text-primary" />
                                            <h4 className="font-semibold text-lg">Partes</h4>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="flex justify-between">Autor {isExtracted('autor') && <Sparkles className="h-3 w-3 text-green-500" />}</Label>
                                                <Input
                                                    value={formData.plaintiff}
                                                    onChange={e => setFormData({ ...formData, plaintiff: e.target.value })}
                                                    className={fieldClass('autor')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex justify-between">Réu {isExtracted('reu') && <Sparkles className="h-3 w-3 text-green-500" />}</Label>
                                                <Input
                                                    value={formData.defendant}
                                                    onChange={e => setFormData({ ...formData, defendant: e.target.value })}
                                                    className={fieldClass('reu')}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 3: Merit */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                            <Scale className="h-5 w-5 text-primary" />
                                            <h4 className="font-semibold text-lg">Mérito da Causa</h4>
                                        </div>
                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <Label className="flex justify-between">Assunto / Objeto {isExtracted('assunto') && <Sparkles className="h-3 w-3 text-green-500" />}</Label>
                                                <Textarea
                                                    value={formData.subject}
                                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                                    rows={2}
                                                    className={fieldClass('assunto')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex justify-between">Fatos Relevantes {isExtracted('resumoFatos') && <Sparkles className="h-3 w-3 text-green-500" />}</Label>
                                                <Textarea
                                                    value={formData.facts}
                                                    onChange={e => setFormData({ ...formData, facts: e.target.value })}
                                                    rows={4}
                                                    className={fieldClass('resumoFatos')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Pedidos</Label>
                                                <Textarea
                                                    value={formData.requests}
                                                    onChange={e => setFormData({ ...formData, requests: e.target.value })}
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* FOOTER */}
                <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/20 flex-shrink-0">
                    {step === "review" ? (
                        <div className="flex w-full justify-between items-center">
                            <Button variant="ghost" onClick={() => setStep("upload")} className="text-muted-foreground">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                                <Button type="submit" form="process-form" disabled={createMutation.isPending}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmar Cadastro
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex w-full justify-center">
                            <p className="text-xs text-muted-foreground">Arraste um PDF para começar a mágica.</p>
                        </div>
                    )}
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
