import { describe, expect, it } from "vitest";
import { extractThesisFromDraft } from "./thesisExtractor";

// Integration tests - run only when explicitly requested
// Use process.env.RUN_INTEGRATION_TESTS="true" to enable
const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";

// Use describe.runIf (Vitest feature) or conditionally skip
describe.runIf(runIntegration)("extractThesisFromDraft (Integration)", () => {
    it("extrai tese de uma decisão interlocutória", async () => {
        const sampleDraft = `
DECISÃO INTERLOCUTÓRIA

Vistos.

Trata-se de pedido de tutela de urgência formulado por JOÃO DA SILVA em face de EMPRESA XYZ LTDA, objetivando a suspensão imediata de cobrança indevida no valor de R$ 5.000,00.

Analisando os autos, verifico que estão presentes os requisitos do Art. 300 do CPC:

a) Probabilidade do direito (fumus boni iuris): Os documentos acostados aos autos demonstram que a cobrança é manifestamente indevida, vez que o contrato foi rescindido em 10/01/2024, conforme fls. 15/20. Aplica-se o CDC, Art. 6º, VIII.

b) Perigo de dano (periculum in mora): A negativação do nome do autor no SERASA causará dano irreparável à sua honra e crédito, configurando situação de urgência.

DISPOSITIVO:

Ante o exposto, DEFIRO a tutela de urgência para determinar a suspensão imediata da cobrança e abstenção de negativação do nome do autor.

Cite-se o réu para contestar em 15 dias.

Intimem-se.

São Paulo, 20 de março de 2024.
`;

        const result = await extractThesisFromDraft(sampleDraft, "decisao");

        expect(result).toBeDefined();
        expect(result.thesis).toBeTruthy();
        expect(result.thesis.length).toBeGreaterThan(50); // Tese deve ter conteúdo substancial

        expect(result.legalFoundations).toBeTruthy();
        expect(result.legalFoundations).toContain("300"); // Deve identificar Art. 300 CPC

        expect(result.keywords).toBeTruthy();
        expect(result.keywords.split(",").length).toBeGreaterThanOrEqual(3); // Pelo menos 3 palavras-chave

        expect(result.decisionPattern).toBeTruthy();
        expect(result.decisionPattern.length).toBeGreaterThan(20); // Descrição do padrão
    }, 30000); // Timeout de 30s para chamada LLM

    it("extrai tese de sentença", async () => {
        const sampleSentence = `
SENTENÇA

Vistos.

AUTOR propôs ação de indenização por danos morais em face de RÉU, alegando negativação indevida.

Fundamentação:

Aplica-se o CDC (Lei 8.078/90) à relação consumerista. O réu não comprovou a origem do débito (Art. 373, II, CPC - inversão do ônus da prova).

A negativação indevida configura dano moral in re ipsa (Súmula 385 do STJ).

Fixo indenização em R$ 10.000,00, considerando os critérios de razoabilidade e proporcionalidade.

DISPOSITIVO:

Julgo PROCEDENTE o pedido. Condeno o réu ao pagamento de R$ 10.000,00 a título de danos morais, com juros e correção.

Custas pelo réu.

Publique-se. Registre-se. Intimem-se.
`;

        const result = await extractThesisFromDraft(sampleSentence, "sentenca");

        expect(result).toBeDefined();
        expect(result.thesis).toBeTruthy();
        expect(result.legalFoundations).toContain("CDC"); // Deve identificar CDC
        expect(result.keywords).toBeTruthy();
    }, 30000);
});
