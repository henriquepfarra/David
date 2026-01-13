/**
 * Testes para StreamParser
 */

import { describe, it, expect } from "vitest";
import {
    parseText,
    createStreamParser,
    hasCitations,
    hasThinking,
    extractThinking,
    stripThinking,
    formatCitation,
} from "../lib/StreamParser";

describe("StreamParser", () => {
    describe("parseText", () => {
        it("deve parsear texto simples sem tags", () => {
            const result = parseText("Olá, mundo!");
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe("text");
            expect(result[0].content).toBe("Olá, mundo!");
        });

        it("deve extrair bloco de thinking", () => {
            const result = parseText("Antes <thinking>Raciocínio aqui</thinking> Depois");
            expect(result).toHaveLength(3);
            expect(result[0].type).toBe("text");
            expect(result[1].type).toBe("thinking");
            expect(result[1].content).toBe("Raciocínio aqui");
            expect(result[2].type).toBe("text");
        });

        it("deve detectar citações", () => {
            const result = parseText("Conforme [[REF:SUMULA_STJ_54]], devemos...");
            expect(result).toHaveLength(3); // "Conforme " + citation + ", devemos..."
            expect(result[0].type).toBe("text");
            expect(result[0].content).toBe("Conforme ");
            expect(result[1].type).toBe("citation");
            expect(result[1].metadata?.sumulaId).toBe("54");
            expect(result[1].metadata?.tribunal).toBe("STJ");
            expect(result[2].type).toBe("text");
            expect(result[2].content).toBe(", devemos...");
        });

        it("deve detectar múltiplas citações", () => {
            const result = parseText("Ver [[REF:SUMULA_STJ_10]] e [[REF:SUMULA_STF_20]]");
            const citations = result.filter(s => s.type === "citation");
            expect(citations).toHaveLength(2);
        });
    });

    describe("createStreamParser", () => {
        it("deve processar chunks em sequência", () => {
            const parser = createStreamParser();

            const result1 = parser.processChunk("Olá ");
            const result2 = parser.processChunk("mundo!");
            const final = parser.flush();

            expect([...result1, ...result2, ...final].map(s => s.content).join("")).toContain("Olá mundo!");
        });

        it("deve detectar thinking que cruza chunks", () => {
            const parser = createStreamParser();

            parser.processChunk("Antes <think");
            parser.processChunk("ing>Pensando");
            parser.processChunk("</thinking> Depois");
            const final = parser.flush();

            // O thinking deve ter sido detectado
            expect(parser.isInThinking()).toBe(false);
        });
    });

    describe("utilitários", () => {
        it("hasCitations deve detectar citações", () => {
            expect(hasCitations("Ver [[REF:SUMULA_STJ_54]]")).toBe(true);
            expect(hasCitations("Texto normal")).toBe(false);
        });

        it("hasThinking deve detectar thinking", () => {
            expect(hasThinking("<thinking>blá</thinking>")).toBe(true);
            expect(hasThinking("Texto normal")).toBe(false);
        });

        it("extractThinking deve extrair conteúdo do thinking", () => {
            expect(extractThinking("<thinking>Meu raciocínio</thinking>")).toBe("Meu raciocínio");
            expect(extractThinking("Sem thinking")).toBe("");
        });

        it("stripThinking deve remover tags de thinking", () => {
            expect(stripThinking("Antes <thinking>X</thinking> Depois")).toBe("Antes  Depois");
        });

        it("formatCitation deve formatar citação para exibição", () => {
            const segment = {
                type: "citation" as const,
                content: "[[REF:SUMULA_STJ_54]]",
                metadata: {
                    sumulaId: "54",
                    tribunal: "STJ",
                    documentType: "sumula",
                },
            };
            expect(formatCitation(segment)).toBe("Súmula 54 do STJ");
        });

        it("formatCitation deve formatar súmula vinculante", () => {
            const segment = {
                type: "citation" as const,
                content: "[[REF:SUMULA_VINCULANTE_10]]",
                metadata: {
                    sumulaId: "10",
                    tribunal: "STF",
                    documentType: "sumula_vinculante",
                },
            };
            expect(formatCitation(segment)).toBe("Súmula Vinculante 10");
        });
    });
});
