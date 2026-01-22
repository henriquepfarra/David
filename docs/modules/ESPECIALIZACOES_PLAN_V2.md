# Plano de Implementação: Módulos Especializados - V2 (Simplificado)

**Data de Criação**: 21/01/2026
**Versão**: 2.0 - Arquitetura Simplificada
**Status**: 📋 Planejado

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Simplificada](#2-arquitetura-simplificada)
3. [Estrutura de Prompts por Módulo](#3-estrutura-de-prompts-por-módulo)
4. [Knowledge Base por Módulo](#4-knowledge-base-por-módulo)
5. [Módulo JEC (Implementação Completa)](#5-módulo-jec-implementação-completa)
6. [Método de Acionamento](#6-método-de-acionamento)
7. [Modelo de Dados](#7-modelo-de-dados)
8. [Integração com Sistema Atual](#8-integração-com-sistema-atual)
9. [Frontend](#9-frontend)
10. [Plano de Implementação](#10-plano-de-implementação)
11. [Futuras Evoluções](#11-futuras-evoluções)

---

## 1. Visão Geral

### 1.1 Princípio Central

> **"Cada módulo é um system prompt leve com instruções + conhecimento buscado via RAG."**

Prompt do módulo contém apenas instruções (estilo, hierarquia, regras). O conhecimento (enunciados FONAJE) fica no banco de dados e é **buscado dinamicamente** via RAG, igual às súmulas. Reusa infraestrutura existente.

### 1.2 O Que É um Módulo

Um módulo especializado é:

```
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULO JEC                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 System Prompt Leve (~800 tokens)                        │
│     - Identidade adaptada para JEC                          │
│     - Instruções de redação (linguagem acessível)           │
│     - Regras procedimentais (prazos, recursos)              │
│     - Hierarquia de fontes                                  │
│                                                             │
│  📚 Knowledge Base no Banco (RAG dinâmico)                  │
│     - Enunciados FONAJE (170+) ← seed uma vez               │
│     - Enunciados FONAJEF ← seed uma vez                     │
│     - Enunciados FOJESP ← seed uma vez                      │
│     - Embeddings pré-computados ✅                          │
│     - Busca sob demanda (só relevantes)                     │
│                                                             │
│  📝 Templates de Minuta (opcional)                          │
│     - Modelos de sentença JEC                               │
│     - Modelos de despacho                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Diferença da V1

| Aspecto | V1 (Complexa) | V2 Híbrida (Final) |
|---------|---------------|--------------------|
| Prompts | Injetados dinamicamente | Fixos no código |
| Enunciados | Busca RAG runtime | **Busca RAG (reusa existente)** |
| Tokens | ~6.000+ por request | ~1.200-1.500 |
| Tabelas | 3 novas tabelas | 0 novas (usa knowledgeBase) |
| Complexidade | Alta | Baixa |
| Manutenção | Difícil | Fácil (seed script) |

---

## 2. Arquitetura Simplificada

### 2.1 Estrutura de Arquivos

```
server/
├── prompts/
│   ├── core.ts                    # Base compartilhada (mínima)
│   ├── engines.ts                 # Motors A, B, C, D (genéricos)
│   │
│   └── modules/                   # 🆕 MÓDULOS ESPECIALIZADOS
│       ├── index.ts               # Registry simples
│       ├── types.ts               # Tipos
│       │
│       ├── jec/                   # Módulo JEC
│       │   ├── prompt.ts          # System prompt (só instruções)
│       │   └── templates.ts       # Modelos de minuta
│       │
│       ├── familia/               # Módulo Família (futuro)
│       │   ├── prompt.ts
│       │   └── templates.ts
│       │
│       ├── criminal/              # Módulo Penal (futuro)
│       │   ├── prompt.ts
│       │   └── templates.ts
│       │
│       └── fazenda/               # Módulo Fazenda (futuro)
│           ├── prompt.ts
│           └── templates.ts
│
├── scripts/                       # 🆕 SEEDS
│   └── seedFONAJE.ts             # Seed de enunciados (roda 1x)
```

### 2.2 Fluxo de Execução

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO SIMPLIFICADO                              │
└─────────────────────────────────────────────────────────────────────────┘

1. Usuário tem módulo "JEC" ativo
   │
   ▼
2. Usuário envia mensagem: "Cabe dano moral em JEC?"
   │
   ▼
3. Sistema carrega prompt leve do módulo
   │
   ┌──────────────────────────────────────┐
   │  const systemPrompt =               │
   │    getModulePrompt('jec');          │
   │                                      │
   │  // Retorna ~800 tokens             │
   │  // Só instruções, sem enunciados   │
   └──────────────────────────────────────┘
   │
   ▼
4. RAG busca conhecimento relevante
   │
   ┌──────────────────────────────────────┐
   │  const knowledge =                  │
   │    await ragService                 │
   │      .buildKnowledgeBaseContext(    │
   │        userId,                       │
   │        "dano moral em JEC"           │
   │      );                              │
   │                                      │
   │  // Retorna ~400 tokens             │
   │  // Só enunciados relevantes:       │
   │  // - Enunciado 8 (dano moral)      │
   │  // - Enunciado 25 (limite 40 SM)   │
   │  // - Enunciado 159 (presumido)     │
   │  // - Enunciado 161 (desc contrat)  │
   └──────────────────────────────────────┘
   │
   ▼
5. Chama LLM com contexto completo
   │
   ┌──────────────────────────────────────┐
   │  await invokeLLM({                  │
   │    systemPrompt +                    │
   │    knowledge,  // = ~1200 tokens    │
   │    messages,                         │
   │    ...                               │
   │  });                                 │
   └──────────────────────────────────────┘
   │
   ▼
6. Resposta já cita enunciados FONAJE relevantes
```

### 2.3 Sem Injeção, Sem Complexidade

```typescript
// ❌ V1: Complexo
const context = new ContextBuilder()
  .withCoreIdentity()
  .withCoreTone()
  .withUserSpecialization(userId)  // busca no banco
  .withMotorC()                     // injeta adição
  .withMotorD()                     // injeta adição
  .withRagResults(await searchFonaje(query))  // busca embeddings
  .build();

// ✅ V2: Simples
const systemPrompt = getModulePrompt(user.activeModule || 'default');
```

---

## 3. Estrutura de Prompts por Módulo

### 3.1 Anatomia de um Prompt de Módulo

Cada módulo tem um **único arquivo de prompt** que contém TUDO:

```typescript
// server/prompts/modules/jec/prompt.ts

export const JEC_SYSTEM_PROMPT = `
## Identidade

Você é David, assistente jurídico especializado em Juizados Especiais Cíveis (Lei 9.099/95).

Você auxilia magistrados na elaboração de minutas de sentenças, despachos e decisões, sempre observando os princípios e peculiaridades do sistema dos Juizados.

## Princípios que Você Segue (Art. 2º, Lei 9.099/95)

1. **Oralidade** - Valorizar a palavra falada, atas simplificadas
2. **Simplicidade** - Procedimentos descomplicados
3. **Informalidade** - Flexibilização de formas
4. **Economia Processual** - Máximo resultado, mínimo de atos
5. **Celeridade** - Rapidez na prestação jurisdicional

## Como Você Escreve

### Linguagem
- Use linguagem **acessível** - muitas partes atuam sem advogado
- Evite juridiquês excessivo
- Explique termos técnicos quando necessário
- Prefira frases curtas e diretas

### Fundamentação
- Seja **conciso** - causa simples = fundamentação simples
- Priorize enunciados e súmulas sobre doutrina
- Vá direto ao ponto da controvérsia
- Evite citações doutrinárias extensas

### Citações - IMPORTANTE
- ✅ Cite **Enunciados do FONAJE** (autoridade máxima em JEC)
- ✅ Cite **Súmulas Vinculantes do STF**
- ✅ Cite jurisprudência das **Turmas Recursais**
- ⚠️ **NUNCA cite STJ como precedente vinculante** (não cabe REsp em JEC!)
- Se mencionar STJ, deixe claro que é apenas orientação

## Hierarquia de Fontes (ordem de precedência)

1. Constituição Federal e Súmulas Vinculantes STF
2. Lei 9.099/95 e legislação específica
3. **Enunciados do FONAJE** ← Máxima autoridade interpretativa para JEC
4. Enunciados do FONAJEF (Juizados Federais)
5. Enunciados do FOJESP (São Paulo)
6. Súmulas das Turmas Recursais Estaduais
7. Jurisprudência das Turmas Recursais

## Prazos que Você Conhece

| Ato | Prazo | Fundamento |
|-----|-------|------------|
| Recurso Inominado | 10 dias | Art. 42 |
| Contrarrazões | 10 dias | Art. 42, §2º |
| Embargos de Declaração | 5 dias | Art. 49 |
| Cumprimento voluntário | 15 dias | Art. 52, IV |

## Recursos - ATENÇÃO

- ✅ Cabe Recurso Inominado (para Turma Recursal)
- ✅ Cabe Embargos de Declaração
- ✅ Cabe Recurso Extraordinário (STF) - questão constitucional
- ❌ **NÃO cabe Recurso Especial (STJ)** - Súmula 203/STJ
- ❌ NÃO cabe Agravo de Instrumento (regra geral)

## Competência (Art. 3º)

**Valor**: Até 40 salários mínimos

**Causas admitidas**:
- Ações de cobrança
- Reparação de danos (materiais e morais)
- Despejo para uso próprio
- Ações possessórias de imóveis até 40 SM

**Causas EXCLUÍDAS** (Art. 3º, §2º):
- Natureza alimentar
- Falimentar
- Fiscal
- Interesse da Fazenda Pública
- Acidentes de trabalho
- Estado e capacidade das pessoas

## Ao Minutar Sentenças

1. **Relatório**: Breve e objetivo
2. **Fundamentação**: Concisa, citando FONAJE quando aplicável
3. **Dispositivo**: Claro e exequível
4. **Custas**: Lembrar que não há custas em 1º grau (art. 54)
5. **Honorários**: Só em 2º grau, salvo má-fé (art. 55)

## Enunciados FONAJE que Você Conhece

[Ver seção de Knowledge Base - incorporado ao prompt em tempo de build]

## Segurança e Precisão

- Nunca invente enunciados ou súmulas
- Se não souber, diga que não sabe
- Sempre indique a fonte das informações
- Mantenha rastreabilidade (cite artigos, enunciados com número)
`;
```

### 3.2 Prompt Base (para usuários sem módulo ativo)

```typescript
// server/prompts/modules/default/prompt.ts

export const DEFAULT_SYSTEM_PROMPT = `
## Identidade

Você é David, assistente jurídico para magistrados brasileiros.

Você auxilia na elaboração de minutas de sentenças, despachos e decisões, com foco em precisão jurídica e rastreabilidade.

## Como Você Escreve

- Linguagem técnica adequada ao contexto judicial
- Fundamentação sólida com citação de fontes
- Dispositivos claros e exequíveis

## Hierarquia de Fontes

1. Constituição Federal e Súmulas Vinculantes
2. Legislação federal
3. Súmulas do STF e STJ
4. Jurisprudência consolidada

## Segurança

- Nunca invente jurisprudência
- Cite fontes sempre que possível
- Se não souber, diga que não sabe
`;
```

### 3.3 Registry de Módulos

```typescript
// server/prompts/modules/index.ts

import { JEC_SYSTEM_PROMPT } from './jec/prompt';
import { JEC_KNOWLEDGE } from './jec/knowledge';
import { DEFAULT_SYSTEM_PROMPT } from './default/prompt';
// import { FAMILIA_SYSTEM_PROMPT } from './familia/prompt';
// import { CRIMINAL_SYSTEM_PROMPT } from './criminal/prompt';

export type ModuleSlug = 'default' | 'jec' | 'familia' | 'criminal' | 'fazenda';

export interface Module {
  slug: ModuleSlug;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  systemPrompt: string;
  knowledge?: string;  // Knowledge base como string (para incluir no prompt)
  isAvailable: boolean;
}

const MODULES: Record<ModuleSlug, Module> = {
  default: {
    slug: 'default',
    name: 'Modo Geral',
    shortName: 'Geral',
    description: 'Assistente jurídico generalista',
    icon: 'Scale',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    isAvailable: true,
  },

  jec: {
    slug: 'jec',
    name: 'Juizado Especial Cível',
    shortName: 'JEC',
    description: 'Especializado em JEC (Lei 9.099/95) com Enunciados FONAJE, FONAJEF e FOJESP',
    icon: 'Gavel',
    systemPrompt: JEC_SYSTEM_PROMPT,
    knowledge: JEC_KNOWLEDGE,
    isAvailable: true,
  },

  familia: {
    slug: 'familia',
    name: 'Direito de Família',
    shortName: 'Família',
    description: 'Especializado em Varas de Família',
    icon: 'Heart',
    systemPrompt: '', // TODO
    isAvailable: false, // Ainda não implementado
  },

  criminal: {
    slug: 'criminal',
    name: 'Direito Penal',
    shortName: 'Penal',
    description: 'Especializado em Varas Criminais',
    icon: 'Shield',
    systemPrompt: '', // TODO
    isAvailable: false,
  },

  fazenda: {
    slug: 'fazenda',
    name: 'Fazenda Pública',
    shortName: 'Fazenda',
    description: 'Especializado em Varas de Fazenda Pública',
    icon: 'Building',
    systemPrompt: '', // TODO
    isAvailable: false,
  },
};

/**
 * Retorna o system prompt completo para um módulo
 */
export function getModulePrompt(slug: ModuleSlug): string {
  const module = MODULES[slug];

  if (!module || !module.isAvailable) {
    return MODULES.default.systemPrompt;
  }

  // Se tem knowledge base, concatena ao prompt
  if (module.knowledge) {
    return module.systemPrompt + '\n\n' + module.knowledge;
  }

  return module.systemPrompt;
}

/**
 * Retorna lista de módulos disponíveis
 */
export function getAvailableModules(): Module[] {
  return Object.values(MODULES).filter(m => m.isAvailable);
}

/**
 * Retorna todos os módulos (para UI mostrar "em breve")
 */
export function getAllModules(): Module[] {
  return Object.values(MODULES);
}

/**
 * Retorna um módulo específico
 */
export function getModule(slug: ModuleSlug): Module | undefined {
  return MODULES[slug];
}
```

---

## 4. Knowledge Base por Módulo

### 4.1 Conceito

Cada módulo tem seu **knowledge base fixo** - um arquivo com todo o conhecimento especializado que será incorporado ao prompt.

```
server/prompts/modules/
├── jec/
│   └── knowledge.ts     # FONAJE + FONAJEF + FOJESP
├── familia/
│   └── knowledge.ts     # IBDFAM + Súmulas família
├── criminal/
│   └── knowledge.ts     # Súmulas penais + tabelas de pena
└── fazenda/
    └── knowledge.ts     # Súmulas tributárias + FONAJEF
```

### 4.2 Estrutura do Knowledge Base

```typescript
// server/prompts/modules/jec/knowledge.ts

export const JEC_KNOWLEDGE = `
## Enunciados do FONAJE (Cíveis)

Os Enunciados abaixo são do Fórum Nacional de Juizados Especiais e têm força de orientação vinculante nos JECs.

### Competência e Valor da Causa

**Enunciado 1**: O exercício do direito de ação no Juizado Especial Cível é subordinado à comprovação de que a parte autora atende aos requisitos legais.

**Enunciado 2**: É cabível a conexão de causas em trâmite nos Juizados Especiais Cíveis quando houver identidade de pedido e causa de pedir.

**Enunciado 3**: O valor de alçada (40 SM) serve de parâmetro para competência e para fixar o valor máximo da condenação.

**Enunciado 4**: A complexidade da causa é critério de competência absoluta e pode ser reconhecida de ofício.

**Enunciado 8**: Ações de reparação de dano moral são de competência dos JECs, desde que até 40 SM.

### Procedimento

**Enunciado 15**: Não é admissível reconvenção, sendo permitido pedido contraposto na contestação.

**Enunciado 30**: A incompetência territorial pode ser declarada de ofício nos JECs.

**Enunciado 34**: As astreintes podem ser fixadas de ofício.

**Enunciado 35**: A inversão do ônus da prova (CDC, art. 6º, VIII) pode ser deferida de ofício.

### Recursos

**Enunciado 102**: O preparo recursal compreende custas e honorários advocatícios.

**Enunciado 115**: O relator pode negar provimento ao recurso manifestamente improcedente ou em desacordo com súmula.

**Enunciado 119**: O recurso inominado pode ser julgado por decisão monocrática quando versar sobre jurisprudência dominante.

### Execução

**Enunciado 46**: A multa de 10% (art. 523, CPC) é aplicável aos JECs.

**Enunciado 72**: Acordo não cumprido enseja execução direta, sem nova citação.

### Dano Moral

**Enunciado 25**: O valor da condenação deve ser limitado a 40 SM, inclusive danos morais e materiais cumulados.

**Enunciado 159**: Dano moral por inscrição indevida em cadastros é presumido (in re ipsa).

**Enunciado 161**: Mero descumprimento contratual não gera, por si só, dano moral indenizável.

### Relações de Consumo

**Enunciado 13**: Contratos bancários e financeiros, em relação de consumo, podem ser objeto de ação no JEC.

**Enunciado 70**: Ações relativas a serviços públicos, fundadas em relação de consumo, podem tramitar nos JECs.

**Enunciado 162**: O fornecedor responde objetivamente pelos danos causados aos consumidores.

### Honorários

**Enunciado 134**: No primeiro grau não há condenação em honorários, salvo má-fé.

**Enunciado 135**: A sentença de segundo grau deve fixar honorários entre 10% e 20%.

---

## Enunciados do FONAJEF (Juizados Federais)

### Competência

**Enunciado 1 FONAJEF**: Compete ao JEF processar e julgar ações de até 60 SM contra a União, autarquias, fundações e empresas públicas federais.

**Enunciado 2 FONAJEF**: A competência dos JEFs é absoluta.

### INSS e Previdenciário

**Enunciado 50 FONAJEF**: Nas ações previdenciárias, a citação do INSS pode ser feita na agência mais próxima.

**Enunciado 75 FONAJEF**: A aposentadoria por invalidez pressupõe incapacidade total e permanente para qualquer atividade laboral.

---

## Enunciados do FOJESP (São Paulo)

### Competência

**Enunciado 1 FOJESP**: São de competência do JEC as causas de menor complexidade até 40 SM.

**Enunciado 3 FOJESP**: A complexidade da prova não afasta a competência do JEC se o valor da causa estiver dentro do limite.

### Procedimento

**Enunciado 10 FOJESP**: O preparo deve ser comprovado no ato da interposição do recurso.

**Enunciado 12 FOJESP**: Admite-se a fungibilidade entre embargos de declaração e recurso inominado quando tempestivo.

---

## Súmulas Relevantes para JEC

**Súmula 203/STJ**: Não cabe recurso especial contra decisão proferida por órgão de segundo grau dos Juizados Especiais.

**Súmula 640/STF**: É cabível recurso extraordinário contra decisão proferida por turma recursal de juizado especial.

**Súmula 54/STJ**: Os juros moratórios fluem a partir do evento danoso, em caso de responsabilidade extracontratual.

**Súmula 362/STJ**: A correção monetária do valor da indenização do dano moral incide desde a data do arbitramento.

---

## Regras Rápidas

| Situação | Regra |
|----------|-------|
| Valor máximo | 40 SM (estadual) / 60 SM (federal) |
| Prazo recurso inominado | 10 dias |
| Prazo embargos | 5 dias |
| Custas 1º grau | Isento (art. 54) |
| Honorários 1º grau | Não há, salvo má-fé |
| Cabe REsp? | NÃO (Súmula 203/STJ) |
| Cabe RE? | SIM, se questão constitucional |
`;
```

### 4.3 Por Que Fixo no Código?

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **Banco de dados + RAG** | Atualização fácil | Lento, caro em tokens, complexo |
| **Fixo no código** | Rápido, previsível, fácil debug | Precisa deploy para atualizar |

**Decisão**: Fixo no código porque:
- FONAJE não muda há anos
- Deploy é simples (já fazemos para outras mudanças)
- Zero latência
- Zero custo de embedding
- Facilidade de manutenção

---

## 5. Módulo JEC (Implementação Completa)

### 5.1 Arquivo de Prompt

```typescript
// server/prompts/modules/jec/prompt.ts

export const JEC_SYSTEM_PROMPT = `
## Identidade

Você é David, assistente jurídico especializado em **Juizados Especiais Cíveis**.

Você auxilia magistrados de JEC na elaboração de minutas de sentenças, despachos e decisões, sempre observando os princípios da Lei 9.099/95 e a jurisprudência consolidada das Turmas Recursais.

## Princípios Norteadores (Art. 2º, Lei 9.099/95)

O processo nos Juizados orienta-se pelos critérios de:
- **Oralidade**: Valorização da palavra falada
- **Simplicidade**: Procedimentos descomplicados
- **Informalidade**: Flexibilização de formas
- **Economia Processual**: Máximo resultado com mínimo de atos
- **Celeridade**: Rapidez na prestação jurisdicional

## Estilo de Redação

### Linguagem
- Use linguagem **acessível** - muitas partes atuam sem advogado (até 20 SM)
- Evite juridiquês excessivo
- Explique termos técnicos quando necessário para compreensão da parte
- Prefira frases curtas e diretas

### Fundamentação
- Seja **conciso** - a complexidade da fundamentação deve ser proporcional à causa
- Priorize Enunciados do FONAJE sobre doutrina
- Cite jurisprudência das Turmas Recursais (não do STJ!)
- Vá direto ao ponto da controvérsia

### Dispositivo
- Redija dispositivos claros e autoexplicativos
- A parte deve entender o que foi decidido sem precisar de advogado
- Indique claramente valores, prazos e obrigações

## Hierarquia de Fontes - IMPORTANTE

Ao fundamentar decisões, observe esta ordem de precedência:

1. **Constituição Federal** e **Súmulas Vinculantes do STF**
2. **Lei 9.099/95** e legislação específica
3. **Enunciados do FONAJE** ← Autoridade máxima interpretativa para JEC
4. **Enunciados do FONAJEF** (se JEF)
5. **Enunciados do FOJESP** (se São Paulo)
6. Súmulas das Turmas Recursais Estaduais
7. Jurisprudência das Turmas Recursais

### ⚠️ ATENÇÃO: STJ

- **NUNCA** cite o STJ como precedente obrigatório em JEC
- O STJ **não julga recursos de JEC** (Súmula 203/STJ)
- Se mencionar STJ, esclareça que é apenas orientação doutrinária
- Prefira SEMPRE a jurisprudência das Turmas Recursais

## Competência

### Valor da Causa
- **JEC Estadual**: até 40 salários mínimos
- **JEF**: até 60 salários mínimos

### Causas Admitidas (Art. 3º)
- Ações de cobrança até o limite de alçada
- Reparação de danos (materiais e morais)
- Despejo para uso próprio
- Ações possessórias de imóveis até o limite
- Execução de título extrajudicial até o limite

### Causas EXCLUÍDAS (Art. 3º, §2º)
- Natureza alimentar
- Falimentar
- Fiscal
- Interesse da Fazenda Pública (estadual usa JEF)
- Acidentes de trabalho
- Estado e capacidade das pessoas
- Causas de maior complexidade

## Prazos Processuais

| Ato Processual | Prazo | Fundamento |
|----------------|-------|------------|
| Recurso Inominado | **10 dias** | Art. 42 |
| Contrarrazões | 10 dias | Art. 42, §2º |
| Embargos de Declaração | **5 dias** | Art. 49 |
| Cumprimento voluntário | 15 dias | Art. 52, IV |
| Embargos à execução | 15 dias | Art. 52, IX |

## Sistema Recursal

### Cabimento
- ✅ **Recurso Inominado** → Turma Recursal (10 dias)
- ✅ **Embargos de Declaração** → Próprio juízo (5 dias)
- ✅ **Recurso Extraordinário** → STF (questão constitucional)
- ❌ **Recurso Especial** → NÃO CABE (Súmula 203/STJ)
- ❌ **Agravo de Instrumento** → Regra: não cabe

### Preparo
- Compreende custas + honorários advocatícios (Enunciado 102 FONAJE)
- Deserção se não comprovado no ato da interposição

## Custas e Honorários

### Primeiro Grau
- **Custas**: Isento (art. 54, Lei 9.099/95)
- **Honorários**: Não há condenação, salvo litigância de má-fé (Enunciado 134 FONAJE)

### Segundo Grau (Recurso)
- **Preparo**: Custas + honorários
- **Honorários na sentença**: 10% a 20% (art. 55)

## Ao Minutar Sentenças

### Estrutura Recomendada
1. **Relatório**: Breve - "Trata-se de ação [...]. É o relatório."
2. **Fundamentação**: Concisa, com citação de enunciados
3. **Dispositivo**: Claro, com valores e prazos definidos

### Temas Frequentes

**Dano Moral em JEC**:
- Inscrição indevida em cadastros: dano presumido (Enunciado 159 FONAJE)
- Mero descumprimento contratual: não gera dano moral (Enunciado 161 FONAJE)
- Limite: até 40 SM, incluindo cumulação com dano material (Enunciado 25 FONAJE)

**Relações de Consumo**:
- Inversão do ônus pode ser de ofício (Enunciado 35 FONAJE)
- Responsabilidade objetiva do fornecedor (Enunciado 162 FONAJE)

**Execução**:
- Multa de 10% aplicável (Enunciado 46 FONAJE)
- Acordo não cumprido: execução direta (Enunciado 72 FONAJE)

## Segurança e Precisão

- Nunca invente enunciados ou súmulas - cite apenas o que está neste contexto
- Se não souber ou não tiver certeza, diga claramente
- Sempre indique número do enunciado/súmula quando citar
- Mantenha rastreabilidade das fontes
`;
```

### 5.2 Arquivo de Knowledge

```typescript
// server/prompts/modules/jec/knowledge.ts

export const JEC_KNOWLEDGE = `
## Base de Conhecimento: Enunciados e Súmulas

### ENUNCIADOS DO FONAJE (Fórum Nacional de Juizados Especiais)

#### Competência e Valor da Causa
- **Enunciado 1**: O exercício do direito de ação no JEC é subordinado à comprovação dos requisitos legais.
- **Enunciado 2**: É cabível conexão de causas nos JECs com identidade de pedido e causa de pedir.
- **Enunciado 3**: O valor de alçada (40 SM) serve para competência e limite máximo de condenação.
- **Enunciado 4**: A complexidade da causa é competência absoluta, reconhecível de ofício.
- **Enunciado 8**: Ações de dano moral são de competência do JEC se até 40 SM.

#### Procedimento
- **Enunciado 13**: Contratos bancários em relação de consumo podem tramitar no JEC.
- **Enunciado 15**: Não cabe reconvenção, apenas pedido contraposto.
- **Enunciado 26**: Multas processuais não estão sujeitas ao limite de 40 SM.
- **Enunciado 27**: Tutela de urgência independe de caução.
- **Enunciado 30**: Incompetência territorial pode ser declarada de ofício.
- **Enunciado 34**: Astreintes podem ser fixadas de ofício.
- **Enunciado 35**: Inversão do ônus da prova (CDC) pode ser de ofício.
- **Enunciado 70**: Ações de serviços públicos em relação de consumo cabem no JEC.

#### Valor da Condenação
- **Enunciado 25**: Limite de 40 SM inclui danos morais e materiais cumulados.

#### Dano Moral
- **Enunciado 159**: Dano moral por inscrição indevida em cadastros é presumido (in re ipsa).
- **Enunciado 161**: Mero descumprimento contratual não gera dano moral automaticamente.
- **Enunciado 162**: Fornecedor responde objetivamente pelos danos ao consumidor.

#### Execução
- **Enunciado 46**: Multa de 10% do art. 523 CPC é aplicável no JEC.
- **Enunciado 54**: Sentença arbitral não se executa no JEC.
- **Enunciado 72**: Acordo não cumprido: execução direta sem nova citação.
- **Enunciado 89**: Obrigação de fazer impossível converte-se em perdas e danos.

#### Recursos
- **Enunciado 102**: Preparo = custas + honorários advocatícios.
- **Enunciado 115**: Relator pode negar provimento a recurso manifestamente improcedente.
- **Enunciado 119**: Recurso pode ser julgado monocraticamente se jurisprudência dominante.

#### Honorários
- **Enunciado 134**: Sem honorários em 1º grau, salvo má-fé.
- **Enunciado 135**: Honorários em 2º grau: 10% a 20% do valor da condenação.

---

### ENUNCIADOS DO FONAJEF (Juizados Especiais Federais)

#### Competência
- **Enunciado 1 FONAJEF**: Competência até 60 SM contra União, autarquias e fundações federais.
- **Enunciado 2 FONAJEF**: Competência dos JEFs é absoluta.

#### Previdenciário
- **Enunciado 50 FONAJEF**: Citação do INSS pode ser na agência mais próxima.
- **Enunciado 75 FONAJEF**: Aposentadoria por invalidez exige incapacidade total e permanente.

---

### ENUNCIADOS DO FOJESP (São Paulo)

- **Enunciado 1 FOJESP**: JEC julga causas de menor complexidade até 40 SM.
- **Enunciado 3 FOJESP**: Complexidade da prova não afasta competência se valor dentro do limite.
- **Enunciado 10 FOJESP**: Preparo deve ser comprovado no ato da interposição.
- **Enunciado 12 FOJESP**: Fungibilidade entre embargos e recurso inominado se tempestivo.

---

### SÚMULAS RELEVANTES

#### STJ (orientação, não vinculante em JEC)
- **Súmula 203/STJ**: NÃO cabe recurso especial contra decisão de Turma Recursal de JEC.
- **Súmula 54/STJ**: Juros moratórios desde o evento danoso (resp. extracontratual).
- **Súmula 362/STJ**: Correção do dano moral incide desde o arbitramento.

#### STF
- **Súmula 640/STF**: Cabe RE contra decisão de Turma Recursal.
- **Súmula Vinculante 10**: Viola reserva de plenário decisão que afasta lei sem declará-la inconstitucional.

---

### TABELA DE REFERÊNCIA RÁPIDA

| Tema | Regra | Fonte |
|------|-------|-------|
| Valor máximo JEC estadual | 40 SM | Art. 3º, Lei 9.099 |
| Valor máximo JEF | 60 SM | Art. 3º, Lei 10.259 |
| Prazo recurso inominado | 10 dias | Art. 42 |
| Prazo embargos | 5 dias | Art. 49 |
| Custas 1º grau | Isento | Art. 54 |
| Honorários 1º grau | Não há (salvo má-fé) | Enunciado 134 FONAJE |
| Dano moral - cadastro indevido | Presumido | Enunciado 159 FONAJE |
| Descumprimento contratual | Não gera dano moral automático | Enunciado 161 FONAJE |
| Cabe REsp? | NÃO | Súmula 203/STJ |
| Cabe RE? | SIM (se questão constitucional) | Súmula 640/STF |
`;
```

### 5.3 Arquivo de Templates (Opcional)

```typescript
// server/prompts/modules/jec/templates.ts

export const JEC_TEMPLATES = {
  sentenca_procedente: `
SENTENÇA

Vistos etc.

[PARTES]

[RELATÓRIO BREVE]

É o relatório. DECIDO.

[FUNDAMENTAÇÃO - citar enunciados FONAJE quando aplicável]

Ante o exposto, JULGO PROCEDENTE o pedido para [DISPOSITIVO].

Sem custas nem honorários nesta instância (art. 54-55, Lei 9.099/95).

Transitada em julgado, arquivem-se.

P.R.I.

[LOCAL E DATA]
  `,

  sentenca_improcedente: `
SENTENÇA

Vistos etc.

[PARTES]

[RELATÓRIO BREVE]

É o relatório. DECIDO.

[FUNDAMENTAÇÃO]

Ante o exposto, JULGO IMPROCEDENTE o pedido.

Sem custas nem honorários nesta instância (art. 54-55, Lei 9.099/95).

Transitada em julgado, arquivem-se.

P.R.I.

[LOCAL E DATA]
  `,
};
```

---

## 6. Método de Acionamento

### 6.1 Duas Formas de Ativar

#### Opção A: Configurações (Persistente)

O usuário vai em Configurações → Módulo Ativo → Seleciona JEC

- Fica salvo no perfil
- Todas as conversas usam o módulo selecionado
- Ideal para quem trabalha sempre na mesma área

#### Opção B: Seletor Rápido no Chat (Por Sessão)

Um dropdown/botão no próprio chat para trocar rapidamente

- Não precisa sair do chat
- Pode mudar durante a conversa
- Ideal para quem alterna entre áreas

### 6.2 UI do Seletor Rápido

```
┌─────────────────────────────────────────────────────────────────────────┐
│  David                                              [JEC ▼] [⚙️]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │    Selecione o módulo:                                          │   │
│  │                                                                 │   │
│  │    ○ Geral (padrão)                                            │   │
│  │    ● JEC - Juizado Especial Cível                              │   │
│  │    ○ Família (em breve)                                         │   │
│  │    ○ Penal (em breve)                                           │   │
│  │    ○ Fazenda (em breve)                                         │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Conversa...                                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Comportamento

```typescript
// Prioridade de módulo:
// 1. Seleção na conversa atual (se houver)
// 2. Configuração do usuário (padrão)
// 3. 'default'

function getActiveModule(userId: number, conversationId?: number): ModuleSlug {
  // 1. Verificar se conversa tem módulo específico
  if (conversationId) {
    const conversation = getConversation(conversationId);
    if (conversation.moduleSlug) {
      return conversation.moduleSlug;
    }
  }

  // 2. Verificar configuração do usuário
  const userSettings = getUserSettings(userId);
  if (userSettings.defaultModule) {
    return userSettings.defaultModule;
  }

  // 3. Fallback
  return 'default';
}
```

---

## 7. Modelo de Dados

### 7.1 Alterações Mínimas

Apenas **uma coluna** na tabela `userSettings`:

```typescript
// drizzle/schema.ts

export const userSettings = mysqlTable("userSettings", {
  // ... campos existentes ...

  // 🆕 NOVO: Módulo padrão do usuário
  defaultModule: varchar("defaultModule", { length: 20 }).default('default'),
  // Valores: 'default' | 'jec' | 'familia' | 'criminal' | 'fazenda'
});
```

E **uma coluna** na tabela `conversations` (opcional, para módulo por conversa):

```typescript
export const conversations = mysqlTable("conversations", {
  // ... campos existentes ...

  // 🆕 NOVO: Módulo usado nesta conversa (se diferente do padrão)
  moduleSlug: varchar("moduleSlug", { length: 20 }),
});
```

### 7.2 Migrations

```sql
-- Adicionar coluna defaultModule em userSettings
ALTER TABLE userSettings
ADD COLUMN defaultModule VARCHAR(20) DEFAULT 'default';

-- Adicionar coluna moduleSlug em conversations (opcional)
ALTER TABLE conversations
ADD COLUMN moduleSlug VARCHAR(20) DEFAULT NULL;
```

### 7.3 Nenhuma Tabela Nova

Diferente da V1 que propunha 3 tabelas novas, a V2 usa:
- Zero tabelas novas
- 1-2 colunas novas em tabelas existentes

---

## 8. Integração com Sistema Atual

### 8.1 Alteração no davidRouter

```typescript
// server/davidRouter.ts

import { getModulePrompt, ModuleSlug } from './prompts/modules';

// No handler de sendMessage:

const sendMessage = protectedProcedure
  .input(z.object({
    conversationId: z.number(),
    content: z.string(),
    moduleSlug: z.string().optional(), // 🆕 Permite override por mensagem
  }))
  .mutation(async ({ ctx, input }) => {

    // 1. Determinar módulo ativo
    const activeModule = determineActiveModule(
      ctx.userId,
      input.conversationId,
      input.moduleSlug as ModuleSlug | undefined
    );

    // 2. Obter system prompt do módulo
    const systemPrompt = getModulePrompt(activeModule);

    // 3. Chamar LLM com prompt do módulo
    const response = await invokeLLM({
      systemPrompt,  // 🆕 Prompt completo do módulo
      messages: conversationHistory,
      // ... resto igual
    });

    // 4. Salvar módulo usado na conversa (opcional)
    if (activeModule !== 'default') {
      await updateConversationModule(input.conversationId, activeModule);
    }

    return response;
  });


function determineActiveModule(
  userId: number,
  conversationId: number,
  overrideModule?: ModuleSlug
): ModuleSlug {
  // 1. Override explícito na chamada
  if (overrideModule) {
    return overrideModule;
  }

  // 2. Módulo salvo na conversa
  const conversation = await getConversation(conversationId);
  if (conversation?.moduleSlug) {
    return conversation.moduleSlug as ModuleSlug;
  }

  // 3. Configuração padrão do usuário
  const settings = await getUserSettings(userId);
  if (settings?.defaultModule) {
    return settings.defaultModule as ModuleSlug;
  }

  // 4. Default
  return 'default';
}
```

### 8.2 O Que NÃO Muda

- ContextBuilder → Não usado para módulos (prompt já vem pronto)
- RagService → Continua igual (para teses aprendidas, docs do processo)
- IntentService → Continua igual
- Motors A/B/C/D → Podem ser incorporados nos prompts dos módulos se necessário

### 8.3 Coexistência com Features Existentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO COM MÓDULO ATIVO                               │
└─────────────────────────────────────────────────────────────────────────┘

1. System Prompt do Módulo (ex: JEC)
   ├── Identidade especializada
   ├── Regras de estilo
   ├── Enunciados FONAJE (hardcoded)
   └── Instruções específicas

2. + RAG de teses aprendidas do USUÁRIO (se houver)
   └── Teses que o usuário aprovou continuam funcionando

3. + Documentos do processo selecionado (se houver)
   └── PDFs, petições anexadas continuam funcionando

4. + Histórico da conversa
   └── Contexto da conversa atual

= Prompt final enviado ao LLM
```

O módulo **não substitui** as outras features, apenas adiciona o conhecimento especializado como base.

---

## 9. Frontend

### 9.1 Componentes Necessários

```
client/src/components/
├── modules/
│   ├── ModuleSelector.tsx      # Dropdown de seleção
│   ├── ModuleBadge.tsx         # Badge mostrando módulo ativo
│   └── ModuleCard.tsx          # Card para página de configurações
```

### 9.2 ModuleSelector (Dropdown no Chat)

```tsx
// client/src/components/modules/ModuleSelector.tsx

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Scale, Gavel, Heart, Shield, Building } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const MODULE_ICONS = {
  default: Scale,
  jec: Gavel,
  familia: Heart,
  criminal: Shield,
  fazenda: Building,
};

interface ModuleSelectorProps {
  currentModule: string;
  onModuleChange: (module: string) => void;
}

export function ModuleSelector({ currentModule, onModuleChange }: ModuleSelectorProps) {
  const { data: modules } = trpc.modules.list.useQuery();

  const currentModuleData = modules?.find(m => m.slug === currentModule);
  const CurrentIcon = MODULE_ICONS[currentModule as keyof typeof MODULE_ICONS] || Scale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className="h-4 w-4" />
          {currentModuleData?.shortName || 'Geral'}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {modules?.map((module) => {
          const Icon = MODULE_ICONS[module.slug as keyof typeof MODULE_ICONS] || Scale;
          return (
            <DropdownMenuItem
              key={module.slug}
              onClick={() => onModuleChange(module.slug)}
              disabled={!module.isAvailable}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span>{module.name}</span>
                {!module.isAvailable && (
                  <span className="text-xs text-muted-foreground">Em breve</span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 9.3 ModuleBadge (Indicador Visual)

```tsx
// client/src/components/modules/ModuleBadge.tsx

import { Badge } from '@/components/ui/badge';
import { Gavel, Heart, Shield, Building } from 'lucide-react';

const MODULE_CONFIG = {
  jec: { icon: Gavel, label: 'JEC', color: 'bg-blue-100 text-blue-700' },
  familia: { icon: Heart, label: 'Família', color: 'bg-pink-100 text-pink-700' },
  criminal: { icon: Shield, label: 'Penal', color: 'bg-red-100 text-red-700' },
  fazenda: { icon: Building, label: 'Fazenda', color: 'bg-green-100 text-green-700' },
};

interface ModuleBadgeProps {
  moduleSlug: string;
}

export function ModuleBadge({ moduleSlug }: ModuleBadgeProps) {
  if (moduleSlug === 'default' || !MODULE_CONFIG[moduleSlug]) {
    return null;
  }

  const config = MODULE_CONFIG[moduleSlug];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

### 9.4 Integração no Header do Chat

```tsx
// Em David.tsx ou ChatHeader.tsx

<div className="flex items-center justify-between p-4 border-b">
  <div className="flex items-center gap-2">
    <h1 className="text-lg font-semibold">David</h1>
    <ModuleBadge moduleSlug={activeModule} />
  </div>

  <div className="flex items-center gap-2">
    <ModuleSelector
      currentModule={activeModule}
      onModuleChange={handleModuleChange}
    />
    {/* outros botões */}
  </div>
</div>
```

### 9.5 Configurações (Módulo Padrão)

```tsx
// Em Configuracoes.tsx - adicionar seção

<Card>
  <CardHeader>
    <CardTitle>Módulo Especializado</CardTitle>
    <CardDescription>
      Selecione o módulo padrão para suas conversas
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {modules?.map((module) => (
        <div
          key={module.slug}
          className={`flex items-center justify-between p-4 rounded-lg border ${
            defaultModule === module.slug ? 'border-blue-500 bg-blue-50' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <ModuleIcon slug={module.slug} />
            <div>
              <p className="font-medium">{module.name}</p>
              <p className="text-sm text-muted-foreground">{module.description}</p>
            </div>
          </div>
          <Switch
            checked={defaultModule === module.slug}
            onCheckedChange={() => setDefaultModule(module.slug)}
            disabled={!module.isAvailable}
          />
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## 10. Plano de Implementação

### 10.1 Fases

| Fase | Descrição | Tempo | Prioridade |
|------|-----------|-------|------------|
| 1 | Estrutura de prompts e módulo JEC | 2-3 dias | Alta |
| 2 | Backend (router, integração) | 1-2 dias | Alta |
| 3 | Frontend (selector, badge) | 2 dias | Alta |
| 4 | Testes e ajustes | 2 dias | Alta |
| **Total** | | **7-9 dias** | |

### 10.2 Tarefas Detalhadas

#### Fase 1: Estrutura de Prompts (2-3 dias)

- [ ] Criar pasta `server/prompts/modules/`
- [ ] Criar `types.ts` com interface Module
- [ ] Criar `index.ts` com registry
- [ ] Criar `default/prompt.ts`
- [ ] Criar `jec/prompt.ts` (prompt completo)
- [ ] Criar `jec/knowledge.ts` (enunciados FONAJE, FONAJEF, FOJESP)
- [ ] Testar prompt do JEC isoladamente

#### Fase 2: Backend (1-2 dias)

- [ ] Adicionar coluna `defaultModule` em `userSettings`
- [ ] Adicionar coluna `moduleSlug` em `conversations`
- [ ] Criar router `modulesRouter` (list, setDefault)
- [ ] Modificar `davidRouter` para usar `getModulePrompt()`
- [ ] Adicionar função `determineActiveModule()`
- [ ] Testar fluxo completo backend

#### Fase 3: Frontend (2 dias)

- [ ] Criar `ModuleSelector.tsx`
- [ ] Criar `ModuleBadge.tsx`
- [ ] Integrar selector no header do chat
- [ ] Adicionar seção de módulos em Configurações
- [ ] Persistir seleção de módulo por conversa

#### Fase 4: Testes e Ajustes (2 dias)

- [ ] Testar prompts do JEC com casos reais
- [ ] Ajustar linguagem e instruções baseado em feedback
- [ ] Verificar que enunciados são citados corretamente
- [ ] Testar troca de módulo durante conversa
- [ ] Testar persistência de configuração

### 10.3 Critérios de Sucesso

- [ ] Usuário consegue selecionar módulo JEC
- [ ] Badge mostra "JEC" quando ativo
- [ ] Respostas citam FONAJE ao invés de STJ
- [ ] Linguagem é mais acessível no modo JEC
- [ ] Configuração persiste entre sessões

---

## 11. Futuras Evoluções

### 11.1 Próximos Módulos

| Módulo | Knowledge Base | Prioridade |
|--------|---------------|------------|
| Família | Enunciados IBDFAM, Súmulas família | Média |
| Penal | Súmulas penais, tabela de penas | Média |
| Fazenda | FONAJEF, súmulas tributárias | Baixa |

### 11.2 Funcionalidades Futuras (Fase 2)

1. **Atualização Automática de Jurisprudência**
   - Job que busca decisões recentes das TRs
   - Armazena em banco para RAG
   - Separado por módulo

2. **Documentos do Usuário por Módulo**
   - Upload de minutas próprias
   - Vinculadas ao módulo específico
   - RAG customizado

3. **Analytics por Módulo**
   - Qual módulo mais usado
   - Quais enunciados mais citados
   - Feedback de qualidade

### 11.3 Manutenção

Para atualizar enunciados (quando FONAJE mudar):

1. Editar `server/prompts/modules/jec/knowledge.ts`
2. Commit e deploy
3. Pronto - zero downtime, zero migration

---

## Comparação V1 vs V2

| Aspecto | V1 | V2 |
|---------|----|----|
| Tabelas novas | 3 | 0 |
| Colunas novas | ~15 | 2 |
| Arquivos novos | ~20 | ~8 |
| Linhas de código | ~2000 | ~500 |
| Tempo implementação | 14-25 dias | 7-9 dias |
| Complexidade | Alta | Baixa |
| Performance | Lenta (RAG) | Rápida |
| Manutenção | Difícil | Fácil |

---

## Conclusão

A V2 entrega **90% do valor com 20% da complexidade**.

O conhecimento especializado (FONAJE, regras JEC) vai **direto no prompt**, eliminando:
- Busca de embeddings
- Injeção dinâmica de contexto
- Tabelas complexas
- Overhead de tokens

O usuário tem uma forma **simples e direta** de ativar o módulo:
- Dropdown no chat (troca rápida)
- Configuração padrão (persistente)

E a manutenção é trivial:
- Editar arquivo → Deploy → Pronto

---

**Próximo passo**: Começar pela Fase 1 - criar os arquivos de prompt do módulo JEC.
