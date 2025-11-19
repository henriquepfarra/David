import mammoth from "mammoth";
import { processFile as processPDF } from "./pdfProcessor";

export interface FileProcessingResult {
  text: string;
  method: "native" | "ocr" | "multimodal" | "docx" | "txt";
  images?: string[];
  error?: string;
}

/**
 * Processa diferentes tipos de arquivo e extrai texto
 */
export async function processFile(file: File): Promise<FileProcessingResult> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    // PDF
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      return await processPDF(file);
    }

    // DOCX
    if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      return await processDocx(file);
    }

    // TXT
    if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      return await processText(file);
    }

    throw new Error(`Tipo de arquivo não suportado: ${fileType || fileName}`);
  } catch (error: any) {
    console.error("Erro ao processar arquivo:", error);
    return {
      text: "",
      method: "native",
      error: error.message || "Erro desconhecido ao processar arquivo",
    };
  }
}

/**
 * Processa arquivo DOCX e extrai texto
 */
async function processDocx(file: File): Promise<FileProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.value && result.value.trim().length > 0) {
      return {
        text: result.value.trim(),
        method: "docx",
      };
    }

    throw new Error("Nenhum texto encontrado no documento DOCX");
  } catch (error: any) {
    console.error("Erro ao processar DOCX:", error);
    throw new Error(`Falha ao processar DOCX: ${error.message}`);
  }
}

/**
 * Processa arquivo TXT
 */
async function processText(file: File): Promise<FileProcessingResult> {
  try {
    const text = await file.text();
    
    if (text && text.trim().length > 0) {
      return {
        text: text.trim(),
        method: "txt",
      };
    }

    throw new Error("Arquivo de texto vazio");
  } catch (error: any) {
    console.error("Erro ao processar TXT:", error);
    throw new Error(`Falha ao processar TXT: ${error.message}`);
  }
}
