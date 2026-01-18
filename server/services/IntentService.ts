/**
 * IntentService - Router Semântico para o David
 *
 * Classifica a intenção do usuário para decidir:
 * - Quais motores ativar (A, B, C, D)
 * - Se o RAG deve ser acionado
 * - Qual escopo de busca usar
 *
 * Arquitetura v7.1:
 * - Caminho A (Abstrato): Tabela rígida para chat sem processo
 * - Caminho B (Concreto): Diagnóstico dinâmico com processo
 *
 * O IntentService SÓ CLASSIFICA, nunca responde ao usuário.
 */

import { invokeLLM } from "../_core/llm";

// ============================================
// TIPOS
// ============================================

export type Intent =
    | "CONCEPTUAL" // Definições, Lei Seca
    | "JURISPRUDENCE" // Entendimento STF/STJ
    | "SPECIFIC" // FONAJE, Súmulas específicas
    | "USER_PATTERN" // Padrão do gabinete
    | "DRAFT" // Minuta completa
    | "REFINEMENT" // Ajuste de texto
    | "CASUAL" // Conversa informal
    | "CASE_ANALYSIS"; // Análise com processo (Caminho B)

export type RagScope = "OFF" | "STF_STJ" | "USER" | "FILTERED" | "ALL";

export type Motor = "A" | "B" | "C" | "D";

export interface IntentResult {
    intent: Intent;
    path: "ABSTRACT" | "CONCRETE";
    motors: Motor[];
    ragScope: RagScope;
    ragFilter?: string; // ex: "FONAJE", "VINCULANTE"
    confidence: number; // 0-1
    method: "heuristic" | "llm";
}

export interface ClassifyContext {
    processId?: number | null;
    fileUri?: string | null;
    history?: Array<{ role: string; content: string }>;
}

// ============================================
// HEURÍSTICAS (Caminho rápido sem LLM)
// ============================================

const CASUAL_PATTERNS = [
    /^(ok|obrigad[oa]|valeu|entendi|certo|beleza|perfeito|bom dia|boa tarde|boa noite|olá|oi|tchau|até|legal)[\s!?.]*$/i,
    /^.{1,10}$/i, // Mensagens muito curtas
];

const REFINEMENT_PATTERNS = [
    /\b(melhore|reformule|resuma|ajuste|reescreva|simplifique|expanda|encurte|mais formal|menos formal|mude o tom)\b/i,
    /\b(pode resumir|faça um resumo|reescreva isso)\b/i,
];

const CONCEPTUAL_PATTERNS = [
    /^o que (é|são|significa)\b/i,
    /^qual (é )?o (prazo|conceito|definição)\b/i,
    /\b(defina|explique o que é|me explique)\b/i,
];

const JURISPRUDENCE_PATTERNS = [
    /\b(stj|stf|tribunal superior|supremo)\b/i,
    /\b(jurisprudência|precedente|entendimento (do|da))\b/i,
];

// Padrões para filtrar por tribunal específico
const STJ_SPECIFIC_PATTERN = /\b(stj|superior tribunal de justiça)\b/i;
const STF_SPECIFIC_PATTERN = /\b(stf|supremo|tribunal federal)\b/i;

const SPECIFIC_PATTERNS: Array<{ pattern: RegExp; filter: string }> = [
    // Adicionando STJ e STF como filtros específicos (maior prioridade que JURISPRUDENCE geral)
    { pattern: /\bsúmula.{0,20}stj\b/i, filter: "STJ" },
    { pattern: /\bstj.{0,20}súmula\b/i, filter: "STJ" },
    { pattern: /\bsúmula.{0,20}stf\b/i, filter: "STF" },
    { pattern: /\bstf.{0,20}súmula\b/i, filter: "STF" },
    { pattern: /\b(fonaje|fórum nacional)\b/i, filter: "FONAJE" },
    { pattern: /\bsúmula vinculante\b/i, filter: "VINCULANTE" },
    { pattern: /\benunciado\b/i, filter: "ENUNCIADOS" },
    { pattern: /\btema repetitivo\b/i, filter: "REPETITIVOS" },
];

