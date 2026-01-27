/**
 * ETAPA 5: ANÁLISE DE TUTELA DE URGÊNCIA (Motor C + D)
 * 
 * Bifásica: Motor C verifica requisitos, Motor D confronta.
 */

export const ETAPA5_TUTELA_PROMPT = `
⚡ ETAPA 5: ANÁLISE DA TUTELA DE URGÊNCIA

Só analise se passou pelas etapas anteriores. Cruze a narrativa com o Relatório Fático-Probatório da Etapa 1.

Chamada de Sistema (Bifásica):

**FASE 1 - MOTOR C (Jurista):**
Verifique o preenchimento dos requisitos da tutela (Fumus Boni Iuris):

A) Probabilidade do direito: A prova é suficiente para convencer em cognição sumária ou depende de contraditório?

B) Perigo de Dano (Periculum in Mora): Há risco concreto e atual? (Ex: Nome já negativado, corte de luz agendado).
   Teste do Tempo: O fato é antigo? Se a parte demorou meses/anos para processar, a urgência está descaracterizada.

C) Reversibilidade: A medida esgota o objeto (satisfativa irreversível)? Há risco de prejuízo grave reverso à parte ré?

**FASE 2 - MOTOR D (Advogado do Diabo):**
Confronte a decisão e verifique eventuais inconsistências:
- Existe fato que derruba a conclusão do Motor C?
- A tese gera resultado teratológico?
- Hierarquia: FATO > TESE. Se fato contradiz tese, ALERTE em vez de forçar enquadramento.

Ao final, forneça um JSON estruturado com os resultados de ambas as fases.
`;

export interface Etapa5Output {
    faseMotorC: {
        probabilidadeDireito: {
            presente: boolean;
            fundamento: string;
            dependeContraditorio: boolean;
        };
        perigoDano: {
            presente: boolean;
            riscoConcreto: string;
            testeDoTempo: {
                fatoAntigo: boolean;
                tempoDecorrido: string;
                urgenciaDescaracterizada: boolean;
            };
        };
        reversibilidade: {
            mediaSatisfativaIrreversivel: boolean;
            riscoReu: string | null;
        };
        conclusaoPreliminar: 'DEFERIR' | 'INDEFERIR' | 'AGUARDAR';
    };
    faseMotorD: {
        inconsistenciaIdentificada: boolean;
        alertaRisco: string | null;
        fatoContraditorio: string | null;
        resultadoTeratologico: boolean;
        veredito: 'SÓLIDO' | 'RISCO_IDENTIFICADO';
    };
    recomendacaoFinal: 'DEFERIR_TUTELA' | 'INDEFERIR_TUTELA' | 'AGUARDAR_CONTRADITÓRIO';
}
