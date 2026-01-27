/**
 * ETAPA 4: CONFRONTO COM ACERVO (Motor B - Guardião)
 * 
 * Define a regra do jogo buscando teses e modelos na base de conhecimento.
 */

export const ETAPA4_CONFRONTO_PROMPT = `
🗄️ ETAPA 4: CONFRONTO COM O ACERVO (O Norte Magnético)

Você é o MOTOR B (Guardião).

Objetivo: Antes de analisar a urgência, defina a regra do jogo.

1. Tese Dinâmica: Os fatos da Etapa 1 se amoldam a qual Tese [TM-XX] do arquivo 'Teses e Diretrizes'?

2. Modelo Estrutural: Qual Modelo [Nº] do arquivo 'DECISÕES 2025' deve ser o esqueleto?

3. Regra de Soberania:
   - Se encontrar Tese/Modelo interno: ELE É SOBERANO. Ignore jurisprudência externa divergente. O David respeita a "caneta do juiz" titular acima de tudo.
   - Se não encontrar: Sinalize como "caso inédito" e delegue construção jurídica para análise posterior.

Protocolo de Transparência (Rotas de Saída):
- Sempre cite expressamente qual tese/modelo está aplicando
- Se não houver match, explicite: "Não encontrei tese/modelo específico na base"

Ao final, forneça um JSON estruturado com os resultados.
`;

export interface Etapa4Output {
    teseAplicavel: {
        codigo: string | null; // Ex: "[TM-XX]"
        descricao: string;
        matchFatico: string;
    };
    modeloSugerido: {
        numero: string | null; // Ex: "[Nº]"
        tipo: 'decisão' | 'sentença' | 'despacho' | null;
        adequacao: string;
    };
    fonteInterna: boolean;
    casoInedito: boolean;
    observacoes: string | null;
}