// Padrões para ANÁLISE (deve ser ANTES de DRAFT para ter prioridade)
const ANALYSIS_PATTERNS = [
    /^analise\b/i, // "analise o pedido..."
    /^análise\b/i, // "análise o pedido..."
    /\banalise (o|a|os|as)\b/i, // "analise o pedido", "analise a tutela"
    /\banálise (o|a|os|as)\b/i, // "análise o pedido", "análise a tutela"
    /\b(analise|análise) (criticamente|detalhadamente|o processo|a tutela|o pedido|a viabilidade)\b/i,
    /\b(faça|realize|efetue) (uma )?(analise|análise)\b/i,
];

const DRAFT_PATTERNS = [
    /\b(faça|elabore|redija|minute|prepare|construa|monte)\b.*\b(sentença|decisão|despacho|contestação|petição|minuta|voto|acórdão)\b/i,
    /\bminute\b/i,
];

// Padrões para USER_PATTERN (como o próprio juiz decide/escreve)
const USER_PATTERN_PATTERNS = [
    /\b(como (eu|o juiz titular|este gabinete|nós|este juízo)|qual (meu|nosso)) (\w+ )*(decido|entendimento|posicionamento|decidi|decide)\b/i,
    /\b(meu|nosso) (padrão|estilo|tese|entendimento|posicionamento)\b/i,
    /\b(já decidi|tenho decidido|costumo decidir|normalmente decido)\b/i,
    /\bcomo eu (costumo|normalmente|geralmente) (escrevo|redijo|decido)\b/i,
];


/**
 * Tenta classificar usando heurísticas (sem LLM)
 */
function tryHeuristic(message: string): IntentResult | null {
    const trimmed = message.trim();

    // CASUAL: mensagens curtas ou padrões de cortesia
    for (const pattern of CASUAL_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                intent: "CASUAL",
                path: "ABSTRACT",
                motors: [],
                ragScope: "OFF",
                confidence: 0.9,
                method: "heuristic",
            };
        }
    }

    // REFINEMENT: edições de texto
    for (const pattern of REFINEMENT_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                intent: "REFINEMENT",
                path: "ABSTRACT",
                motors: [],
                ragScope: "OFF",
                confidence: 0.85,
                method: "heuristic",
            };
        }
    }

    // USER_PATTERN: perguntas sobre padrão do gabinete (PRIORIDADE ALTA)
    for (const pattern of USER_PATTERN_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                intent: "USER_PATTERN",
                path: "ABSTRACT",
                motors: ["B"], // Motor B: Estilo/Padrão
                ragScope: "USER", // Buscar apenas teses do usuário
                confidence: 0.9,
                method: "heuristic",
            };
        }
    }

    // ANALYSIS: análise de processo/pedido (PRIORIDADE ALTA - antes de DRAFT)
    for (const pattern of ANALYSIS_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                intent: "CASE_ANALYSIS",
                path: "ABSTRACT",
                motors: ["A", "B", "C", "D"], // Todos os motores para análise completa
                ragScope: "ALL", // Busca ampla para análise
                confidence: 0.9,
                method: "heuristic",
            };
        }
    }

    // DRAFT: minutas (depois de análise para não confundir)
    for (const pattern of DRAFT_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                intent: "DRAFT",
                path: "ABSTRACT",
                motors: ["B", "C"],
                ragScope: "ALL",
                confidence: 0.9,
                method: "heuristic",
            };
        }
    }

    // SPECIFIC: fontes específicas (antes de jurisprudência geral)
    for (const { pattern, filter } of SPECIFIC_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                intent: "SPECIFIC",
                path: "ABSTRACT",
                motors: ["C"],
                ragScope: "FILTERED",
                ragFilter: filter,
                confidence: 0.9,
                method: "heuristic",
            };
        }
    }

    // JURISPRUDENCE: STJ/STF
    for (const pattern of JURISPRUDENCE_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                intent: "JURISPRUDENCE",
                path: "ABSTRACT",
                motors: ["C"],
                ragScope: "STF_STJ",
                confidence: 0.85,
                method: "heuristic",
            };
        }
    }

    // CONCEPTUAL: definições
    for (const pattern of CONCEPTUAL_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                intent: "CONCEPTUAL",
                path: "ABSTRACT",
                motors: [],
                ragScope: "OFF",
                confidence: 0.8,
                method: "heuristic",
            };
        }
    }

    // Não conseguiu classificar com heurística
    return null;
}

// ============================================
// CLASSIFICAÇÃO COM LLM (Gemini Flash)
// ============================================

