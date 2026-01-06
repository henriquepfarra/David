/**
 * Testes Unitários - Busca Híbrida (RAG)
 * 
 * Arquivo: server/_core/hybridSearch.test.ts
 * 
 * Testa a lógica de detecção de referências exatas (Súmulas, Artigos, etc.)
 * Não usa mocks complexos - foca apenas na validação do regex.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock dos módulos que dependem de env vars ANTES de importar hybridSearch
vi.mock('./embeddings', () => ({
    generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    cosineSimilarity: vi.fn().mockReturnValue(0.9),
}));

vi.mock('./textSearch', () => ({
    searchSimilarDocuments: vi.fn().mockReturnValue([]),
}));

import { hasExactReference } from './hybridSearch';

describe('🧪 Busca Híbrida (RAG)', () => {

    describe('hasExactReference - Detecção de Referências Específicas', () => {

        // === SÚMULAS ===
        describe('Súmulas', () => {
            it('deve detectar "Súmula 100"', () => {
                expect(hasExactReference('O que diz a Súmula 100 do STJ?')).toBe(true);
            });

            it('deve detectar "súmula 54" (minúsculo)', () => {
                expect(hasExactReference('Conforme súmula 54')).toBe(true);
            });

            it('deve detectar "Sumula 385" (sem acento)', () => {
                expect(hasExactReference('Aplicação da Sumula 385')).toBe(true);
            });
        });

        // === ARTIGOS ===
        describe('Artigos', () => {
            it('deve detectar "Art. 50"', () => {
                expect(hasExactReference('Conforme Art. 50 do CDC')).toBe(true);
            });

            it('deve detectar "Artigo 927"', () => {
                expect(hasExactReference('O Artigo 927 do CC estabelece')).toBe(true);
            });

            it('deve detectar "art 14" (sem ponto)', () => {
                expect(hasExactReference('Veja o art 14')).toBe(true);
            });
        });

        // === LEIS ===
        describe('Leis', () => {
            it('deve detectar "Lei 8078"', () => {
                expect(hasExactReference('Disposições da Lei 8078')).toBe(true);
            });

            it('deve detectar "lei 9099"', () => {
                expect(hasExactReference('Previsão na lei 9099')).toBe(true);
            });
        });

        // === TEMAS E ENUNCIADOS ===
        describe('Temas e Enunciados', () => {
            it('deve detectar "Tema 1000"', () => {
                expect(hasExactReference('Conforme Tema 1000 do STF')).toBe(true);
            });

            it('deve detectar "Enunciado 37"', () => {
                expect(hasExactReference('Enunciado 37 do FONAJE')).toBe(true);
            });
        });

        // === FALSOS POSITIVOS (Não deve detectar) ===
        describe('Falsos Positivos - NÃO deve detectar', () => {
            it('NÃO deve detectar números aleatórios em contexto comum', () => {
                expect(hasExactReference('Tenho 2 processos pendentes')).toBe(false);
            });

            it('NÃO deve detectar apenas o número de processo', () => {
                expect(hasExactReference('Processo 1234567-89.2024.8.26.0001')).toBe(false);
            });

            it('NÃO deve detectar perguntas conceituais sem número', () => {
                expect(hasExactReference('Jurisprudência sobre dano moral em voo')).toBe(false);
            });

            it('NÃO deve detectar "súmula" sem número', () => {
                expect(hasExactReference('Existe alguma súmula sobre isso?')).toBe(false);
            });

            it('NÃO deve detectar "artigo" sem número', () => {
                expect(hasExactReference('Qual artigo trata disso?')).toBe(false);
            });
        });

    });

});
