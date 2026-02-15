# 🧠 Arquitetura v7.1: Sistema de Orquestração Híbrida

**Última atualização:** 13/02/2026

## Visão Geral

O David possui um **fluxo de decisão bifurcado** para otimizar custo, latência e qualidade das respostas.

---

> [!CAUTION]
> ## ⚠️ AVISO DE OURO AOS DESENVOLVEDORES
> 
> **O `IntentService` serve apenas para NUTRIR o contexto.**
> 
> A resposta final deve ser **SEMPRE** gerada pelo **Modelo Principal (Cérebro)**, mantendo a persona de Assistente Jurídico Sênior.
> 
> - ❌ O David **nunca "entrega documentos"** (lista de resultados)
> - ✅ O David **"explica o conhecimento"** contido neles
> 
> **Exemplo:**
> - ❌ Errado: *"Encontrei: Súmula 54, REsp 123..."*
> - ✅ Certo: *"O STJ entende que o dano moral é presumido, conforme Súmula 54..."*
> 
> O RAG alimenta o **contexto**. O Cérebro **interpreta e responde**.

---


## Arquitetura de Atores

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPONENTES DO SISTEMA                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐                                                │
│  │   ORQUESTRADOR      │  gemini-2.5-flash-lite (fixo)                  │
│  │   (IntentService)   │  ─────────────────────────────────────────     │
│  │                     │  • Recebe: mensagem + contexto                 │
│  │   🎯 SÓ CLASSIFICA  │  • Devolve: { intent, path, motors[] }         │
│  │   ❌ NÃO RESPONDE   │  • Latência: ~200ms                            │
│  │                     │  • API key: resolve via sistema (Google)       │
│  └──────────┬──────────┘                                                │
│             │                                                           │
│             ▼                                                           │
│  ┌─────────────────────┐                                                │
│  │   CONTEXT BUILDER   │  TypeScript                                    │
│  │                     │  ─────────────────────────────────────────     │
│  │   🔧 MONTA PROMPT   │  • Recebe: intent + motors[]                   │
│  │                     │  • Injeta: RAG + Motores + Processo            │
│  │                     │  • Motor B: learned theses (dual embeddings)   │
│  └──────────┬──────────┘                                                │
│             │                                                           │
│             ▼                                                           │
│  ┌─────────────────────┐                                                │
│  │   LLM PRINCIPAL     │  Selecionado pelo usuário (3 providers)       │
│  │   (O Cérebro)       │  Padrão: gemini-3-flash-preview               │
│  │                     │  ─────────────────────────────────────────     │
│  │   ✅ SEMPRE RESPONDE │  • Providers: Google, OpenAI, Anthropic       │
│  │                     │  • Recebe: prompt montado                      │
│  │                     │  • Circuit breaker: opossum (50% / 30s)       │
│  └─────────────────────┘                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Decisão Completo

```
                           ┌─────────────────────┐
                           │  Mensagem do Usuário │
                           └──────────┬──────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │       ORQUESTRADOR (Flash)          │
                    │                                     │
                    │  1. Verifica: processId existe?     │
                    └───────────────┬─────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     │                     ▼
   ┌─────────────────────┐          │       ┌─────────────────────────┐
   │   CAMINHO A         │          │       │      CAMINHO B          │
   │   MODO ABSTRATO     │          │       │      MODO CONCRETO      │
   │   (Sem Processo)    │          │       │      (Com Processo)     │
   └──────────┬──────────┘          │       └────────────┬────────────┘
              │                     │                    │
              ▼                     │                    ▼
   ┌─────────────────────┐          │       ┌─────────────────────────┐
   │  TABELA RÍGIDA      │          │       │  DIAGNÓSTICO DINÂMICO   │
   │                     │          │       │                         │
   │  Baseada em:        │          │       │  4 Perguntas:           │
   │  "Onde está a       │          │       │  • Precisa do PDF? → A  │
   │   informação?"      │          │       │  • Precisa estilo? → B  │
   │                     │          │       │  • Precisa lei? → C     │
   │  Retorna:           │          │       │  • É doc final? → D     │
   │  { intent, motors } │          │       │                         │
   └──────────┬──────────┘          │       └────────────┬────────────┘
              │                     │                    │
              └─────────────────────┴────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │        CONTEXT BUILDER              │
                    │                                     │
                    │  Monta prompt com:                  │
                    │  • RAG (se necessário)              │
                    │  • Motores (conforme intent)        │
                    │  • Contexto do processo (se B)      │
                    └───────────────┬─────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │        LLM PRINCIPAL                │
                    │        (O Cérebro)                  │
                    │                                     │
                    │  ✅ Gera resposta SEMPRE            │
                    │  (Abstrato ou Concreto)             │
                    └───────────────┬─────────────────────┘
                                    │
                                    ▼
                              [ RESPOSTA ]
```

---

## Caminho A: Modo Abstrato (Sem Processo)

### Quando é ativado
- `processId === null`
- Usuário está na Home ou Chat Geral

