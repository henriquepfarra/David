/**
 * ContextBuilder - Builder Pattern para montagem de prompts do DAVID
 * 
 * Substitui concatenação de strings frágil por uma API fluente e testável.
 * Gera prompts estruturados com suporte a:
 * - Motores (A, B, C, D)
 * - RAG (Súmulas, Teses)
 * - Protocolo <thinking>
 * - Citações [[REF:...]]
 */

import {
    CORE_IDENTITY,
    CORE_TONE,
    CORE_GATEKEEPER,
    CORE_TRACEABILITY,
    CORE_ZERO_TOLERANCE,
    CORE_TRANSPARENCY,
    CORE_STYLE,
    CORE_THINKING,
} from "../prompts/core";

import {
    CORE_ORCHESTRATOR,
    CORE_MOTOR_A,
    CORE_MOTOR_B,
    CORE_MOTOR_C,
    CORE_MOTOR_D,
} from "../prompts/engines";

import type { RagResult } from "./RagService";

// ============================================
// TIPOS
// ============================================

export interface ProcessContext {
    processNumber?: string;
    court?: string;
    plaintiff?: string;
    defendant?: string;
    subject?: string;
    facts?: string;
    requests?: string;       // Pedidos do processo
    documentContent?: string;
}

export interface BuilderOptions {
    enableThinking?: boolean;     // Ativa protocolo <thinking>
    enableCitations?: boolean;    // Ativa citações [[REF:...]]
    enableStyle?: boolean;        // Ativa manual de redação (para /minutar)
    strictMode?: boolean;         // Motor D mais rigoroso
}

// ============================================
// CONTEXT BUILDER
// ============================================

export class ContextBuilder {
    private sections: string[] = [];
    private options: BuilderOptions = {
        enableThinking: true,
        enableCitations: true,
        enableStyle: false,
        strictMode: false,
    };

    // ============================================
    // CONFIGURAÇÃO
    // ============================================

    /**
     * Define a persona (magistrado, assessor, etc.)
     */
    setPersona(persona: "magistrado" | "assessor" = "magistrado"): this {
        // Por enquanto, apenas "magistrado" é suportado
        // Futuro: diferentes personas com diferentes estilos
        return this;
    }

    /**
     * Ativa/desativa o protocolo <thinking>
     */
    enableThinking(enabled = true): this {
        this.options.enableThinking = enabled;
        return this;
    }

    /**
     * Ativa/desativa citações [[REF:...]]
     */
    enableCitations(enabled = true): this {
        this.options.enableCitations = enabled;
        return this;
    }

    /**
     * Ativa o manual de redação (para /minutar)
     */
    enableStyle(enabled = true): this {
        this.options.enableStyle = enabled;
        return this;
    }

    /**
     * Modo estrito para Motor D (revisão mais rigorosa)
     */
    setStrictMode(enabled = true): this {
        this.options.strictMode = enabled;
        return this;
    }

    // ============================================
    // BLOCOS CORE
    // ============================================

    /**
     * Adiciona blocos core (identidade, tom, segurança)
     */
    addCore(...blocks: string[]): this {
        for (const block of blocks) {
            if (block && block.trim()) {
                this.sections.push(block.trim());
            }
        }
        return this;
    }

    /**
     * Adiciona todos os blocos core padrão
     * @param options.skipGatekeeper - Se true, não inclui CORE_GATEKEEPER (para quando não há arquivos)
     */
    addAllCore(options: { skipGatekeeper?: boolean } = {}): this {
        this.sections.push(CORE_IDENTITY.trim());
        this.sections.push(CORE_TONE.trim());

        // GATEKEEPER só é relevante quando há arquivos (Motor A ativo)
        if (!options.skipGatekeeper) {
            this.sections.push(CORE_GATEKEEPER.trim());
            this.sections.push(CORE_TRACEABILITY.trim());
        }

        this.sections.push(CORE_ZERO_TOLERANCE.trim());
        this.sections.push(CORE_TRANSPARENCY.trim());

        if (this.options.enableThinking) {
            this.sections.push(CORE_THINKING.trim());
        }

        if (this.options.enableStyle) {
            this.sections.push(CORE_STYLE.trim());
        }

        return this;
    }

    // ============================================
    // MOTORES
    // ============================================

