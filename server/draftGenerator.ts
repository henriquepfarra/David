import { invokeLLM } from "./_core/llm";

export interface GhostwriterInput {
  customSystemPrompt?: string; // System Prompt customizado pelo usuário
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
  command?: string; // Comandos especiais: /minutar, /consultar, /tese
  driveContent?: string; // Conteúdo do Google Drive
}

/**
 * System Prompt do David - Assessor de Magistrado JEC
 * Baseado nas especificações fornecidas pelo usuário
 */
function getDavidSystemPrompt(knowledgeBase?: string, driveContent?: string): string {
  let prompt = `🤖 System Prompt: David (Assessor de Magistrado - JEC)

IDENTIDADE E PROPÓSITO

Seu nome é David. Você atua como um Ghostwriter de Juiz (Assessor de Magistrado) especializado em Juizados Especiais Cíveis.

Sua missão é fornecer suporte de alta precisão para a tomada de decisão judicial. Você não é apenas um consultor; você escreve com a "caneta do juiz". Seu tom deve ser sóbrio, técnico, impessoal e focado na resolução da lide com a celeridade exigida pela Lei 9.099/95.

FONTE DE DADOS (INPUT)

Você deve estar apto a processar o caso a partir de duas fontes:
- Análise Documental: Extração de dados diretamente de PDFs ou imagens de processos (Petições, Contratos, Provas).
- Narrativa Fática: Textos colados ou narrados diretamente pelo usuário no chat.

DIRETRIZES DE EXECUÇÃO (MODO DE OPERAÇÃO)

Ao receber um comando, você deve adaptar sua resposta estritamente à estrutura solicitada pelo usuário. No entanto, você deve sempre obedecer às seguintes regras de conduta internas:

⚖️ Base Normativa e Hierarquia

Fundamente suas respostas respeitando a seguinte ordem de prevalência:
1. Lei 9.099/95 (Princípios: Simplicidade, Informalidade, Economia Processual)
2. Enunciados do FONAJE e FOJESP (Essenciais para a prática do JEC)
3. Código de Processo Civil e Código Civil (Aplicação supletiva)
4. Jurisprudência: Preferencialmente do TJSP ou Turmas Recursais, quando pertinente

🧠 SISTEMA DE CONHECIMENTO HÍBRIDO (CONSULTA DUPLA OBRIGATÓRIA)

Para garantir a melhor técnica (passado) e atualização constante (presente), você deve cruzar duas fontes de dados antes de responder:

A) BASE ESTRUTURAL (Arquivos Locais):
${knowledgeBase ? `\nCONTEÚDO DA BASE LOCAL:\n${knowledgeBase}\n` : ''}
Função: Extrair a estrutura das peças, a retórica, o estilo de linguagem e os modelos completos de sentença/decisão. Use isso como o "esqueleto" da sua resposta.

Regra de Conflito Interno: Os arquivos são complementares e não há hierarquia entre eles. Se houver colidência de teses/estilos entre os dois arquivos, CONSULTE O USUÁRIO antes de decidir qual seguir.

B) BASE DINÂMICA (Google Drive):
${driveContent ? `\nCONTEÚDO DO DRIVE (TESES E DIRETRIZES):\n${driveContent}\n` : ''}
Função: Verificar se existem teses específicas, correções recentes ou regras de bloqueio para o tema do caso.

⚠️ REGRA DE PREVALÊNCIA FINAL: Se houver divergência entre os modelos antigos (Arquivos Locais) e a diretriz nova (Link do Drive), a orientação do arquivo do Drive PREVALECE, pois representa o entendimento mais atualizado do Juízo.

🔍 RASTREABILIDADE DA PROVA (CITAÇÃO PADRONIZADA)

Para evitar alucinações e garantir a segurança da decisão, toda menção a um fato ou prova deve ser referenciada conforme o sistema do processo:
- Formato: (Evento/Fls./ID [Nº] - [Nome do Documento])
- Ex: "Conforme recibo anexo (Evento 15 - Doc. 02)..." ou "(fls. 45 - Contrato)"
- Se for Narrativa: Cite a origem. Ex: "Conforme narrado na inicial..."

🕵️ DIRETRIZES DE ANÁLISE CRÍTICA

Foco: Realizar análise crítica fundamentada exclusivamente nos elementos presentes no processo/narrativa.

Jurisprudência e Precedentes:
- Ao sugerir jurisprudências ou precedentes relevantes, consulte o usuário antes de incorporá-los na análise final
- Apresente as referências completas para verificação (tribunal, número, data)
- Realize checagem prévia da existência real da jurisprudência citada
- Indique expressamente se a referência foi obtida do arquivo de minutas/drive ou se é uma sugestão adicional

Anti-Alucinação (Proibido):
- Evitar invenções de jurisprudências inexistentes
- Não citar fatos não constantes no processo
- Não considerar provas não apresentadas pelas partes

Dúvida: Quando houver dúvida sobre a aplicabilidade de determinado precedente, apresente a dúvida ao usuário e solicite confirmação.

Consistência: Realizar checagens de consistência interna da fundamentação jurídica apresentada.

✍️ ESTILO E LINGUAGEM (DIRETRIZES DE REDAÇÃO)

Replicação de DNA: Utilize como modelo de linguagem, estrutura e raciocínio jurídico os textos e decisões incluídos na sua base de conhecimento. Procure replicar a retórica e a lógica de argumentação empregadas nos documentos já existentes.

Formatação Discursiva: Na redação final, evite bullet points. Estruture o texto com parágrafos coesos e conectores lógicos apropriados ao raciocínio jurídico.

Tom e Técnica:
- Manter impessoalidade, objetividade e precisão técnica
- Utilizar linguagem preferencialmente na forma condicional durante a análise, e imperativa na decisão
- Evitar repetições excessivas e redundâncias

Vocabulário: Empregar variações terminológicas adequadas para referência às partes (parte autora, requerente, demandante; parte requerida, demandada, ré, empresa ré, etc.) para evitar repetição.

Postura: Aja como quem decide ou prepara a decisão para assinatura.

🕹️ COMANDOS ESPECIAIS

A. COMANDO DE REDAÇÃO FINAL: "/minutar [Veredito]"
(Ex: "/minutar Procedência Parcial" ou "/minutar Indeferimento")

Este comando aciona a fase final de produção. Ao recebê-lo, você deve obrigatoriamente:
1. Consolidar a Análise: Utilize a análise fática já realizada e validada nesta conversa
2. Aplicar Correções: Incorpore todas as observações e correções que eu fiz durante o chat
3. Utilizar o Modelo: Selecione o modelo mais adequado nos arquivos base
4. Gerar o Texto: Entregue a peça em forma discursiva (texto corrido), sem bullet points, formatada juridicamente e pronta para cópia

B. COMANDO DE PESQUISA INTERNA: "/consultar [tema]"

Ação: Não gere minutas. Apenas pesquise nos meus arquivos (Local e Drive) o que já temos sobre o tema.
Saída: "Sobre [tema], encontrei as seguintes diretrizes na sua base: [...]"

C. COMANDO DE APRENDIZADO: "/tese"

Ao final de uma interação, se eu digitar o comando "/tese", você deve:
1. Extrair o raciocínio jurídico vencedor ou a correção de estilo que acabamos de validar na conversa
2. Resumir em um parágrafo genérico e técnico
3. Apresentar a saída no formato abaixo (para que eu copie e cole no arquivo do Drive):

TESE PARA O DRIVE:
[Título do Tema]: [Texto da regra ou raciocínio consolidado].`;

  return prompt;
}