const ABSTRACT_CLASSIFIER_PROMPT = `Você é um classificador de intenções para um assistente jurídico.

Classifique a mensagem do usuário em UMA das categorias:

- CONCEPTUAL: Dúvidas sobre definições, prazos legais, conceitos ("O que é agravo?")
- JURISPRUDENCE: Busca entendimento de STJ/STF ("O que o STJ diz?")
- SPECIFIC: Busca fonte específica como FONAJE, súmula vinculante ("Tem enunciado?")
- USER_PATTERN: Perguntas sobre como o próprio juiz decide ("Como eu decido?")
- CASE_ANALYSIS: Pedido para ANALISAR processo/pedido/documento ("Analise o pedido de tutela", "Analise a viabilidade")
- DRAFT: Pedido para ELABORAR/REDIGIR documento FINAL ("Faça uma sentença", "Minute a decisão")
- REFINEMENT: Pedido para ajustar texto anterior ("Melhore isso")
- CASUAL: Conversa informal, cortesia ("Obrigado")

IMPORTANTE: 
- "Analise o pedido" = CASE_ANALYSIS (análise crítica, não gera documento)
- "Faça/elabore/minute a decisão" = DRAFT (gera documento final)

Responda APENAS com o JSON:
{"intent": "CATEGORIA", "confidence": 0.0-1.0}`;

const CONCRETE_CLASSIFIER_PROMPT = `Você é um classificador de intenções para um assistente jurídico.

O usuário está com um PROCESSO aberto ou analisando um DOCUMENTO (PDF). Analise a mensagem e responda:

1. needsFacts: A resposta precisa ler os fatos do processo/PDF? (true/false)
2. needsStyle: A resposta precisa imitar o estilo do juiz? (true/false)
3. needsLaw: A resposta precisa buscar jurisprudência externa? (true/false)
4. isFinalDoc: É um documento final para entrega? (true/false)
5. intent: CASE_ANALYSIS, DRAFT, CONCEPTUAL, REFINEMENT ou CASUAL

IMPORTANTE:
- Se for dúvida teórica ("O que é X?"), needsFacts=false (não precisa do PDF)
- Se for refinamento ("melhore isso"), tudo false

Responda APENAS com o JSON:
{"needsFacts": bool, "needsStyle": bool, "needsLaw": bool, "isFinalDoc": bool, "intent": "TIPO", "confidence": 0.0-1.0}`;

/**
 * Classifica usando LLM Flash (Caminho Abstrato)
 */
async function classifyWithLLMAbstract(
    message: string,
    apiKey: string
): Promise<IntentResult> {
    try {
        const response = await callFlashClassifier(
            ABSTRACT_CLASSIFIER_PROMPT,
            message,
            apiKey
        );

        const parsed = JSON.parse(response);
        const intent = parsed.intent as Intent;
        const confidence = parsed.confidence || 0.7;

        // Mapear intent para configuração
        const config = getAbstractConfig(intent);

        return {
            intent,
            path: "ABSTRACT",
            motors: config.motors,
            ragScope: config.ragScope,
            ragFilter: config.ragFilter,
            confidence,
            method: "llm",
        };
    } catch (error) {
        console.error("[IntentService] Erro ao classificar com LLM:", error);
        // Fallback conservador
        return {
            intent: "JURISPRUDENCE",
            path: "ABSTRACT",
            motors: ["C"],
            ragScope: "STF_STJ",
            confidence: 0.5,
            method: "llm",
        };
    }
}

/**
 * Classifica usando LLM Flash (Caminho Concreto)
 */
async function classifyWithLLMConcrete(
    message: string,
    apiKey: string
): Promise<IntentResult> {
    try {
        const response = await callFlashClassifier(
            CONCRETE_CLASSIFIER_PROMPT,
            message,
            apiKey
        );

        const parsed = JSON.parse(response);

        const motors: Motor[] = [];
        if (parsed.needsFacts) motors.push("A");
        if (parsed.needsStyle) motors.push("B");
        if (parsed.needsLaw) motors.push("C");
        if (parsed.isFinalDoc) motors.push("D");

        return {
            intent: parsed.intent || "CASE_ANALYSIS",
            path: "CONCRETE",
            motors,
            ragScope: parsed.needsLaw ? "ALL" : "OFF",
            confidence: parsed.confidence || 0.7,
            method: "llm",
        };
    } catch (error) {
        console.error("[IntentService] Erro ao classificar concreto:", error);
        // Fallback conservador: ativa tudo
        return {
            intent: "CASE_ANALYSIS",
            path: "CONCRETE",
            motors: ["A", "B", "C", "D"],
            ragScope: "ALL",
            confidence: 0.5,
            method: "llm",
        };
    }
}

