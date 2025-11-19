import { invokeLLM } from "./_core/llm";

export interface ExtractedProcessData {
  numeroProcesso?: string;
  autor?: string;
  reu?: string;
  vara?: string;
  assunto?: string;
  valorCausa?: string;
  dataDistribuicao?: string;
  resumoFatos?: string;
  pedidos?: string;
  confidence: "high" | "medium" | "low";
  extractedFields: string[]; // Lista de campos que foram extraídos com sucesso
}

const EXTRACTION_SYSTEM_PROMPT = `Você é um assistente especializado em extrair dados estruturados de documentos processuais do Judiciário brasileiro.

Sua tarefa é analisar o texto fornecido e extrair as seguintes informações:

1. **Número do Processo**: Formato CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO) ou qualquer numeração processual
2. **Autor/Requerente**: Nome completo da parte autora
3. **Réu/Requerido**: Nome completo da parte ré
4. **Vara/Juízo**: Identificação da vara ou juizado
5. **Assunto**: Matéria ou assunto principal do processo
6. **Valor da Causa**: Valor monetário, se mencionado
7. **Data de Distribuição**: Data em que o processo foi distribuído
8. **Resumo dos Fatos**: Breve resumo dos fatos narrados (máximo 500 caracteres)
9. **Pedidos**: Principais pedidos formulados

**REGRAS IMPORTANTES:**
- Se um campo não for encontrado no texto, retorne null para esse campo
- Seja preciso e extraia apenas informações explicitamente mencionadas
- Para datas, use formato DD/MM/AAAA
- Para valores, mantenha o formato original (ex: "R$ 10.000,00")
- No resumo, seja conciso e objetivo
- Indique o nível de confiança da extração: "high" (todos os campos principais encontrados), "medium" (alguns campos faltando), "low" (poucos campos encontrados)

Retorne APENAS um objeto JSON válido, sem texto adicional.`;

/**
 * Remove blocos de código markdown do JSON
 */
function cleanJsonResponse(content: string): string {
  // Remove blocos ```json ... ``` ou ``` ... ```
  let cleaned = content.trim();
  
  // Remove ```json no início
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  
  // Remove ``` no final
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  return cleaned.trim();
}

/**
 * Extrai dados processuais de um texto usando IA
 */
export async function extractProcessData(
  text: string
): Promise<ExtractedProcessData> {
  try {
    // Limitar tamanho do texto para evitar excesso de tokens
    const truncatedText = text.slice(0, 15000);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: EXTRACTION_SYSTEM_PROMPT + "\n\nRETORNE APENAS JSON V\u00c1LIDO, SEM TEXTO ADICIONAL.",
        },
        {
          role: "user",
          content: `Analise o seguinte texto processual e extraia os dados estruturados em formato JSON:\n\n${truncatedText}`,
        },
      ],
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("API n\u00e3o retornou resposta v\u00e1lida. Verifique se a API key est\u00e1 configurada corretamente nas Configura\u00e7\u00f5es.");
    }
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da IA. Verifique se a API key est\u00e1 configurada corretamente.");
    }

    const contentText = typeof content === 'string' ? content : JSON.stringify(content);
    const cleanedJson = cleanJsonResponse(contentText);
    const extractedData = JSON.parse(cleanedJson) as ExtractedProcessData;

    // Validar e limpar dados
    return {
      ...extractedData,
      // Garantir que campos vazios sejam undefined ao invés de null
      numeroProcesso: extractedData.numeroProcesso || undefined,
      autor: extractedData.autor || undefined,
      reu: extractedData.reu || undefined,
      vara: extractedData.vara || undefined,
      assunto: extractedData.assunto || undefined,
      valorCausa: extractedData.valorCausa || undefined,
      dataDistribuicao: extractedData.dataDistribuicao || undefined,
      resumoFatos: extractedData.resumoFatos || undefined,
      pedidos: extractedData.pedidos || undefined,
    };
  } catch (error: any) {
    console.error("Erro ao extrair dados processuais:", error);
    throw new Error(`Falha na extração: ${error.message}`);
  }
}

/**
 * Extrai dados de múltiplas imagens (para PDFs digitalizados)
 */
export async function extractProcessDataFromImages(
  images: string[]
): Promise<ExtractedProcessData> {
  try {
    // Limitar número de imagens para evitar excesso de tokens
    const limitedImages = images.slice(0, 5);

    const imageContent = limitedImages.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: img,
        detail: "high" as const,
      },
    }));

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: EXTRACTION_SYSTEM_PROMPT + "\n\nRETORNE APENAS JSON V\u00c1LIDO, SEM TEXTO ADICIONAL.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analise as imagens do documento processual e extraia os dados estruturados em formato JSON:",
            },
            ...imageContent,
          ],
        },
      ],
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("API n\u00e3o retornou resposta v\u00e1lida. Verifique se a API key est\u00e1 configurada corretamente nas Configura\u00e7\u00f5es.");
    }
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da IA. Verifique se a API key est\u00e1 configurada corretamente.");
    }

    const contentText = typeof content === 'string' ? content : JSON.stringify(content);
    const cleanedJson = cleanJsonResponse(contentText);
    const extractedData = JSON.parse(cleanedJson) as ExtractedProcessData;

    return {
      ...extractedData,
      numeroProcesso: extractedData.numeroProcesso || undefined,
      autor: extractedData.autor || undefined,
      reu: extractedData.reu || undefined,
      vara: extractedData.vara || undefined,
      assunto: extractedData.assunto || undefined,
      valorCausa: extractedData.valorCausa || undefined,
      dataDistribuicao: extractedData.dataDistribuicao || undefined,
      resumoFatos: extractedData.resumoFatos || undefined,
      pedidos: extractedData.pedidos || undefined,
    };
  } catch (error: any) {
    console.error("Erro ao extrair dados de imagens:", error);
    throw new Error(`Falha na extração multimodal: ${error.message}`);
  }
}
