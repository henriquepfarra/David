import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configurar worker do PDF.js (usando arquivo local versionado corretamente via Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ProcessingResult {
  text: string;
  method: 'native' | 'ocr' | 'multimodal';
  pageCount: number;
  images?: string[]; // Base64 images para envio multimodal
  error?: string;
}

export interface ProcessingProgress {
  stage: 'loading' | 'extracting' | 'ocr' | 'complete' | 'error';
  message: string;
  progress: number; // 0-100
}

/**
 * Pipeline inteligente de processamento de PDF
 * Tenta 3 estratégias em ordem:
 * 1. Extração de texto nativo (rápido)
 * 2. OCR client-side (para PDFs digitalizados)
 * 3. Retorna imagens para processamento multimodal
 */
export async function processFile(
  file: File,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ProcessingResult> {
  try {
    onProgress?.({
      stage: 'loading',
      message: 'Carregando arquivo PDF...',
      progress: 10,
    });

    // Carregar PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    onProgress?.({
      stage: 'extracting',
      message: 'Tentando extrair texto nativo...',
      progress: 30,
    });

    // Tentativa 1: Extração de texto nativo
    const nativeText = await extractNativeText(pdf, onProgress);

    if (isValidText(nativeText)) {
      return {
        text: nativeText,
        method: 'native',
        pageCount,
      };
    }

    // Tentativa 2: OCR
    onProgress?.({
      stage: 'ocr',
      message: 'Processo digitalizado detectado. Aplicando OCR...',
      progress: 50,
    });

    const { text: ocrText, images } = await extractWithOCR(pdf, onProgress);

    if (isValidText(ocrText)) {
      return {
        text: ocrText,
        method: 'ocr',
        pageCount,
        images, // Guardar imagens para possível uso multimodal
      };
    }

    // Tentativa 3: Retornar imagens para processamento multimodal
    onProgress?.({
      stage: 'complete',
      message: 'Preparando para processamento multimodal...',
      progress: 90,
    });

    return {
      text: '',
      method: 'multimodal',
      pageCount,
      images,
    };

  } catch (error: any) {
    console.error('Erro ao processar PDF:', error);
    return {
      text: '',
      method: 'native',
      pageCount: 0,
      error: error.message || 'Erro desconhecido',
    };
  }
}

/**
 * Extrai texto nativo do PDF usando PDF.js
 */
async function extractNativeText(
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<string> {
  let fullText = '';
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    fullText += pageText + '\n\n';

    onProgress?.({
      stage: 'extracting',
      message: `Extraindo texto da página ${i}/${numPages}...`,
      progress: 30 + (i / numPages) * 20,
    });
  }

  return fullText.trim();
}

/**
 * Extrai texto usando OCR (Tesseract.js)
 */
async function extractWithOCR(
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<{ text: string; images: string[] }> {
  const worker = await createWorker('por', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.({
          stage: 'ocr',
          message: `OCR: ${Math.round(m.progress * 100)}%`,
          progress: 50 + m.progress * 30,
        });
      }
    },
  });

  let fullText = '';
  const images: string[] = [];
  const numPages = pdf.numPages;

  // Limitar a 50 páginas para evitar timeout
  const maxPages = Math.min(numPages, 50);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    // Criar canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Renderizar página no canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;

    // Converter para imagem
    const imageData = canvas.toDataURL('image/png');
    images.push(imageData);

    // Executar OCR
    const { data: { text } } = await worker.recognize(imageData);
    fullText += text + '\n\n';

    onProgress?.({
      stage: 'ocr',
      message: `OCR página ${i}/${maxPages}...`,
      progress: 50 + (i / maxPages) * 30,
    });
  }

  await worker.terminate();

  return { text: fullText.trim(), images };
}

/**
 * Valida se o texto extraído é legível
 */
function isValidText(text: string): boolean {
  if (!text || text.length < 50) {
    return false;
  }

  // Verificar se tem caracteres legíveis (não apenas símbolos)
  const readableChars = text.match(/[a-zA-ZÀ-ÿ0-9]/g);
  if (!readableChars || readableChars.length < text.length * 0.5) {
    return false;
  }

  return true;
}

/**
 * Divide texto grande em chunks para evitar limite de tokens
 */
export function chunkText(text: string, maxChunkSize: number = 10000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk += '\n\n' + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
