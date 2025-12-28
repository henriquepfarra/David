/**
 * Google File API Integration for PDF Reading
 * 
 * This module provides functions to upload, read, and delete PDFs using
 * Google's File API with Gemini models. It enables visual reading of
 * documents including images, tables, and scanned content.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { ENV } from "./env";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Configuration for PDF reading
 */
interface ReadPdfOptions {
    apiKey?: string;          // API key (uses ENV.geminiApiKey as fallback)
    model?: string;           // Model to use (default: gemini-2.0-flash)
    instruction?: string;     // Custom instruction for extraction
    deleteAfterRead?: boolean; // Delete file from Google after reading (default: true)
}

/**
 * Result of PDF reading operation
 */
interface ReadPdfResult {
    content: string;          // Extracted content
    pageCount?: number;       // Number of pages (if available)
    model: string;            // Model used
    tokensUsed?: number;      // Approximate tokens used
    fileUri?: string;         // Google File URI (if file wasn't deleted)
    fileName?: string;        // Google File name (for deletion later)
}

/**
 * Reads a PDF file using Google's File API with visual understanding
 * 
 * This function:
 * 1. Uploads the PDF to Google's servers
 * 2. Uses Gemini to analyze the document visually
 * 3. Extracts all content including images, tables, and text
 * 4. Deletes the file from Google's servers (by default)
 * 
 * @param pdfPathOrBuffer - Path to the PDF file or a Buffer containing the PDF
 * @param options - Configuration options
 * @returns Extracted content and metadata
 */
