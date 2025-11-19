import { invokeLLM } from "./_core/llm";

export interface GhostwriterInput {
  draftType: "sentenca" | "decisao" | "despacho" | "acordao";
  processNumber: string;
  court?: string;
  judge?: string;
  plaintiff?: string;
  defendant?: string;
  subject?: string;
  facts?: string;
  evidence?: string;
  requests?: string;
  customApiKey?: string;
  customModel?: string;
  customProvider?: string;
  images?: string[]; // Base64 images para processamento multimodal
  knowledgeBase?: string; // Conteúdo da base de conhecimento
}

export async function generateDraft(input: GhostwriterInput): Promise<string> {
  const systemPrompt = getSystemPrompt(input.draftType, input.knowledgeBase);
  
  // Se tiver imagens, usar processamento multimodal
  if (input.images && input.images.length > 0) {
    return generateDraftWithImages(input, systemPrompt);
  }
  
  // Caso contrário, usar processamento de texto normal
  const userPrompt = buildUserPrompt(input);

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      // Se o usuário forneceu API key customizada, usar ela
      ...(input.customApiKey && { apiKey: input.customApiKey }),
      ...(input.customModel && { model: input.customModel }),
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }
    return "Erro ao gerar minuta";
  } catch (error) {
    console.error("Erro ao gerar minuta:", error);
    throw new Error("Falha ao gerar minuta com IA");
  }
}

/**
 * Gera minuta usando processamento multimodal (texto + imagens)
 */
async function generateDraftWithImages(
  input: GhostwriterInput,
  systemPrompt: string
): Promise<string> {
  try {
    // Construir conteúdo multimodal
    const content: any[] = [
      {
        type: "text",
        text: buildUserPrompt(input),
      },
    ];

    // Adicionar imagens (limitar a 10 para evitar timeout)
    const maxImages = Math.min(input.images?.length || 0, 10);
    for (let i = 0; i < maxImages; i++) {
      content.push({
        type: "image_url",
        image_url: {
          url: input.images![i],
          detail: "high",
        },
      });
    }

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
      ...(input.customApiKey && { apiKey: input.customApiKey }),
      ...(input.customModel && { model: input.customModel }),
    });

    const responseContent = response.choices[0]?.message?.content;
    if (typeof responseContent === "string") {
      return responseContent;
    }
    return "Erro ao gerar minuta";
  } catch (error) {
    console.error("Erro ao gerar minuta multimodal:", error);
    throw new Error("Falha ao gerar minuta com processamento multimodal");
  }
}

function getSystemPrompt(draftType: string, knowledgeBase?: string): string {
  const basePrompt = `Você é um assistente jurídico especializado em elaboração de peças processuais para o Tribunal de Justiça de São Paulo (TJSP).
Sua função é redigir minutas judiciais de alta qualidade, seguindo as normas técnicas, jurídicas e formais aplicáveis.

Diretrizes gerais:
- Use linguagem jurídica formal e técnica
- Cite fundamentos legais pertinentes (Código de Processo Civil, legislação específica)
- Estruture o texto de forma clara e organizada
- Seja objetivo e fundamentado
- Utilize precedentes jurisprudenciais quando apropriado
- Mantenha imparcialidade e fundamentação jurídica sólida`;

  const specificPrompts = {
    sentenca: `${basePrompt}

Você deve elaborar uma SENTENÇA judicial completa, contendo:
1. RELATÓRIO: Breve histórico do processo, partes, pedidos
2. FUNDAMENTAÇÃO: Análise jurídica dos fatos, provas e direito aplicável
3. DISPOSITIVO: Decisão final (procedência, improcedência, parcial procedência)
4. Condenação em custas e honorários advocatícios quando aplicável`,

    decisao: `${basePrompt}

Você deve elaborar uma DECISÃO INTERLOCUTÓRIA, contendo:
1. Breve contextualização da questão
2. Fundamentação jurídica da decisão
3. Dispositivo claro e objetivo
4. Intimações necessárias`,

    despacho: `${basePrompt}

Você deve elaborar um DESPACHO judicial, contendo:
1. Determinação ou providência ordenada
2. Breve fundamentação quando necessário
3. Intimações das partes`,

    acordao: `${basePrompt}

Você deve elaborar um ACÓRDÃO, contendo:
1. EMENTA: Resumo da decisão
2. RELATÓRIO: Histórico do processo e recurso
3. VOTO: Fundamentação do relator
4. DISPOSITIVO: Decisão colegiada final`,
  };

  let prompt = specificPrompts[draftType as keyof typeof specificPrompts] || basePrompt;

  // Adicionar base de conhecimento se fornecida
  if (knowledgeBase) {
    prompt += `\n\nBASE DE CONHECIMENTO (Decisões anteriores, teses e referências):\n${knowledgeBase}\n\nUtilize as informações da base de conhecimento acima para fundamentar melhor sua decisão, citando precedentes e teses relevantes quando apropriado.`;
  }

  return prompt;
}

function buildUserPrompt(input: GhostwriterInput): string {
  let prompt = `Elabore uma ${input.draftType} para o seguinte processo:\n\n`;
  
  prompt += `NÚMERO DO PROCESSO: ${input.processNumber}\n`;
  
  if (input.court) {
    prompt += `VARA/COMARCA: ${input.court}\n`;
  }
  
  if (input.judge) {
    prompt += `MAGISTRADO(A): ${input.judge}\n`;
  }
  
  if (input.plaintiff) {
    prompt += `\nAUTOR(ES): ${input.plaintiff}\n`;
  }
  
  if (input.defendant) {
    prompt += `RÉU(S): ${input.defendant}\n`;
  }
  
  if (input.subject) {
    prompt += `\nASSUNTO/OBJETO:\n${input.subject}\n`;
  }
  
  if (input.facts) {
    prompt += `\nFATOS RELEVANTES:\n${input.facts}\n`;
  }
  
  if (input.evidence) {
    prompt += `\nPROVAS:\n${input.evidence}\n`;
  }
  
  if (input.requests) {
    prompt += `\nPEDIDOS:\n${input.requests}\n`;
  }

  prompt += `\n\nCom base nas informações acima, elabore uma ${input.draftType} completa, bem fundamentada e tecnicamente adequada.`;
  
  return prompt;
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