### Lógica
Tabela fixa baseada em **"Onde está a informação?"**

### Matriz de Decisão

| Intent | Descrição | RAG | Motores | Exemplo |
|--------|-----------|-----|---------|---------|
| `CONCEPTUAL` | Definições, Lei Seca | 🔴 OFF | Nenhum | "O que é agravo?" |
| `JURISPRUDENCE` | Entendimento tribunais | 🟢 STF/STJ | C | "O que o STJ diz?" |
| `SPECIFIC` | Fonte específica | 🟢 Filtrado | C | "Enunciado FONAJE?" |
| `USER_PATTERN` | Padrão do gabinete | 🟢 User | B | "Como eu decido?" |
| `DRAFT_ABSTRACT` | Minuta genérica | 🟢 All | B + C | "Faça uma petição" |
| `REFINEMENT` | Ajuste de texto | 🔴 OFF | Nenhum | "Melhore isso" |
| `CASUAL` | Conversa informal | 🔴 OFF | Nenhum | "Obrigado!" |

> **⚠️ IMPORTANTE:** No Modo Abstrato, o **Motor A NUNCA é ativado** (não há PDF para ler).

---

## Caminho B: Modo Concreto (Com Processo)

### Quando é ativado
- `processId !== null`
- Usuário está na tela de Detalhes do Processo

### Lógica
Diagnóstico dinâmico com **4 perguntas**

```
┌────────────────────────────────────────────────────────────┐
│                  DIAGNÓSTICO DINÂMICO                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Q1: Precisa ler fatos do PDF?                             │
│      └─→ SIM: Motor A (Leitor de Fatos)                    │
│                                                            │
│  Q2: Precisa do estilo do juiz?                            │
│      └─→ SIM: Motor B (Espelho de Estilo)                  │
│                                                            │
│  Q3: Precisa de jurisprudência externa?                    │
│      └─→ SIM: Motor C (Pesquisador) + RAG                  │
│                                                            │
│  Q4: É documento final para entrega?                       │
│      └─→ SIM: Motor D (Revisor)                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Matriz de Decisão

| Tipo de Pedido | A | B | C | D | RAG | Exemplo |
|----------------|---|---|---|---|-----|---------|
| Verificação pontual | ✅ | ❌ | ✅ | ❌ | ON | "Verifique prescrição" |
| Análise de fatos | ✅ | ❌ | ❌ | ❌ | OFF | "Resuma os pedidos" |
| Consulta jurídica | ❌ | ❌ | ✅ | ❌ | ON | "Tem súmula sobre isso?" |
| Minuta completa | ✅ | ✅ | ✅ | ✅ | ON | "Faça a sentença" |
| Dúvida teórica* | ❌ | ❌ | ❌ | ❌ | OFF | "O que é X?" |
| Refinamento | ❌ | ❌ | ❌ | ❌ | OFF | "Melhore o texto" |

> **\*Dúvida teórica:** Mesmo dentro do processo, se for conceitual, **ignora o PDF** para não gastar tokens!

---

## Pseudocódigo de Implementação

```typescript
// IntentService.ts

interface IntentResult {
  intent: string;
  path: 'ABSTRACT' | 'CONCRETE';
  motors: ('A' | 'B' | 'C' | 'D')[];
  ragScope: 'OFF' | 'STF_STJ' | 'USER' | 'FILTERED' | 'ALL';
  ragFilter?: string; // ex: "FONAJE"
}

async function classify(
  message: string, 
  context: { processId?: number; history: Message[] }
): Promise<IntentResult> {
  
  const hasProcess = context.processId != null;

  if (!hasProcess) {
    // CAMINHO A: Lógica de Tabela (Abstrata)
    return await classifyAbstract(message);
  } else {
    // CAMINHO B: Diagnóstico Dinâmico (Concreto)
    return await classifyConcrete(message, context);
  }
}

async function classifyAbstract(message: string): Promise<IntentResult> {
  // Heurística primeiro (regex/keywords)
  const heuristic = tryHeuristic(message);
  if (heuristic) return heuristic;
  
  // LLM Flash se incerto
  return await callFlashClassifier(message, 'ABSTRACT');
}