export async function readPdfWithVision(
    pdfPathOrBuffer: string | Buffer,
    options: ReadPdfOptions = {}
): Promise<ReadPdfResult> {
    const {
        apiKey = ENV.geminiApiKey,
        model = "gemini-2.0-flash-lite",
        instruction = getDefaultInstruction(),
        deleteAfterRead = true,
    } = options;

    if (!apiKey) {
        throw new Error(
            "Gemini API key is not configured. Please set GEMINI_API_KEY in environment or configure in settings."
        );
    }

    // Initialize Google AI clients
    const fileManager = new GoogleAIFileManager(apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);

    // Handle buffer input - write to temp file
    let pdfPath: string;
    let tempFile = false;

    if (Buffer.isBuffer(pdfPathOrBuffer)) {
        const tempDir = os.tmpdir();
        pdfPath = path.join(tempDir, `david_pdf_${Date.now()}.pdf`);
        fs.writeFileSync(pdfPath, pdfPathOrBuffer);
        tempFile = true;
    } else {
        pdfPath = pdfPathOrBuffer;
    }

    let uploadResult;

    try {
        // 1. Upload PDF to Google
        console.log(`[FileAPI] Uploading PDF: ${path.basename(pdfPath)}`);
        uploadResult = await fileManager.uploadFile(pdfPath, {
            mimeType: "application/pdf",
            displayName: path.basename(pdfPath),
        });

        console.log(`[FileAPI] Upload complete. URI: ${uploadResult.file.uri}`);

        // 2. Wait for file processing (if needed)
        let file = uploadResult.file;
        while (file.state === "PROCESSING") {
            console.log("[FileAPI] Waiting for file processing...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(file.name);
        }

        if (file.state === "FAILED") {
            throw new Error(`File processing failed: ${file.name}`);
        }

        // 3. Generate content using the model
        console.log(`[FileAPI] Analyzing with model: ${model}`);
        const generativeModel = genAI.getGenerativeModel({ model });

        const genResult = await generativeModel.generateContent([
            {
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri,
                },
            },
            { text: instruction },
        ]);

        const response = genResult.response;
        const content = response.text();

        console.log(`[FileAPI] Content extracted. Length: ${content.length} characters`);

        // Include file info if we're not deleting (for session persistence)
        const pdfResult: ReadPdfResult = {
            content,
            model,
            tokensUsed: response.usageMetadata?.totalTokenCount,
        };

        // If not deleting, include file URI for later queries
        if (!deleteAfterRead && uploadResult?.file) {
            pdfResult.fileUri = uploadResult.file.uri;
            pdfResult.fileName = uploadResult.file.name;
            console.log(`[FileAPI] File retained for session. URI: ${pdfResult.fileUri}`);
        }

        return pdfResult;
    } finally {
        // 4. Cleanup: Delete file from Google servers
        if (deleteAfterRead && uploadResult?.file?.name) {
            try {
                await fileManager.deleteFile(uploadResult.file.name);
                console.log("[FileAPI] File deleted from Google servers.");
            } catch (deleteError) {
                console.warn("[FileAPI] Warning: Failed to delete file from Google:", deleteError);
            }
        }

        // 5. Cleanup: Delete temp file if we created one
        if (tempFile && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
    }
}

/**
 * Returns the default instruction for PDF extraction
 */
function getDefaultInstruction(): string {
    return `Você é um assistente especializado em leitura de documentos jurídicos brasileiros.

Analise este documento PDF e extraia TODO o conteúdo de forma estruturada, incluindo:

1. **Texto**: Extraia todo o texto do documento, preservando a estrutura de parágrafos.

2. **Tabelas**: Se houver tabelas (como cálculos de pensão, demonstrativos financeiros), 
   reproduza-as de forma legível, identificando claramente linhas e colunas.

3. **Imagens e Prints**: Se houver prints de conversa (WhatsApp, email) ou fotografias 
   de documentos, descreva detalhadamente o conteúdo visível.

4. **Assinaturas e Carimbos**: Identifique e mencione a presença de assinaturas, 
   carimbos e certificações digitais.

5. **Metadados**: Se visível, extraia informações como número do processo, 
   vara, comarca, partes envolvidas.

Formate a saída de forma clara e organizada, usando markdown quando apropriado.
Não omita nenhuma informação relevante do documento.`;
}

/**
 * Uploads a PDF and returns the file URI for later use
 * Useful when you want to make multiple queries to the same document
 */
export async function uploadPdfForMultipleQueries(
    pdfPathOrBuffer: string | Buffer,
    apiKey?: string
): Promise<{ fileUri: string; fileName: string; mimeType: string }> {
    const key = apiKey || ENV.geminiApiKey;

    if (!key) {
        throw new Error("Gemini API key is not configured.");
    }

    const fileManager = new GoogleAIFileManager(key);

    // Handle buffer input
    let pdfPath: string;
    let tempFile = false;

    if (Buffer.isBuffer(pdfPathOrBuffer)) {
        const tempDir = os.tmpdir();
        pdfPath = path.join(tempDir, `david_pdf_${Date.now()}.pdf`);
        fs.writeFileSync(pdfPath, pdfPathOrBuffer);
        tempFile = true;
    } else {
        pdfPath = pdfPathOrBuffer;
    }

    try {
        const uploadResult = await fileManager.uploadFile(pdfPath, {
            mimeType: "application/pdf",
            displayName: path.basename(pdfPath),
        });

        // Wait for processing
        let file = uploadResult.file;
        while (file.state === "PROCESSING") {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(file.name);
        }

        if (file.state === "FAILED") {
            throw new Error(`File processing failed: ${file.name}`);
        }

        return {
            fileUri: file.uri,
            fileName: file.name,
            mimeType: file.mimeType,
        };
    } finally {
        if (tempFile && fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
    }
}

/**
 * Deletes a previously uploaded file from Google servers
 */
export async function deletePdfFromGoogle(fileName: string, apiKey?: string): Promise<void> {
    const key = apiKey || ENV.geminiApiKey;

    if (!key) {
        throw new Error("Gemini API key is not configured.");
    }

    const fileManager = new GoogleAIFileManager(key);
    await fileManager.deleteFile(fileName);
    console.log(`[FileAPI] File ${fileName} deleted from Google servers.`);
}

/**
 * Get list of available Gemini models suitable for PDF reading
 */
export function getReaderModels(): Array<{ id: string; name: string; recommended?: boolean }> {
    return [
        { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite - $0.075/1M", recommended: true },
        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash - $0.10/1M" },
        { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite - $0.10/1M" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash - $0.30/1M" },
        { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview - $0.50/1M" },
    ];
}
