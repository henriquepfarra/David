/**
 * ThesisLearningService - Orquestração do Sistema de Aprendizado Ativo
 * 
 * Responsabilidades:
 * 1. Extrair tese dual (legal_thesis + writing_style_sample) de minutas aprovadas
 * 2. Gerar embeddings separados para cada tipo (busca semântica dual)
 * 3. Salvar no banco com status PENDING_REVIEW (Quality Gate)
 * 4. Invalidar cache do RAG quando teses forem aprovadas
 */

import { extractThesisFromDraft, ExtractedThesis } from "../thesisExtractor";
import { generateEmbedding } from "../_core/embeddings";
import { getDb } from "../db";
import { approvedDrafts, learnedTheses } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getRagService } from "./RagService";

export interface ProcessedThesis {
    id: number;
    legalThesis: string;
    writingStyleSample: string;
    status: "PENDING_REVIEW" | "ACTIVE" | "REJECTED";
}

export class ThesisLearningService {
    /**
     * Processa uma minuta aprovada:
     * - Extrai tese dual via LLM
     * - Gera embeddings separados
     * - Salva no banco com status PENDING_REVIEW
     */
    async processApprovedDraft(draftId: number): Promise<ProcessedThesis> {
        const db = await getDb();
        if (!db) {
            throw new Error("Database não disponível");
        }

        console.log(`[ThesisLearning] Processando draft aprovado #${draftId}...`);

        // 1. Buscar draft do banco
        const draftsResult = await db
            .select()
            .from(approvedDrafts)
            .where(eq(approvedDrafts.id, draftId))
            .limit(1);

        if (draftsResult.length === 0) {
            throw new Error(`Draft #${draftId} não encontrado`);
        }

        const draft = draftsResult[0];
        const draftContent = draft.editedDraft || draft.originalDraft;

        // 2. Extrair tese dual via LLM
        console.log(`[ThesisLearning] Extraindo tese dual via LLM...`);
        const extracted: ExtractedThesis = await extractThesisFromDraft(
            draftContent,
            draft.draftType
        );

        // 3. Gerar embeddings separados
        console.log(`[ThesisLearning] Gerando embeddings separados...`);
        const [thesisEmbedding, styleEmbedding] = await Promise.all([
            this.generateSafeEmbedding(extracted.legalThesis),
            this.generateSafeEmbedding(extracted.writingStyleSample),
        ]);

        // 4. Salvar no banco com status PENDING_REVIEW
        console.log(`[ThesisLearning] Salvando tese com status PENDING_REVIEW...`);
        const [insertResult] = await db.insert(learnedTheses).values({
            userId: draft.userId,
            approvedDraftId: draft.id,
            processId: draft.processId ?? undefined,

            // Campos novos (v2.0)
            legalThesis: extracted.legalThesis,
            writingStyleSample: extracted.writingStyleSample,
            writingCharacteristics: extracted.writingCharacteristics,
            thesisEmbedding,
            styleEmbedding,

            // Campos legados (compatibilidade)
            thesis: extracted.legalThesis,
            legalFoundations: extracted.legalFoundations,
            keywords: extracted.keywords,
            decisionPattern: extracted.writingStyleSample,

            // Quality Gate
            status: "PENDING_REVIEW",
            isObsolete: 0,
        }).$returningId();

        const thesisId = insertResult.id;

        console.log(
            `✅ [ThesisLearning] Tese #${thesisId} extraída e salva com sucesso (status: PENDING_REVIEW)`
        );

        return {
            id: Number(thesisId),
            legalThesis: extracted.legalThesis,
            writingStyleSample: extracted.writingStyleSample,
            status: "PENDING_REVIEW",
        };
    }

    /**
     * Aprova uma tese pendente (promove para ACTIVE)
     * Atualiza vetor no vector store se configurado
     */
    async approveThesis(thesisId: number, userId: number): Promise<void> {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        console.log(`[ThesisLearning] Aprovando tese #${thesisId}...`);

        await db
            .update(learnedTheses)
            .set({
                status: "ACTIVE",
                reviewedAt: new Date(),
                reviewedBy: userId,
            })
            .where(eq(learnedTheses.id, thesisId));

        // Invalidar cache do RAG para refletir nova tese ativa
        getRagService().invalidateCache();

        console.log(`✅ [ThesisLearning] Tese #${thesisId} aprovada e ativada`);
    }

    /**
     * Rejeita uma tese pendente
     */
    async rejectThesis(
        thesisId: number,
        userId: number,
        reason: string
    ): Promise<void> {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        console.log(`[ThesisLearning] Rejeitando tese #${thesisId}...`);

        await db
            .update(learnedTheses)
            .set({
                status: "REJECTED",
                reviewedAt: new Date(),
                reviewedBy: userId,
                rejectionReason: reason,
            })
            .where(eq(learnedTheses.id, thesisId));

        console.log(`❌ [ThesisLearning] Tese #${thesisId} rejeitada`);
    }

    /**
     * Edita e aprova uma tese pendente
     */
    async editAndApproveThesis(
        thesisId: number,
        userId: number,
        editedLegalThesis?: string,
        editedWritingStyle?: string
    ): Promise<void> {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        console.log(`[ThesisLearning] Editando e aprovando tese #${thesisId}...`);

        // Buscar tese atual
        const thesesResult = await db
            .select()
            .from(learnedTheses)
            .where(eq(learnedTheses.id, thesisId))
            .limit(1);

        if (thesesResult.length === 0) {
            throw new Error(`Tese #${thesisId} não encontrada`);
        }

        const currentThesis = thesesResult[0];

        // Determinar valores finais
        const finalLegalThesis = editedLegalThesis || currentThesis.legalThesis;
        const finalWritingStyle =
            editedWritingStyle || currentThesis.writingStyleSample || "";

        // Gerar novos embeddings se houve edição
        let newThesisEmbedding = currentThesis.thesisEmbedding as number[] | undefined;
        let newStyleEmbedding = currentThesis.styleEmbedding as number[] | undefined;

        if (editedLegalThesis) {
            newThesisEmbedding = await this.generateSafeEmbedding(editedLegalThesis);
        }
        if (editedWritingStyle) {
            newStyleEmbedding = await this.generateSafeEmbedding(editedWritingStyle);
        }

        // Atualizar no banco
        await db
            .update(learnedTheses)
            .set({
                legalThesis: finalLegalThesis,
                writingStyleSample: finalWritingStyle,
                thesis: finalLegalThesis, // Manter compatibilidade
                thesisEmbedding: newThesisEmbedding,
                styleEmbedding: newStyleEmbedding,
                status: "ACTIVE",
                reviewedAt: new Date(),
                reviewedBy: userId,
            })
            .where(eq(learnedTheses.id, thesisId));

        // Invalidar cache
        getRagService().invalidateCache();

        console.log(
            `✅ [ThesisLearning] Tese #${thesisId} editada e aprovada com sucesso`
        );
    }

    /**
     * Gera embedding com fallback seguro (retorna vazio se falhar)
     */
    private async generateSafeEmbedding(text: string): Promise<number[] | undefined> {
        if (!text || text.trim() === "") {
            console.warn("[ThesisLearning] Texto vazio, skipping embedding");
            return undefined;
        }

        try {
            return await generateEmbedding(text);
        } catch (error) {
            console.error(
                "[ThesisLearning] Erro ao gerar embedding, continuando sem vetor:",
                error
            );
            return undefined;
        }
    }
}

// Singleton
let _instance: ThesisLearningService | null = null;

export function getThesisLearningService(): ThesisLearningService {
    if (!_instance) {
        _instance = new ThesisLearningService();
    }
    return _instance;
}