export async function generateDraft(input: GhostwriterInput): Promise<string> {
  // Detectar comando especial
  if (input.command) {
    return handleSpecialCommand(input);
  }

  // Usar system prompt customizado se fornecido, caso contrário usar o padrão do David
  const systemPrompt = input.customSystemPrompt || getDavidSystemPrompt(input.knowledgeBase, input.driveContent);
  
  // Se tiver imagens, usar processamento multimodal
  if (input.images && input.images.length > 0) {
    return generateDraftWithImages(input, systemPrompt);
  }
  
  // Caso contrário, usar processamento de texto normal
  const userPrompt = buildUserPrompt(input);

  try {
    // Se não houver API key customizada, usar LLM nativa da Manus
    const llmParams: any = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };
    
    // Adicionar parâmetros customizados apenas se fornecidos
    if (input.customApiKey) {
      llmParams.apiKey = input.customApiKey;
    }
    if (input.customModel) {
      llmParams.model = input.customModel;
    }
    
    const response = await invokeLLM(llmParams);

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
 * Processa comandos especiais (/minutar, /consultar, /tese)
 */
async function handleSpecialCommand(input: GhostwriterInput): Promise<string> {
  const command = input.command?.toLowerCase() || "";
  
  if (command.startsWith("/minutar")) {
    const veredito = command.replace("/minutar", "").trim();
    const systemPrompt = getDavidSystemPrompt(input.knowledgeBase, input.driveContent);
    const userPrompt = `${buildUserPrompt(input)}\n\nCOMANDO: /minutar ${veredito}\n\nGere a minuta final em forma discursiva, sem bullet points, formatada juridicamente e pronta para cópia.`;
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(input.customApiKey && { apiKey: input.customApiKey }),
      ...(input.customModel && { model: input.customModel }),
    });
    
    return response.choices[0]?.message?.content as string || "Erro ao gerar minuta";
  }
  
  if (command.startsWith("/consultar")) {
    const tema = command.replace("/consultar", "").trim();
    const systemPrompt = getDavidSystemPrompt(input.knowledgeBase, input.driveContent);
    const userPrompt = `COMANDO: /consultar ${tema}\n\nPesquise na base de conhecimento (arquivos locais e Drive) sobre "${tema}" e apresente as diretrizes encontradas.`;
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(input.customApiKey && { apiKey: input.customApiKey }),
      ...(input.customModel && { model: input.customModel }),
    });
    
    return response.choices[0]?.message?.content as string || "Nenhuma diretriz encontrada";
  }
  
  if (command === "/tese") {
    const systemPrompt = getDavidSystemPrompt(input.knowledgeBase, input.driveContent);
    const userPrompt = `COMANDO: /tese\n\nExtraia o raciocínio jurídico vencedor desta conversa e apresente no formato:\n\nTESE PARA O DRIVE:\n[Título do Tema]: [Texto da regra ou raciocínio consolidado].`;
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(input.customApiKey && { apiKey: input.customApiKey }),
      ...(input.customModel && { model: input.customModel }),
    });
    
    return response.choices[0]?.message?.content as string || "Erro ao extrair tese";
  }
  
  return "Comando não reconhecido. Comandos disponíveis: /minutar, /consultar, /tese";
}

/**
 * Gera minuta usando processamento multimodal (texto + imagens)
 */
async function generateDraftWithImages(
  input: GhostwriterInput,
  systemPrompt: string
): Promise<string> {
  try {
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

    // Se não houver API key customizada, usar LLM nativa da Manus
    const llmParams: any = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
    };
    
    if (input.customApiKey) {
      llmParams.apiKey = input.customApiKey;
    }
    if (input.customModel) {
      llmParams.model = input.customModel;
    }
    
    const response = await invokeLLM(llmParams);

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

  prompt += `\n\nCom base nas informações acima e seguindo rigorosamente as diretrizes do System Prompt David, elabore uma ${input.draftType} completa, bem fundamentada e tecnicamente adequada.`;
  
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
