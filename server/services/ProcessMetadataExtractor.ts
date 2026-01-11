import { invokeLLM } from "../_core/llm";
import { logger } from "../_core/logger";

export interface ProcessMetadata {
    processNumber: string | null;
    plaintiff: string | null;
    defendant: string | null;
    court: string | null;
    subject: string | null;
}

/**
 * Extrai metadados de processo judicial usando Gemini Flash
 * Custo: ~$0.0001 por extração
 */
export async function extractProcessMetadata(
    pdfText: string,
    apiKey?: string
): Promise<ProcessMetadata> {
    try {
        logger.info("[ProcessExtractor] Iniciando extração de metadados...");

        const response = await invokeLLM({
            messages: [
                {
                    role: "system",
                    content: `Você é um extrator de dados de processos judiciais brasileiros.
Analise o texto fornecido e retorne um JSON com os seguintes campos:
- processNumber: string (número do processo no formato CNJ ou antigo, exatamente como aparece)
- plaintiff: string (autor/requerente/reclamante)
- defendant: string (réu/requerido/reclamado)
- court: string (vara/juizado/tribunal)
- subject: string (assunto/objeto da ação)

REGRAS CRÍTICAS:
1. Retorne APENAS o JSON puro, sem markdown (sem \`\`\`json)
2. Se algum campo não for encontrado, use null
3. Mantenha a formatação original do número do processo
4. Seja preciso: não invente dados

Exemplo de resposta válida:
{"processNumber":"0001234-56.2024.8.19.0001","plaintiff":"João Silva","defendant":"Empresa XYZ Ltda","court":"1ª Vara Cível","subject":"Indenização por danos morais"}`,
                },
                {
                    role: "user",
                    content: pdfText.substring(0, 3000), // Primeiras 3000 chars geralmente contêm cabeçalho
                },
            ],
            apiKey,
            model: "gemini-1.5-flash", // Barato e rápido para extração
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : "{}";

        // Limpar markdown se vier com formatação
        const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();

        const parsed = JSON.parse(cleaned) as ProcessMetadata;

        logger.info("[ProcessExtractor] Metadados extraídos:", {
            hasProcessNumber: !!parsed.processNumber,
            hasPlaintiff: !!parsed.plaintiff,
            hasDefendant: !!parsed.defendant,
        });

        return parsed;
    } catch (error) {
        logger.error("[ProcessExtractor] Erro ao extrair metadados:", error);
        return {
            processNumber: null,
            plaintiff: null,
            defendant: null,
            court: null,
            subject: null,
        };
    }
}

/**
 * Normaliza número de processo para comparação
 * Remove pontos, traços e espaços
 */
export function normalizeProcessNumber(processNumber: string): string {
    return processNumber.replace(/[.\-\s]/g, "");
}