    /**
     * Adiciona motor específico com dados opcionais
     */
    addMotor(
        motor: "orchestrator" | "A" | "B" | "C" | "D",
        data?: string
    ): this {
        const motors: Record<string, string> = {
            orchestrator: CORE_ORCHESTRATOR,
            A: CORE_MOTOR_A,
            B: CORE_MOTOR_B,
            C: CORE_MOTOR_C,
            D: CORE_MOTOR_D,
        };

        const motorPrompt = motors[motor];
        if (motorPrompt) {
            this.sections.push(motorPrompt.trim());

            if (data) {
                this.sections.push(`[DADOS MOTOR ${motor}]\n${data}`);
            }
        }

        return this;
    }

    /**
     * Adiciona todos os motores em sequência
     */
    addAllMotors(): this {
        this.sections.push(CORE_ORCHESTRATOR.trim());
        this.sections.push(CORE_MOTOR_A.trim());
        this.sections.push(CORE_MOTOR_B.trim());
        this.sections.push(CORE_MOTOR_C.trim());
        this.sections.push(CORE_MOTOR_D.trim());
        return this;
    }

    // ============================================
    // INJEÇÃO DE DADOS
    // ============================================

    /**
     * Injeta contexto do processo
     */
    injectProcess(process: ProcessContext | null): this {
        if (!process) return this;

        const parts: string[] = ["[CONTEXTO DO PROCESSO]"];

        if (process.processNumber) {
            parts.push(`Número: ${process.processNumber}`);
        }
        if (process.court) {
            parts.push(`Vara/Juízo: ${process.court}`);
        }
        if (process.plaintiff) {
            parts.push(`Autor: ${process.plaintiff}`);
        }
        if (process.defendant) {
            parts.push(`Réu: ${process.defendant}`);
        }
        if (process.subject) {
            parts.push(`Assunto: ${process.subject}`);
        }
        if (process.facts) {
            parts.push(`\nFatos Narrados:\n${process.facts}`);
        }
        if (process.requests) {
            parts.push(`\nPedidos:\n${process.requests}`);
        }

        if (parts.length > 1) {
            this.sections.push(parts.join("\n"));
        }

        return this;
    }

    /**
     * Adiciona uma seção genérica com label
     */
    addSection(label: string, content: string): this {
        if (!content || !content.trim()) return this;
        this.sections.push(`[${label.toUpperCase()}]\n${content.trim()}`);
        return this;
    }

    /**
     * Injeta conteúdo do documento/PDF
     */
    injectDocument(content: string | null): this {
        if (!content) return this;

        this.sections.push(`[DOCUMENTO ANEXADO]\n${content}`);
        return this;
    }

    /**
     * Injeta resultados do RAG (Súmulas, Teses)
     */
    injectRagResults(results: RagResult[], options?: { withCitations?: boolean }): this {
        if (!results || results.length === 0) return this;

        const withCitations = options?.withCitations ?? this.options.enableCitations;

        const parts: string[] = ["[BASE DE CONHECIMENTO - SÚMULAS E PRECEDENTES]"];

        for (const result of results) {
            const citation = withCitations
                ? ` [[REF:${result.documentType?.toUpperCase() ?? "DOC"}_${result.id}]]`
                : "";

            parts.push(`---`);
            parts.push(`📌 ${result.title}${citation}`);
            parts.push(`Tipo: ${result.documentType ?? "documento"}`);
            parts.push(`Autoridade: Nível ${result.authorityLevel}`);
            parts.push(`Conteúdo: ${result.content}`);
        }

        this.sections.push(parts.join("\n"));
        return this;
    }

    /**
     * Injeta precedentes do gabinete (learnedTheses)
     */
    injectPrecedents(precedents: RagResult[]): this {
        if (!precedents || precedents.length === 0) return this;

        const parts: string[] = ["[PRECEDENTES DO GABINETE]"];
        parts.push("⚠️ Estes são precedentes internos. Aplicar com prioridade se o caso for similar.");

        for (const p of precedents) {
            parts.push(`---`);
            parts.push(`Precedente #${p.id}`);
            parts.push(p.content);
        }

        this.sections.push(parts.join("\n"));
        return this;
    }

    /**
     * Injeta preferências de estilo do gabinete (custom system prompt)
     */
    injectStylePreferences(preferences: string | null): this {
        if (!preferences || !preferences.trim()) return this;

        this.sections.push(`[PREFERÊNCIAS DE ESTILO DO GABINETE]\n${preferences.trim()}`);
        return this;
    }

    /**
     * Injeta instrução customizada
     */
    injectCustom(label: string, content: string): this {
        if (!content || !content.trim()) return this;

        this.sections.push(`[${label.toUpperCase()}]\n${content.trim()}`);
        return this;
    }

    // ============================================
    // BUILD
    // ============================================

