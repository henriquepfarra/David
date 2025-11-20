import { drizzle } from "drizzle-orm/mysql2";
import { savedPrompts } from "../drizzle/schema.js";

const TUTELA_PROMPT = `Analise criticamente o processo e documentos anexos para avaliar a viabilidade do pedido de tutela de urgência, com base no Art. 300 do CPC. Considere:

Fontes de Fundamentação (Ordem Hierárquica):

1. Parâmetros definidos em conversas anteriores desta sessão.
2. Arquivos da base de conhecimento (use RAG para extrair dados específicos, como cláusulas contratuais ou provas documentais).
3. Conhecimento jurídico consolidado e raciocínio crítico.
4. Jurisprudência do TJSP e STJ sobre o tema (apenas quando necessário; forneça perfis de busca, ex.: "precedentes do STJ sobre tutela em contratos consumeristas de 2020-2025", sem citar casos inventados).

Estrutura da Análise:

**Contextualização Inicial**

- Síntese dos fatos relevantes (máximo 150 palavras, focando em elementos chave como partes, controvérsia e provas iniciais).
- Pedido de tutela formulado (descreva o objeto específico da liminar e os efeitos pretendidos).
- Rito processual: Confirme compatibilidade com o Juizado Especial Cível (verifique ausência de complexidade probatória ou necessidade de perícia).

**Análise dos Requisitos Cumulativos (Art. 300, CPC)**

A) Probabilidade do Direito (Fumus Boni Iuris)

- A narrativa fática e provas iniciais demonstram plausibilidade jurídica? Avalie robustez dos documentos para cognição sumária.
- Há fundamento legal claro (cite artigos relevantes, ex.: CDC Art. 6º para direitos consumeristas)?
- Classificação: ☐ Forte (ex.: provas irrefutáveis) ☐ Moderada (ex.: indícios consistentes) ☐ Fraca (ex.: alegações genéricas) ☐ Ausente. Justificativa obrigatória.

B) Perigo de Dano ou Risco ao Resultado Útil (Periculum in Mora)

- Demonstração concreta de dano irreparável ou de difícil reparação se houver demora?
- Urgência é evidente, específica e temporal (ex.: risco iminente de perda financeira comprovada por extratos)?
- Classificação: ☐ Demonstrado (ex.: elementos objetivos claros) ☐ Parcialmente demonstrado (ex.: indícios, mas genéricos) ☐ Não demonstrado. Justificativa obrigatória.

C) Reversibilidade da Medida

- A tutela é reversível em caso de improcedência final? Avalie risco de lesão grave à parte contrária (ex.: impactos financeiros mensuráveis).
- Avaliação: ☐ Reversível (ex.: medida cautelar simples) ☐ Parcialmente reversível (ex.: com caução possível) ☐ Irreversível. Justificativa obrigatória.

**Parecer Conclusivo**

Baseado na análise cumulativa:
- ☐ Deferimento Recomendado: Fundamentos (presença de fumus boni iuris e periculum in mora); sugestão de jurisprudência (ex.: perfil de busca no STJ).
- ☐ Indeferimento Recomendado: Requisito(s) não preenchido(s); justificativa técnica (ex.: "ausente periculum in mora, pois dano é reparável por perdas e danos").
- ☐ Postergação da Análise: Justificativa (ex.: necessidade de contraditório); diligências sugeridas (ex.: citação prévia ou produção de prova mínima).

**Observações Complementares**

- Pontos de atenção processual (ex.: prazos para recurso).
- Riscos jurídicos identificados (ex.: possibilidade de multa por litigância de má-fé).
- Sugestões de reforço argumentativo (ex.: anexar mais provas para fortalecer fumus boni iuris).

Diretrizes de Execução:

- **Objetividade**: Análise técnica, direta e fundamentada em fatos reais (nunca invente jurisprudência ou dados).
- **Criticidade**: Avalie realisticamente pontos fortes e fracos, com exemplos concretos.
- **Pragmatismo**: Foque na viabilidade prática da concessão, considerando o contexto judicial.
- **Fundamentação**: Cite dispositivos legais e perfis de jurisprudência relevantes.
- **Clareza**: Linguagem jurídica precisa, acessível e concisa; use RAG para consultas específicas em documentos.`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não configurada");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  try {
    // Inserir prompt padrão de tutela de urgência para o owner
    const ownerOpenId = process.env.OWNER_OPEN_ID;
    
    if (!ownerOpenId) {
      console.error("OWNER_OPEN_ID não configurada");
      process.exit(1);
    }

    // Buscar o userId do owner
    const { users } = await import("../drizzle/schema.js");
    const { eq } = await import("drizzle-orm");
    
    const ownerResult = await db.select().from(users).where(eq(users.openId, ownerOpenId)).limit(1);
    
    if (ownerResult.length === 0) {
      console.error("Owner não encontrado no banco de dados");
      process.exit(1);
    }

    const ownerId = ownerResult[0].id;

    // Verificar se já existe
    const existing = await db
      .select()
      .from(savedPrompts)
      .where(eq(savedPrompts.userId, ownerId))
      .limit(1);

    if (existing.length > 0) {
      console.log("Prompt padrão já existe. Pulando...");
      process.exit(0);
    }

    // Inserir prompt padrão
    await db.insert(savedPrompts).values({
      userId: ownerId,
      title: "Análise de Tutela de Urgência (Art. 300 CPC)",
      category: "tutela",
      content: TUTELA_PROMPT,
      description: "Análise criteriosa de viabilidade de tutela de urgência com base no Art. 300 do CPC, avaliando fumus boni iuris, periculum in mora e reversibilidade.",
      isDefault: 1,
    });

    console.log("✅ Prompt padrão de tutela de urgência criado com sucesso!");
  } catch (error) {
    console.error("Erro ao criar prompt padrão:", error);
    process.exit(1);
  }
}

main();
