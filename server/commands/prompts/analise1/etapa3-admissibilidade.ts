/**
 * ETAPA 3: ADMISSIBILIDADE MATERIAL (Motor C - Filtro de Densidade)
 * 
 * Verifica compatibilidade com rito sumaríssimo.
 * CHECKPOINT: Se incompatível, fluxo deve parar.
 */

export const ETAPA3_ADMISSIBILIDADE_PROMPT = `
🔍 ETAPA 3: ADMISSIBILIDADE MATERIAL (O Filtro da Complexidade)

Você é o MOTOR C (Jurista) em modo Filtro de Densidade. Missão: Filtrar complexidade incompatível.

Verifique se a causa é compatível com o Rito Sumaríssimo (Art. 3º e Art. 51, II).

1. Valor da Causa:
   - Excede 40 salários mínimos? Se sim, houve renúncia expressa ao excedente?
   - ATENÇÃO: Quanto ao valor da causa é imperioso que você não se baseie estritamente no valor apresentado pelo autor (que pode tentar burlar o teto), mas seja crítico quanto à composição dela.

2. Complexidade Probatória (Perícia):
   - A causa exige perícia técnica formal (ex: engenharia, grafotécnica, médica complexa) que não possa ser substituída por parecer técnico simples ou oitiva de expert (Art. 35)?
   - Teste: Se a prova depende de perícia, sugira Extinção por Incompetência (Enunciado 54 FONAJE / 6 FOJESP).

Ao final, forneça um JSON estruturado com os resultados e indique checkpoint: "PARAR" ou "CONTINUAR".
`;

export interface Etapa3Output {
    valorCausa: {
        valorDeclarado: string;
        excede40SM: boolean;
        renunciaExpressa: boolean | 'N/A';
        analiseComposicao: string;
    };
    complexidadeProbatoria: {
        exigePericia: boolean;
        tipoPericia: 'engenharia' | 'grafotécnica' | 'médica' | 'outra' | null;
        podeSubstituir: boolean;
        justificativa: string;
    };
    incompativel: boolean;
    motivo: 'valor_excedente' | 'pericia_complexa' | null;
    acaoSugerida: 'EXTINÇÃO_INCOMPETÊNCIA' | null;
    checkpoint: 'PARAR' | 'CONTINUAR';
}
