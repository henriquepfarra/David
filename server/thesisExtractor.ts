import { invokeLLM } from "./_core/llm";

export interface ExtractedThesis {
  // Motor C - Argumentação Jurídica
  legalThesis: string; // Ratio decidendi
  legalFoundations: string; // Artigos, súmulas, precedentes
  keywords: string; // Palavras-chave temáticas

  // Motor B - Estilo de Redação
  writingStyleSample: string; // Parágrafo representativo do tom de voz
  writingCharacteristics: {
    formality: "formal" | "moderado" | "coloquial";
    structure: string; // Padrão estrutural
    tone: string; // Tom predominante
  };

  // Campos legados (compatibilidade)
  thesis: string; // DEPRECATED - alias de legalThesis
  decisionPattern: string; // DEPRECATED - alias de writingStyleSample
}

/**
 * Extrai automaticamente a tese jurídica de uma minuta aprovada
 * usando LLM com prompt especializado
 * 
 * VERSÃO 2.0 - Extração Dual (Legal Thesis + Writing Style)
 */
export async function extractThesisFromDraft(
  draftContent: string,
  draftType: string
): Promise<ExtractedThesis> {
  const extractionPrompt = `Você é um especialista em análise jurídica. Analise a seguinte ${draftType} e extraia:

**PARTE 1: ARGUMENTAÇÃO JURÍDICA (Motor C)**

1. **TESE FIRMADA (Ratio Decidendi)**: O fundamento jurídico central da decisão, a regra geral aplicável a casos similares (máximo 300 palavras)

2. **FUNDAMENTOS JURÍDICOS**: Liste TODOS os dispositivos legais citados (artigos, leis, súmulas, jurisprudências). Formato: "Art. X, Lei Y; Súmula Z do STJ"

3. **PALAVRAS-CHAVE**: 5-10 palavras-chave que descrevem o tema central (separadas por vírgula). Ex: "tutela de urgência, CDC, relação consumerista, inversão do ônus da prova"

**PARTE 2: ESTILO DE REDAÇÃO (Motor B)**

4. **AMOSTRA DE ESTILO**: Extraia UM parágrafo curto (máx 150 palavras) que seja REPRESENTATIVO do tom de voz e estilo do juiz. Escolha um trecho que mostre:
   - Como ele inicia argumentações
   - Uso de linguagem (formal/moderada/coloquial)
   - Estrutura das frases (curtas/longas, técnicas/didáticas)

5. **CARACTERÍSTICAS DE ESCRITA**:
   - **Formalidade**: Classifique como "formal", "moderado" ou "coloquial"
   - **Estrutura**: Descreva o padrão estrutural (ex: "tópicos numerados", "fluxo corrido", "parágrafos curtos")
   - **Tom**: Descreva o tom predominante (ex: "técnico-objetivo", "didático-explicativo", "impessoal-direto")

**MINUTA A ANALISAR:**

${draftContent}

**IMPORTANTE:**
- Seja preciso e objetivo
- Extraia apenas o que está EXPLÍCITO no texto
- Se algum item não estiver presente, indique "Não identificado"
- A tese deve ser genérica o suficiente para aplicar em casos similares
- A amostra de estilo deve ser um trecho REAL do texto, não uma descrição

Responda APENAS no formato JSON abaixo (sem markdown, sem explicações adicionais):

{
  "legalThesis": "texto da tese firmada",
  "legalFoundations": "lista de fundamentos legais",
  "keywords": "palavra1, palavra2, palavra3",
  "writingStyleSample": "trecho representativo do estilo",
  "writingCharacteristics": {
    "formality": "formal|moderado|coloquial",
    "structure": "descrição do padrão estrutural",
    "tone": "descrição do tom"
  }
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em análise jurídica e extração de teses. Responda APENAS com JSON válido, sem formatação markdown.",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "thesis_extraction_dual",
          strict: true,
          schema: {
            type: "object",
            properties: {
              // Motor C - Argumentação
              legalThesis: {
                type: "string",
                description: "A tese firmada (ratio decidendi) extraída da minuta",
              },
              legalFoundations: {
                type: "string",
                description: "Lista de fundamentos jurídicos (artigos, leis, súmulas)",
              },
              keywords: {
                type: "string",
                description: "Palavras-chave separadas por vírgula",
              },
              // Motor B - Estilo
              writingStyleSample: {
                type: "string",
                description: "Parágrafo representativo do tom de voz do juiz",
              },
              writingCharacteristics: {
                type: "object",
                properties: {
                  formality: {
                    type: "string",
                    enum: ["formal", "moderado", "coloquial"],
                    description: "Nível de formalidade da redação",
                  },
                  structure: {
                    type: "string",
                    description: "Padrão estrutural identificado",
                  },
                  tone: {
                    type: "string",
                    description: "Tom predominante da redação",
                  },
                },
                required: ["formality", "structure", "tone"],
                additionalProperties: false,
              },
            },
            required: ["legalThesis", "legalFoundations", "keywords", "writingStyleSample", "writingCharacteristics"],
            additionalProperties: false,
          },
        },
      },
    });

    // Validação da resposta da LLM
    if (!response || !response.choices || !response.choices.length) {
      console.error("❌ [ThesisExtractor] Resposta inválida da LLM:", JSON.stringify(response, null, 2));
      throw new Error("A resposta da LLM não possui escolhas (choices) válidas.");
    }

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Resposta vazia ou inválida da LLM");
    }

    // Parse do JSON (remover markdown se houver)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const extracted = JSON.parse(jsonContent);

    // Validação básica
    if (!extracted.legalThesis || !extracted.keywords || !extracted.writingStyleSample) {
      throw new Error("Extração incompleta - campos obrigatórios faltando");
    }

    // Adicionar campos legados para compatibilidade
    extracted.thesis = extracted.legalThesis; // Alias
    extracted.decisionPattern = extracted.writingStyleSample; // Alias

    return extracted as ExtractedThesis;
  } catch (error) {
    console.error("Erro ao extrair tese:", error);
    throw new Error("Falha na extração automática de tese: " + (error as Error).message);
  }
}
