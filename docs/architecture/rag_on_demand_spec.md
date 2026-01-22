# 📋 Especificação Funcional v4.0: Protocolo de "RAG Sob Demanda"

**Objetivo Estratégico:**
Alterar o comportamento do David para reduzir custos de API e latência, eliminando pesquisas desnecessárias. O sistema deve deixar de ser um "Buscador Padrão" para se tornar um "Especialista que Consulta Fontes".

**A Nova Regra de Ouro:**
> *"O David presume que sabe a resposta. Ele só consulta o Banco de Dados se o utilizador pedir explicitamente uma fonte, uma prova ou um precedente."*

---

## 1. Cenários de Intenção (IntentService)

O serviço de triagem deve identificar **6 Cenários de Intenção**.

### Cenário A: Dúvida Conceitual ou Processual
| Aspecto | Detalhe |
|---------|---------|
| **RAG** | 🔴 DESLIGADO |
| **Motores** | Só Motor A |
| **O que é** | Perguntas sobre definições, prazos legais, traduções, resumos |
| **Exemplos** | "Qual o prazo do agravo?", "O que é tutela de urgência?" |

### Cenário B: Jurisprudência Geral
| Aspecto | Detalhe |
|---------|---------|
| **RAG** | 🟢 LIGADO (Escopo: STF/STJ) |
| **Motores** | Motor A |
| **Gatilhos** | "Tribunal", "STJ", "Entendimento", "Jurisprudência", "Precedente" |
| **Comportamento** | Buscar apenas nas coleções `STF` e `STJ` |

### Cenário C: Fonte Específica / Módulos
| Aspecto | Detalhe |
|---------|---------|
| **RAG** | 🟢 LIGADO (Escopo: Específico) |
| **Motores** | Motor A |
| **Gatilhos** | "Súmula", "Enunciado", "FONAJE", "Tema Repetitivo", "Vinculante" |
| **Comportamento** | Filtro cirúrgico (ex: apenas `FONAJE`) |

### Cenário D: Padrão do Gabinete
| Aspecto | Detalhe |
|---------|---------|
| **RAG** | 🟢 LIGADO (Escopo: Usuário) |
| **Motores** | Motor A |
| **Gatilhos** | "Como **eu** decido?", "Meus precedentes" |
| **Comportamento** | Buscar apenas na coleção `USER_DATA` |

### Cenário E: Minuta Completa
| Aspecto | Detalhe |
|---------|---------|
| **RAG** | 🟢 LIGADO (Escopo: Total) |
| **Motores** | A + B + C + D (Todos) |
| **Gatilhos** | "Faça a sentença", "Minute o voto", "Elabore contestação" |
| **Comportamento** | Busca abrangente (Sistema + Usuário) |

### Cenário F: Refinamento *(NOVO)*
| Aspecto | Detalhe |
|---------|---------|
| **RAG** | 🔴 DESLIGADO |
| **Motores** | Motor C (Redação) |
| **O que é** | Edição/ajuste da última resposta |
| **Gatilhos** | "melhore", "reformule", "resuma", "ajuste", "mais formal" |
| **Comportamento** | Usar apenas histórico, sem nova busca |

---

## 2. Regra Especial: Processo Vinculado

> **Se `processId` estiver presente na conversa:**
> - Sempre injetar resumo do processo no contexto
> - Aplicável em cenários B, C, D, E
> - Permite ao David aplicar jurisprudência ao caso concreto

**Exemplo:** 
- Usuário com processo vinculado pergunta: "O que diz o STJ sobre prescrição?"
- David busca súmulas E aplica ao contexto do processo

---

## 3. Matriz de Decisão Completa

| Input | Cenário | RAG | Motores |
|:------|:--------|:----|:--------|
| "O que é agravo?" | A - Conceitual | OFF | A |
| "O que o STJ diz...?" | B - Jurisprudência | STF/STJ | A |
| "Tem enunciado do FONAJE?" | C - Módulo | FONAJE | A |
| "Como eu decido...?" | D - Padrão Usuário | USER | A |
| "Faça a sentença." | E - Minuta | TODOS | A+B+C+D |
| "Melhore esse parágrafo" | F - Refinamento | OFF | C |

---

## 4. Requisitos de Dados (Infraestrutura)

Garantir campos de metadados no Vector DB:
1. **`source`**: `system` ou `user`
2. **`category`**: `stf`, `stj`, `fonaje`, `familia`, `tese_interna`, etc.

---

## 5. Plano de Testes: Validação do IntentService

**Objetivo:** Garantir que a IA não "alucina" a necessidade de pesquisa.

### Bateria de Testes (The Gauntlet)

#### 🔴 Grupo 1: Falsos Positivos (RAG OFF)
| Input | Esperado |
|-------|----------|
| "Vou ao **tribunal** hoje à tarde." | `CASUAL` |
| "O **juiz** estava cansado." | `CASUAL` |
| "Qual o prazo do **recurso**?" | `CONCEPTUAL` |
| "Melhore o texto acima." | `REFINEMENT` |

#### 🟢 Grupo 2: Gatilho de Jurisprudência (STF/STJ)
| Input | Esperado |
|-------|----------|
| "O que o **STJ** decide sobre dano moral?" | `JURISPRUDENCE` |

#### 🔵 Grupo 3: Fontes Específicas
| Input | Esperado |
|-------|----------|
| "O que diz o **FONAJE**?" | `MODULE_SEARCH` (Filter: FONAJE) |

#### 🟣 Grupo 4: Minutas
| Input | Esperado |
|-------|----------|
| "Faça a contestação." | `DRAFT` |

### Ferramenta de Debug (DEV Mode)
Visualizar etiqueta no chat: `[CONCEPTUAL | RAG: OFF | Motors: A]`

### Critério de Aprovação
1. Precisão ≥ **95%** no Grupo 1 (Falsos Positivos)
2. Classificação < **500ms**
3. Fallback conservador: na dúvida, classificar como `SEARCH`