    /**
     * Constrói o prompt final
     */
    build(): string {
        const separator = "\n\n---\n\n";
        return this.sections.join(separator);
    }

    /**
     * Limpa todas as seções (para reutilização)
     */
    reset(): this {
        this.sections = [];
        this.options = {
            enableThinking: true,
            enableCitations: true,
            enableStyle: false,
            strictMode: false,
        };
        return this;
    }

    /**
     * Debug: retorna as seções sem juntar
     */
    getSections(): string[] {
        return [...this.sections];
    }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Cria um ContextBuilder pré-configurado para chat normal
 */
export function createChatBuilder(): ContextBuilder {
    return new ContextBuilder()
        .enableThinking(true)
        .enableCitations(true)
        .enableStyle(false)
        .addAllCore()
        .addAllMotors();
}

/**
 * Cria um ContextBuilder pré-configurado para /minutar
 */
export function createMinutaBuilder(): ContextBuilder {
    return new ContextBuilder()
        .enableThinking(true)
        .enableCitations(false) // Não incluir [[REF:]] na minuta final
        .enableStyle(true)
        .addAllCore()
        .addAllMotors();
}

/**
 * Cria um ContextBuilder pré-configurado para /analise
 */
export function createAnaliseBuilder(): ContextBuilder {
    return new ContextBuilder()
        .enableThinking(true)
        .enableCitations(true)
        .enableStyle(false)
        .addAllCore()
        .addMotor("orchestrator")
        .addMotor("A")
        .addMotor("B")
        .addMotor("C");
}

/**
 * Cria um ContextBuilder baseado no resultado do IntentService
 * Esta é a factory principal para o fluxo v7.1
 */
export function createBuilderForIntent(
    intent: string,
    motors: Array<"A" | "B" | "C" | "D">
): ContextBuilder {
    // Se Motor A não está ativo, não precisamos do GATEKEEPER (protocolo de leitura de arquivos)
    const hasMotorA = motors.includes("A");

    const builder = new ContextBuilder()
        .enableThinking(true)
        .addAllCore({ skipGatekeeper: !hasMotorA });

    // Configurar baseado no intent
    switch (intent) {
        case "CONCEPTUAL":
        case "CASUAL":
        case "REFINEMENT":
            // Prompt limpo, sem motores extras
            builder.enableCitations(false);
            break;

        case "JURISPRUDENCE":
        case "SPECIFIC":
            // Ativa citações para referências
            builder.enableCitations(true);
            break;

        case "USER_PATTERN":
            // Padrão do gabinete - precisa do estilo
            builder.enableCitations(true);
            break;

        case "DRAFT":
        case "CASE_ANALYSIS":
            // Minuta/análise completa
            builder.enableCitations(true);
            builder.enableStyle(true);
            break;

        default:
            builder.enableCitations(true);
    }

    // Adicionar motores conforme determinado pelo IntentService
    for (const motor of motors) {
        builder.addMotor(motor);
    }

    return builder;
}

/**
 * Cria um ContextBuilder para modo ABSTRATO (sem processo)
 * Nunca inclui Motor A (leitor de PDF)
 */
export function createAbstractBuilder(
    intent: string,
    motors: Array<"A" | "B" | "C" | "D">
): ContextBuilder {
    // Filtra Motor A para modo abstrato
    const safeMotors = motors.filter(m => m !== "A");
    const builder = createBuilderForIntent(intent, safeMotors as Array<"A" | "B" | "C" | "D">);

    // INSTRUÇÃO CRÍTICA: Bloquear DIAGNÓSTICO DE LEITURA em consultas abstratas
    builder.addSection("NO_DIAGNOSTICO",
        `**INSTRUÇÃO CRÍTICA:** Esta é uma consulta jurídica abstrata (sem documentos anexados). ` +
        `NÃO gere "DIAGNÓSTICO DE LEITURA" ou "RESPOSTA TÉCNICA" formatada. ` +
        `Responda de forma direta e objetiva, como um assistente jurídico respondendo uma pergunta conceitual.`
    );

    return builder;
}

/**
 * Cria um ContextBuilder para modo CONCRETO (com processo)
 * Sempre adiciona orquestrador se tiver motores
 */
export function createConcreteBuilder(
    intent: string,
    motors: Array<"A" | "B" | "C" | "D">
): ContextBuilder {
    const builder = createBuilderForIntent(intent, motors);

    // Se tiver motores, adiciona orquestrador
    if (motors.length > 0) {
        builder.addMotor("orchestrator");
    }

    return builder;
}

