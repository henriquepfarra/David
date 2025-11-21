import { invokeLLM } from "./_core/llm";

export interface ExtractedThesis {
  thesis: string;
  legalFoundations: string;
  keywords: string;
  decisionPattern: string;
}

/**
 * Extrai automaticamente a tese jurídica de uma minuta aprovada
 * usando LLM com prompt especializado
 */
export async function extractThesisFromDraft(
  draftContent: string,
  draftType: string
): Promise<ExtractedThesis> {
  const extractionPrompt = `Você é um especialista em análise jurídica. Analise a seguinte ${draftType} e extraia:

1. **TESE FIRMADA (Ratio Decidendi)**: O fundamento jurídico central da decisão, a regra geral aplicável a casos similares (máximo 300 palavras)

2. **FUNDAMENTOS JURÍDICOS**: Liste TODOS os dispositivos legais citados (artigos, leis, súmulas, jurisprudências). Formato: "Art. X, Lei Y; Súmula Z do STJ"

3. **PALAVRAS-CHAVE**: 5-10 palavras-chave que descrevem o tema central (separadas por vírgula). Ex: "tutela de urgência, CDC, relação consumerista, inversão do ônus da prova"

4. **PADRÃO DE REDAÇÃO**: Descreva o estilo de escrita identificado (tom formal/técnico, estrutura argumentativa, uso de precedentes, etc.) em 2-3 frases

**MINUTA A ANALISAR:**

${draftContent}

**IMPORTANTE:**
- Seja preciso e objetivo
- Extraia apenas o que está EXPLÍCITO no texto
- Se algum item não estiver presente, indique "Não identificado"
- A tese deve ser genérica o suficiente para aplicar em casos similares

Responda APENAS no formato JSON abaixo (sem markdown, sem explicações adicionais):

{
  "thesis": "texto da tese firmada",
  "legalFoundations": "lista de fundamentos legais",
  "keywords": "palavra1, palavra2, palavra3",
  "decisionPattern": "descrição do padrão de redação"
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
          name: "thesis_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              thesis: {
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
              decisionPattern: {
                type: "string",
                description: "Descrição do padrão de redação identificado",
              },
            },
            required: ["thesis", "legalFoundations", "keywords", "decisionPattern"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Resposta vazia ou inválida da LLM");
    }

    // Parse do JSON (remover markdown se houver)
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const extracted: ExtractedThesis = JSON.parse(jsonContent);

    // Validação básica
    if (!extracted.thesis || !extracted.keywords) {
      throw new Error("Extração incompleta");
    }

    return extracted;
  } catch (error) {
    console.error("Erro ao extrair tese:", error);
    throw new Error("Falha na extração automática de tese: " + (error as Error).message);
  }
}
