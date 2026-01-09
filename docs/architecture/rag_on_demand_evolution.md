# Evolução da Especificação: RAG On Demand

---

## Parte 1: Plano Original (v3.0)

### Objetivo
Alterar o David para reduzir custos/latência, eliminando pesquisas desnecessárias.

### Regra de Ouro Original
> *"O David presume que sabe. Só consulta o Banco se pedir fonte."*

### 5 Cenários Originais

| Cenário | RAG | Descrição |
|---------|-----|-----------|
| A: Conceitual | OFF | Definições, prazos, "Lei Seca" |
| B: Jurisprudência | STF/STJ | Entendimento de tribunais |
| C: Fonte Específica | Filtrado | FONAJE, Súmulas, etc. |
| D: Padrão Usuário | USER | Decisões anteriores do gabinete |
| E: Minuta | TODOS | Peça final completa |

### Critério Original
- 100% precisão em falsos positivos
- < 500ms classificação

---

## Parte 2: Análise Crítica

### ✅ Concordâncias
1. Inversão de paradigma ("busca sob demanda") - Excelente
2. 5 Cenários base cobrem maioria dos casos
3. Testes "The Gauntlet" para falsos positivos - Crítico

### 🟡 Discordâncias e Sugestões

#### 1. Falta Cenário de Refinamento
**Problema:** Não havia cenário para "melhore", "reformule", "ajuste".

**Sugestão:** Adicionar Cenário F para edições que não precisam de RAG.

#### 2. Relação com Motores não documentada
**Problema:** O documento focava só em RAG, ignorando quais Motores (A/B/C/D) usar.

**Sugestão:** Adicionar coluna "Motores" na matriz de decisão.

#### 3. Regra para processId ausente
**Problema:** Não estava claro se o processo vinculado é injetado em buscas.

**Sugestão:** Regra: Se processId presente, sempre injetar resumo para contexto.

#### 4. Critério 100% é impossível
**Problema:** 100% precisão em NLP é irreal.

**Sugestão:** Ajustar para ≥95% com fallback conservador.

---

## Parte 3: Versão Final (v4.0)

### 6 Cenários (+ Refinamento)

| Cenário | RAG | Motores | Gatilhos |
|---------|-----|---------|----------|
| A: Conceitual | OFF | A | "o que é", "prazo" |
| B: Jurisprudência | STF/STJ | A | "STJ", "precedente" |
| C: Fonte Específica | Filtrado | A | "súmula", "FONAJE" |
| D: Padrão Usuário | USER | A | "como eu decido" |
| E: Minuta | TODOS | A+B+C+D | "faça", "elabore" |
| **F: Refinamento** | **OFF** | **C** | "melhore", "reformule" |

### Regra de Processo Vinculado
> Se `processId` presente → injetar resumo do processo em cenários B, C, D, E.

### Critério Atualizado
- Precisão ≥ **95%** (não 100%)
- Classificação < 500ms
- Fallback: na dúvida → SEARCH

---

## Resumo das Alterações v3.0 → v4.0

| Item | v3.0 | v4.0 |
|------|------|------|
| Cenários | 5 | **6** (+Refinamento) |
| Motores | Não documentado | **Documentado** |
| ProcessId | Não mencionado | **Regra explícita** |
| Critério precisão | 100% | **≥95%** |
| Fallback | Não definido | **Conservador** |