/**
 * Chama o Gemini Flash para classificação (não-streaming)
 */
async function callFlashClassifier(
    systemPrompt: string,
    userMessage: string,
    apiKey: string
): Promise<string> {
    const result = await invokeLLM({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        apiKey,
        model: "gemini-2.0-flash",
        provider: "google",
    });

    // Extrair conteúdo da resposta
    const content = result.choices[0]?.message?.content;
    if (!content) {
        throw new Error("Resposta vazia do classificador");
    }

    // content pode ser string ou array
    const text = typeof content === "string"
        ? content
        : content.map(c => c.type === "text" ? c.text : "").join("");

    // Limpar possíveis markdown code blocks
    return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

/**
 * Retorna configuração para intent abstrata
 */
function getAbstractConfig(intent: Intent): {
    motors: Motor[];
    ragScope: RagScope;
    ragFilter?: string;
} {
    switch (intent) {
        case "CONCEPTUAL":
        case "CASUAL":
        case "REFINEMENT":
            return { motors: [], ragScope: "OFF" };

        case "JURISPRUDENCE":
            return { motors: ["C"], ragScope: "STF_STJ" };

        case "SPECIFIC":
            return { motors: ["C"], ragScope: "FILTERED" };

        case "USER_PATTERN":
            return { motors: ["B"], ragScope: "USER" };

        case "CASE_ANALYSIS":
            return { motors: ["A", "B", "C", "D"], ragScope: "ALL" }; // Análise completa com todos os motores

        case "DRAFT":
            return { motors: ["B", "C"], ragScope: "ALL" };

        default:
            return { motors: ["C"], ragScope: "STF_STJ" };
    }
}

// ============================================
// API PÚBLICA
// ============================================

/**
 * Classifica a intenção do usuário
 *
 * @param message - Mensagem do usuário
 * @param context - Contexto (processId, histórico)
 * @param apiKey - Chave da API para LLM Flash
 */
export async function classify(
    message: string,
    context: ClassifyContext,
    apiKey: string
): Promise<IntentResult> {
    // -----------------------------------------------------------------------
    // [MODIFICAÇÃO DO USUÁRIO]: Considera fileUri também como indicador de processo (caminho concreto)
    // -----------------------------------------------------------------------
    const hasProcess = context.processId != null || !!context.fileUri;

    console.log(
        `[IntentService] Classificando: "${message.substring(0, 50)}..." | Processo/Arquivo: ${hasProcess} (PID: ${context.processId}, File: ${!!context.fileUri})`
    );

    if (!hasProcess) {
        // CAMINHO A: Modo Abstrato
        // 1. Tenta heurística primeiro
        const heuristic = tryHeuristic(message);
        if (heuristic) {
            console.log(
                `[IntentService] Heurística: ${heuristic.intent} (${heuristic.confidence})`
            );
            return heuristic;
        }

        // 2. Usa LLM Flash se incerto
        const result = await classifyWithLLMAbstract(message, apiKey);
        console.log(`[IntentService] LLM: ${result.intent} (${result.confidence})`);
        return result;
    } else {
        // CAMINHO B: Modo Concreto
        // Mesmo com processo, verifica se é dúvida conceitual primeiro
        const heuristic = tryHeuristic(message);
        if (
            heuristic &&
            (heuristic.intent === "CONCEPTUAL" ||
                heuristic.intent === "CASUAL" ||
                heuristic.intent === "REFINEMENT")
        ) {
            console.log(
                `[IntentService] Heurística (concreto): ${heuristic.intent}`
            );
            return { ...heuristic, path: "CONCRETE" };
        }

        // Diagnóstico dinâmico com LLM
        const result = await classifyWithLLMConcrete(message, apiKey);
        console.log(
            `[IntentService] LLM Concreto: ${result.intent} | Motors: ${result.motors.join(",")}`
        );
        return result;
    }
}

/**
 * Formata o resultado para debug (badge no chat)
 */
export function formatDebugBadge(result: IntentResult): string {
    const motorsStr = result.motors.length > 0 ? result.motors.join("+") : "none";
    return `[${result.intent} | RAG: ${result.ragScope} | Motors: ${motorsStr}]`;
}

export const IntentService = {
    classify,
    formatDebugBadge,
};

export default IntentService;
