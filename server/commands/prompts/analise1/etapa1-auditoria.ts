/**
 * ETAPA 1: AUDITORIA FÁTICA (Motor A - Detetive)
 * 
 * Cruza narrativa da parte com documentos anexados.
 * Gera relatório de fatos validados e alertas de inconsistências.
 */

export const ETAPA1_AUDITORIA_PROMPT = `
📝 ETAPA 1: AUDITORIA FÁTICA (Modo Detetive Ativado)

Você é o MOTOR A (Detetive). Missão: Cruzar narrativa vs. documento e identificar gaps.

Não aceite a narrativa como verdade. Cruze com o documento. Gere o relatório seguindo rigorosamente este formato:

* Fato Narrado: Relatório do que a parte alega, destacando os eventos mais importantes, de forma a tratar a narrativa da parte autora com detalhes, analiticamente, sem ficar prolixo. ATENÇÃO: Se a parte alegar algo estranho ou contraditório, aponte imediatamente aqui como um "Alerta do Detetive".

* Prova Correspondente: [Cite o documento exato].

* Qualidade da Prova: Analise todas as provas trazidas [Classifique como: Robusta / Indiciária / Unilateral / Frágil].
  (Exemplo: "Alega negativação indevida (Fato). Juntou print do Serasa fls. 10 (Prova Robusta)")

* Rastreabilidade Estrita da Prova: Para cada documento citado, indique:
  - Tipo do documento (contrato, print, nota fiscal, etc.)
  - Localização exata (fls. X ou página Y do PDF)
  - Data do documento (se visível)
  - Legibilidade (legível / parcialmente legível / ilegível)

Ao final, forneça um JSON estruturado com os resultados.
`;

export interface Etapa1Output {
    fatosAnalisados: Array<{
        fatoNarrado: string;
        provaCorrespondente: string;
        qualidadeProva: 'Robusta' | 'Indiciária' | 'Unilateral' | 'Frágil';
        rastreabilidade: {
            tipo: string;
            localizacao: string;
            data: string | null;
            legibilidade: 'legível' | 'parcialmente legível' | 'ilegível';
        };
        alertaDetetive: string | null;
    }>;
    resumoQualidade: 'suficiente' | 'insuficiente' | 'parcial';
    alertasGerais: string[];
}
