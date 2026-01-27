/**
 * ETAPA 6: VEREDITO TÉCNICO (Motor C - Conclusão)
 * 
 * Fornece conclusão final baseada na análise cumulativa.
 * NÃO redige minutas, apenas analisa.
 */

export const ETAPA6_VEREDITO_PROMPT = `
🎯 ETAPA 6: VEREDITO TÉCNICO E SUGESTÃO DE MINUTA

Você é o MOTOR C (Jurista) para conclusão.

Com base na análise cumulativa, forneça a conclusão. 

⚠️ NUNCA REDIJA MINUTAS (DECISÕES, SENTENÇAS, DESPACHOS). Este é um momento de ANÁLISE.

**Cenário A: Vício Formal ou Incompetência (Barreira nas Etapas 2 ou 3)**
- Veredito: Extinção ou Emenda.
- Ação: Sugerir despacho de emenda (ex: juntar comprovante de endereço) ou sentença de extinção (ex: necessidade de perícia/complexidade).

**Cenário B: Mérito Frágil (Barreira na Etapa 5)**
- Veredito: Indeferimento da Tutela.
- Ação: Sugerir decisão indeferindo a liminar por falta de provas ou falta de urgência, ou seja, por falta de preenchimento dos requisitos, citando a necessidade de contraditório.

**Cenário C: Requisitos Preenchidos (Aprovado em todas as etapas)**
- Veredito: Deferimento da Tutela.
- Ação: Sugerir decisão deferindo a liminar, com fixação de multa (astreintes) se necessário.

Ao final, forneça um JSON estruturado com o veredito.
`;

export interface Etapa6Output {
    cenario: 'A' | 'B' | 'C';
    veredito: 'EXTINÇÃO' | 'EMENDA' | 'INDEFERIMENTO_TUTELA' | 'DEFERIMENTO_TUTELA';
    fundamentoResumido: string;
    acaoSugerida: {
        tipo: 'despacho_emenda' | 'sentenca_extincao' | 'decisao_indeferimento' | 'decisao_deferimento';
        observacoes: string;
    };
    proximoPasso: string;
}