async function classifyConcrete(
  message: string, 
  context: Context
): Promise<IntentResult> {
  // LLM Flash responde as 4 perguntas
  const diagnosis = await callFlashDiagnosis(message);
  
  return {
    intent: diagnosis.intent,
    path: 'CONCRETE',
    motors: [
      diagnosis.needsFacts && 'A',
      diagnosis.needsStyle && 'B',
      diagnosis.needsLaw && 'C',
      diagnosis.isFinalDoc && 'D',
    ].filter(Boolean),
    ragScope: diagnosis.needsLaw ? 'ALL' : 'OFF',
  };
}
```

---

## Plano de Testes: "The Gauntlet"

### Objetivo
Validar que o IntentService classifica corretamente e **não alucina necessidade de pesquisa**.

### Critérios de Aprovação
- Precisão ≥ **95%** em falsos positivos (Grupo 1)
- Classificação < **500ms**
- Fallback conservador: na dúvida → `SEARCH`

---

### 🔴 Grupo 1: Falsos Positivos (RAG deve ficar OFF)

Estes inputs contêm keywords que parecem jurídicas, mas NÃO devem ativar RAG:

| Input | Intent Esperado | RAG | Por quê? |
|-------|-----------------|-----|----------|
| "Vou ao **tribunal** hoje." | `CASUAL` | OFF | Uso coloquial |
| "O **juiz** estava cansado." | `CASUAL` | OFF | Comentário pessoal |
| "Qual o prazo do **recurso**?" | `CONCEPTUAL` | OFF | Lei Seca, não busca |
| "O que significa **tutela**?" | `CONCEPTUAL` | OFF | Definição de dicionário |
| "Melhore esse parágrafo." | `REFINEMENT` | OFF | Edição de texto |
| "Obrigado pela ajuda!" | `CASUAL` | OFF | Cortesia |
| "Pode resumir isso?" | `REFINEMENT` | OFF | Manipulação de resposta |

---

### 🟢 Grupo 2: Jurisprudência (RAG: STF/STJ)

| Input | Intent Esperado | RAG | Motores |
|-------|-----------------|-----|---------|
| "O que o **STJ** diz sobre dano moral?" | `JURISPRUDENCE` | STF/STJ | C |
| "Qual o entendimento do **STF**?" | `JURISPRUDENCE` | STF/STJ | C |
| "Tem **precedente** sobre isso?" | `JURISPRUDENCE` | STF/STJ | C |

---

### 🔵 Grupo 3: Fontes Específicas (RAG: Filtrado)

| Input | Intent Esperado | Filtro | Motores |
|-------|-----------------|--------|---------|
| "O que diz o **FONAJE**?" | `SPECIFIC` | FONAJE | C |
| "Tem **súmula vinculante**?" | `SPECIFIC` | VINCULANTE | C |
| "Qual **enunciado** se aplica?" | `SPECIFIC` | ENUNCIADOS | C |

---

### 🟣 Grupo 4: Modo Concreto (Com Processo)

| Input | Context | A | B | C | D |
|-------|---------|---|---|---|---|
| "Verifique a **prescrição**" | processId=123 | ✅ | ❌ | ✅ | ❌ |
| "Resuma os **pedidos**" | processId=123 | ✅ | ❌ | ❌ | ❌ |
| "Faça a **sentença**" | processId=123 | ✅ | ✅ | ✅ | ✅ |
| "O que é prescrição?" | processId=123 | ❌ | ❌ | ❌ | ❌ |

> **Nota:** Último caso é dúvida conceitual DENTRO do processo. Deve ignorar PDF!

---

### 🛠️ Ferramenta de Debug (DEV Mode)

Em ambiente de desenvolvimento, mostrar badge no chat:

```
[CONCEPTUAL | RAG: OFF | Motors: none] 
[JURISPRUDENCE | RAG: STF/STJ | Motors: C]
[CONCRETE | RAG: ALL | Motors: A+B+C+D]
```

---

## Sistema de Modulos Especializados

O David suporta modulos juridicos especializados, cada um com prompts e comportamentos proprios.

### Configuracao

Modulos sao definidos em `server/prompts/modules/index.ts`. Cada modulo tem:

```typescript
{
  id: string;          // ex: "jec", "familia", "criminal"
  name: string;        // Nome exibido no UI
  systemPrompt: string; // Prompt especializado (vazio = nao implementado)
  isAvailable: boolean; // Se aparece ativo no UI
}
```

### Estado Atual

| Modulo | Status | Descricao |
|--------|--------|-----------|
| JEC | ✅ Ativo | Juizado Especial Civel — prompts especializados |
| FONAJE | ✅ Ativo | Enunciados FONAJE integrados via RAG |
| Familia | ⏳ Em breve | `isAvailable: false` — UI mostra badge "Em breve" |
| Criminal | ⏳ Em breve | `isAvailable: false` — UI mostra badge "Em breve" |
| Fazenda | ⏳ Em breve | `isAvailable: false` — UI mostra badge "Em breve" |

### Como Ativar um Modulo Futuro

1. Preencher `systemPrompt` com prompt especializado em `server/prompts/modules/index.ts`
2. Mudar `isAvailable: true`
3. (Opcional) Adicionar seeds de conhecimento especifico ao RAG

O frontend ja trata modulos inativos com botoes desabilitados e label "Em breve".

---

## Proximos Passos

1. [ ] Implementar `IntentService.ts` com `classifyAbstract()` e `classifyConcrete()`
2. [ ] Criar prompts do Orquestrador (Flash) para classificacao
3. [ ] Atualizar `ContextBuilder` com `createBuilderForIntent()`
4. [ ] Integrar no endpoint de streaming
5. [ ] Executar bateria de testes "The Gauntlet"
6. [ ] Implementar badge de debug em DEV mode

