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

const EXTRACTION_SYSTEM_PROMPT = `Você é um assistente especializado em extrair dados estruturados de documentos processuais do e-Proc TJSP.

**ESTRATÉGIA DE EXTRAÇÃO:**
Documentos do e-Proc geralmente têm as informações principais nas PRIMEIRAS PÁGINAS. Procure especialmente:
- Cabeçalho: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO..."
- Linha com "Processo" ou "Processo nº:"
- Seções "DOS FATOS", "I- DOS FATOS", "FATOS"
- Seções "DOS PEDIDOS", "PEDIDOS", "REQUERIMENTOS"

**CAMPOS A EXTRAIR:**

1. **Número do Processo**: Formato CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
   Exemplo: "4005530-16.2025.8.26.0009" ou "Processo 4005530-16.2025.8.26.0009"

2. **Autor/Requerente**: Nome completo da parte autora
   Procure após: "em causa própria", "vem propor", nome antes de "vem perante"
   Exemplo: "RODRIGO MICHELETTI, brasileiro, casado..."

3. **Réu/Requerido**: Nome completo da parte ré
   Procure após: "em face de", "em face da", "contra"
   Exemplo: "TIM S/A pessoa jurídica..."

4. **Vara/Juízo**: Nome completo da vara
   Procure no cabeçalho: "JUIZ DE DIREITO DO...", "JUIZADO ESPECIAL..."
   Exemplo: "JUIZADO ESPECIAL CÍVEL DO FORO REGIONAL IX VILA PRUDENTE"

5. **Assunto**: Título ou matéria principal
   Geralmente aparece em MAIÚSCULAS antes de "em face"
   Exemplo: "DANO MORAL", "AÇÃO DE COBRANÇA"

6. **Valor da Causa**: Valor monetário mencionado
   Exemplo: "R$ 10.000,00"

7. **Data de Distribuição**: Data de distribuição do processo
   Procure: "Data: DD/MM/AAAA" ou "distribuído em"

8. **Resumo dos Fatos**: Resumo da seção de fatos (máximo 500 caracteres)
   Extraia da seção "DOS FATOS" ou "I- DOS FATOS"

9. **Pedidos**: Lista dos pedidos principais
   Extraia da seção "DOS PEDIDOS" ou "PEDIDOS"

**REGRAS CRÍTICAS:**
- Se um campo não for encontrado, retorne null
- NÃO invente informações - extraia apenas o que está explícito no texto
- Para nomes de pessoas/empresas, extraia o nome completo (não apenas parte)
- Para datas, use formato DD/MM/AAAA
- Para valores, mantenha formato original ("R$ 10.000,00")
- Confiança: "high" (6+ campos encontrados), "medium" (3-5 campos), "low" (1-2 campos)

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
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Analise o seguinte texto processual e extraia os dados estruturados:\n\n${truncatedText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "process_data_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              numeroProcesso: { type: ["string", "null"], description: "Número do processo no formato CNJ" },
              autor: { type: ["string", "null"], description: "Nome completo do autor/requerente" },
              reu: { type: ["string", "null"], description: "Nome completo do réu/requerido" },
              vara: { type: ["string", "null"], description: "Nome da vara ou juízo" },
              assunto: { type: ["string", "null"], description: "Assunto principal do processo" },
              valorCausa: { type: ["string", "null"], description: "Valor da causa" },
              dataDistribuicao: { type: ["string", "null"], description: "Data de distribuição" },
              resumoFatos: { type: ["string", "null"], description: "Resumo dos fatos" },
              pedidos: { type: ["string", "null"], description: "Pedidos principais" },
            },
            required: ["numeroProcesso", "autor", "reu", "vara", "assunto", "valorCausa", "dataDistribuicao", "resumoFatos", "pedidos"],
            additionalProperties: false,
          },
        },
      },
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("API n\u00e3o retornou resposta v\u00e1lida. Verifique se a API key est\u00e1 configurada corretamente nas Configura\u00e7\u00f5es.");
    }
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da IA. Verifique se a API key est\u00e1 configurada corretamente.");
    }

    const contentText = typeof content === 'string' ? content : JSON.stringify(content);
    console.log('[extractProcessData] Resposta da IA:', contentText.substring(0, 500));
    const cleanedJson = cleanJsonResponse(contentText);
    console.log('[extractProcessData] JSON limpo:', cleanedJson.substring(0, 500));
    const extractedData = JSON.parse(cleanedJson) as ExtractedProcessData;
    console.log('[extractProcessData] Dados parseados:', JSON.stringify(extractedData, null, 2));

    // Validar e limpar dados - aceitar tanto camelCase quanto português
    const data = extractedData as any;
    const cleanedData = {
      numeroProcesso: data.numeroProcesso || data['Número do Processo'] || undefined,
      autor: data.autor || data['Autor/Requerente'] || data.Autor || undefined,
      reu: data.reu || data['Réu/Requerido'] || data.Réu || undefined,
      vara: data.vara || data['Vara/Juízo'] || data.Vara || undefined,
      assunto: data.assunto || data.Assunto || undefined,
      valorCausa: data.valorCausa || data['Valor da Causa'] || undefined,
      dataDistribuicao: data.dataDistribuicao || data['Data de Distribuição'] || undefined,
      resumoFatos: data.resumoFatos || data['Resumo dos Fatos'] || undefined,
      pedidos: Array.isArray(data.pedidos || data.Pedidos) 
        ? (data.pedidos || data.Pedidos).join('\n') 
        : (data.pedidos || data.Pedidos || undefined),
    };
    console.log('[extractProcessData] cleanedData:', JSON.stringify(cleanedData, null, 2));

    // Calcular campos extraídos
    const extractedFields: string[] = [];
    if (cleanedData.numeroProcesso) extractedFields.push('processNumber');
    if (cleanedData.autor) extractedFields.push('plaintiff');
    if (cleanedData.reu) extractedFields.push('defendant');
    if (cleanedData.vara) extractedFields.push('court');
    if (cleanedData.assunto) extractedFields.push('subject');
    if (cleanedData.resumoFatos) extractedFields.push('facts');
    if (cleanedData.pedidos) extractedFields.push('requests');

    // Determinar confiança baseado em quantos campos foram extraídos
    const confidence: "high" | "medium" | "low" = 
      extractedFields.length >= 5 ? "high" :
      extractedFields.length >= 3 ? "medium" : "low";

    return {
      ...cleanedData,
      confidence,
      extractedFields,
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
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analise as imagens do documento processual e extraia os dados estruturados:",
            },
            ...imageContent,
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "process_data_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              numeroProcesso: { type: ["string", "null"], description: "Número do processo no formato CNJ" },
              autor: { type: ["string", "null"], description: "Nome completo do autor/requerente" },
              reu: { type: ["string", "null"], description: "Nome completo do réu/requerido" },
              vara: { type: ["string", "null"], description: "Nome da vara ou juízo" },
              assunto: { type: ["string", "null"], description: "Assunto principal do processo" },
              valorCausa: { type: ["string", "null"], description: "Valor da causa" },
              dataDistribuicao: { type: ["string", "null"], description: "Data de distribuição" },
              resumoFatos: { type: ["string", "null"], description: "Resumo dos fatos" },
              pedidos: { type: ["string", "null"], description: "Pedidos principais" },
            },
            required: ["numeroProcesso", "autor", "reu", "vara", "assunto", "valorCausa", "dataDistribuicao", "resumoFatos", "pedidos"],
            additionalProperties: false,
          },
        },
      },
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("API n\u00e3o retornou resposta v\u00e1lida. Verifique se a API key est\u00e1 configurada corretamente nas Configura\u00e7\u00f5es.");
    }
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da IA. Verifique se a API key est\u00e1 configurada corretamente.");
    }

    const contentText = typeof content === 'string' ? content : JSON.stringify(content);
    console.log('[extractProcessData] Resposta da IA:', contentText.substring(0, 500));
    const cleanedJson = cleanJsonResponse(contentText);
    console.log('[extractProcessData] JSON limpo:', cleanedJson.substring(0, 500));
    const extractedData = JSON.parse(cleanedJson) as ExtractedProcessData;
    console.log('[extractProcessData] Dados parseados:', JSON.stringify(extractedData, null, 2));

    // Validar e limpar dados - aceitar tanto camelCase quanto português
    const data = extractedData as any;
    const cleanedData = {
      numeroProcesso: data.numeroProcesso || data['Número do Processo'] || undefined,
      autor: data.autor || data['Autor/Requerente'] || data.Autor || undefined,
      reu: data.reu || data['Réu/Requerido'] || data.Réu || undefined,
      vara: data.vara || data['Vara/Juízo'] || data.Vara || undefined,
      assunto: data.assunto || data.Assunto || undefined,
      valorCausa: data.valorCausa || data['Valor da Causa'] || undefined,
      dataDistribuicao: data.dataDistribuicao || data['Data de Distribuição'] || undefined,
      resumoFatos: data.resumoFatos || data['Resumo dos Fatos'] || undefined,
      pedidos: Array.isArray(data.pedidos || data.Pedidos) 
        ? (data.pedidos || data.Pedidos).join('\n') 
        : (data.pedidos || data.Pedidos || undefined),
    };
    console.log('[extractProcessData] cleanedData:', JSON.stringify(cleanedData, null, 2));

    // Calcular campos extraídos
    const extractedFields: string[] = [];
    if (cleanedData.numeroProcesso) extractedFields.push('processNumber');
    if (cleanedData.autor) extractedFields.push('plaintiff');
    if (cleanedData.reu) extractedFields.push('defendant');
    if (cleanedData.vara) extractedFields.push('court');
    if (cleanedData.assunto) extractedFields.push('subject');
    if (cleanedData.resumoFatos) extractedFields.push('facts');
    if (cleanedData.pedidos) extractedFields.push('requests');

    // Determinar confiança baseado em quantos campos foram extraídos
    const confidence: "high" | "medium" | "low" = 
      extractedFields.length >= 5 ? "high" :
      extractedFields.length >= 3 ? "medium" : "low";

    return {
      ...cleanedData,
      confidence,
      extractedFields,
    };
  } catch (error: any) {
    console.error("Erro ao extrair dados de imagens:", error);
    throw new Error(`Falha na extração multimodal: ${error.message}`);
  }
}
