-- Migração: Adicionar campos de Quality Gate e Embeddings Duais ao learnedTheses
-- Data: 2026-01-10
-- Objetivo: Implementar sistema de aprendizado ativo com separação tese jurídica vs estilo

-- 1. Adicionar campos de separação (Tese vs Estilo)
ALTER TABLE learnedTheses ADD COLUMN legalThesis LONGTEXT NOT NULL DEFAULT '';
ALTER TABLE learnedTheses ADD COLUMN writingStyleSample LONGTEXT;
ALTER TABLE learnedTheses ADD COLUMN writingCharacteristics JSON;

-- 2. Migrar dados existentes (thesis -> legalThesis)
UPDATE learnedTheses SET legalThesis = thesis WHERE legalThesis = '';

-- 3. Tornar thesis opcional (DEPRECATED, mas mantém compatibilidade)
ALTER TABLE learnedTheses MODIFY COLUMN thesis LONGTEXT;

-- 4. Adicionar campos de Quality Gate (Workflow de Aprovação)
ALTER TABLE learnedTheses ADD COLUMN status ENUM('PENDING_REVIEW', 'ACTIVE', 'REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE learnedTheses ADD COLUMN reviewedAt TIMESTAMP NULL;
ALTER TABLE learnedTheses ADD COLUMN reviewedBy INT;
ALTER TABLE learnedTheses ADD COLUMN rejectionReason TEXT;

-- 5. Adicionar Embeddings Duais (Busca Semântica Separada)
ALTER TABLE learnedTheses ADD COLUMN thesisEmbedding JSON;
ALTER TABLE learnedTheses ADD COLUMN styleEmbedding JSON;

-- 6. Adicionar índice para queries eficientes por status
ALTER TABLE learnedTheses ADD INDEX learnedTheses_status_idx (status);

-- 7. Migrar teses existentes para status ACTIVE (já foram aprovadas implicitamente)
UPDATE learnedTheses SET status = 'ACTIVE' WHERE status = 'PENDING_REVIEW';
