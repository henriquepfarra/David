# Plano de Implementação: Base de Conhecimento Inteligente (RAG)

## 1. Resumo Executivo

### Objetivo
Implementar sistema de **busca híbrida** (exata + semântica) que permite ao assistente jurídico DAVID consultar **675+ Súmulas do STJ**, Enunciados FONAJE/FOJESP e precedentes do gabinete de forma eficiente, sem sobrecarregar o contexto da IA.

### Problema a Resolver
O DAVID precisa conhecer jurisprudência consolidada. Porém, carregar todas as 675 Súmulas no contexto consumiria ~70.000 tokens, inviabilizando a operação. A solução é buscar apenas os documentos relevantes para cada consulta.

### Solução
**Busca Híbrida Inteligente:**
- Quando o usuário menciona número específico ("Súmula 54") → Busca exata (SQL)
- Quando menciona conceito ("juros moratórios") → Busca semântica (Embeddings)

### Prazo Estimado
**3-4 dias úteis**

---

## 2. Arquitetura da Solução

### 2.1 Fluxo dos Motores

```
MOTOR A (Detetive)
    │ Extrai fatos do caso
    ▼
MOTOR B (Guardião) ◄──── RAG busca em learnedTheses
    │ "Tem precedente do gabinete?"
    │
    ├── SIM → Aplica precedente interno
    │
    └── NÃO ↓
            ▼
MOTOR C (Jurista) ◄──── RAG busca em knowledgeBase
    │ "Qual Súmula/Lei aplicável?"
    ▼
MOTOR D (Advogado do Diabo)
    │ Valida a conclusão
    ▼
RESPOSTA FINAL
```

### 2.2 Distinção entre Fontes

| Motor | Fonte de Dados | Tabela no Banco | Quem Alimenta |
|-------|----------------|-----------------|---------------|
| **Motor B** | Precedentes do Gabinete | `learnedTheses` | Aprendizado via `/tese` |
| **Motor C** | Conhecimento Vinculante | `knowledgeBase` | Seed do Sistema |

### 2.3 Busca Híbrida

```
┌─────────────────────────────────────────────────────────────┐
│                    BUSCA HÍBRIDA                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Query: "Súmula 54 do STJ"                                   │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────┐                                         │
│  │ Detecta número? │ → Regex: /\b(\d+)\b/                    │
│  └────────┬────────┘                                         │
│           │                                                  │
│     SIM ──┴── NÃO                                            │
│      │         │                                             │
│      ▼         ▼                                             │
│  SQL LIKE   Cosine Similarity                                │
│  (exato)    (embeddings)                                     │
│      │         │                                             │
│      ▼         ▼                                             │
│  Súmula     Top 5 documentos                                 │
│    54       mais similares                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Fases de Implementação

### FASE 1: Função de Busca Híbrida
**Prazo:** 1 dia

**Arquivos a criar/modificar:**
- `server/_core/knowledgeSearch.ts` (NOVO)

**Funções a implementar:**
```typescript
// Detecta se query contém número específico
detectSearchType(query: string): 'exact' | 'semantic'

// Busca exata por número (SQL WHERE LIKE)
exactSearch(number: string, table: string): Document[]

// Busca semântica por similaridade (Cosine)
semanticSearch(query: string, table: string, limit: number): Document[]

// Combina as duas estratégias
hybridSearch(query: string, table: string, limit: number): Document[]
```

**Critérios de aceite:**
- [ ] Query "Súmula 54" retorna exatamente a Súmula 54
- [ ] Query "dano moral" retorna top 5 súmulas relacionadas
- [ ] Query "Súmula 385 negativação" usa busca exata primeiro

---

### FASE 2: Integração com Motor C
**Prazo:** 0.5 dia

**Arquivos a modificar:**
- `server/davidRouter.ts`

**O que fazer:**
1. Antes de chamar o Motor C, executar `hybridSearch` na `knowledgeBase`
2. Injetar top 5 documentos encontrados no contexto
3. Motor C já espera esses dados (não precisa alterar prompt)

**Critérios de aceite:**
- [ ] Motor C recebe Súmulas relevantes automaticamente
- [ ] Contexto total de conhecimento ≤ 1.000 tokens

---

### FASE 3: Popular Base com 675 Súmulas STJ
**Prazo:** 1 dia

**Arquivos a criar/modificar:**
- `server/data/system_knowledge.json`

**Conteúdo a popular:**
| Fonte | Quantidade | Prioridade |
|-------|------------|------------|
| Súmulas STJ | 675 | Alta |
| Enunciados FONAJE | ~180 | Alta |
| Enunciados FOJESP | ~50 | Média |
| Súmulas STF | ~60 relevantes | Média |

**Formato esperado:**
```json
{
  "id": "SUMULA_STJ_54",
  "titulo": "Súmula 54 do STJ",
  "conteudo": "Os juros moratórios fluem a partir do evento danoso...",
  "tipo": "sumula",
  "tags": ["juros", "mora", "dano", "responsabilidade civil"]
}
```

**Critérios de aceite:**
- [ ] Script `pnpm run seed:knowledge` executa sem erros
- [ ] Todas as 675 súmulas inseridas com embeddings
- [ ] Documentos marcados como `source = 'sistema'`

---

### FASE 4: Integração com Motor B
**Prazo:** 0.5 dia

**Arquivos a modificar:**
- `server/davidRouter.ts`

**O que fazer:**
1. Antes de chamar o Motor B, executar `hybridSearch` em `learnedTheses`
2. Injetar precedentes do gabinete encontrados
3. Motor B já espera esses dados (não precisa alterar prompt)

**Critérios de aceite:**
- [ ] Motor B recebe teses do gabinete automaticamente
- [ ] Busca filtra por `userId` do usuário logado

---

### FASE 5: Proteção na UI
**Prazo:** 0.5 dia

**Arquivos a modificar:**
- `client/src/pages/Configuracoes.tsx`

**O que fazer:**
1. Documentos com `source = 'sistema'` exibem badge "Sistema"
2. Botão de deletar oculto para documentos do sistema
3. Usuário pode adicionar próprios documentos normalmente

**Critérios de aceite:**
- [ ] Badge visual "Sistema" aparece
- [ ] Botão delete não aparece para seed
- [ ] Usuário consegue deletar próprios documentos

---

## 4. Infraestrutura Existente

| Componente | Status | Localização |
|------------|--------|-------------|
| `generateEmbedding()` | ✅ Pronto | `server/_core/embeddings.ts` |
| `cosineSimilarity()` | ✅ Pronto | `server/_core/embeddings.ts` |
| Campo `embedding` | ✅ No schema | `drizzle/schema.ts` |
| Campo `systemId` | ✅ No schema | `drizzle/schema.ts` |
| Campo `source` | ✅ No schema | `drizzle/schema.ts` |
| Script de seed | ✅ Funcionando | `scripts/seed-knowledge.ts` |

---

## 5. Cronograma Consolidado

| Dia | Fase | Entrega |
|-----|------|---------|
| 1 | Fase 1 | Função `hybridSearch` funcionando |
| 2 | Fase 2 + 3 | Motor C integrado + Súmulas populadas |
| 3 | Fase 4 + 5 | Motor B integrado + UI protegida |
| 4 | Buffer | Testes e ajustes |

**Total: 3-4 dias úteis**

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Busca vetorial imprecisa | Média | Alto | Busca híbrida (exata + semântica) |
| Custo de embeddings | Baixa | Baixo | ~$0.07 para 675 súmulas |
| Performance da busca | Baixa | Médio | Índice no campo `systemId` já existe |

---

## 7. Métricas de Sucesso

- [ ] Tempo de busca < 200ms
- [ ] Precisão da busca exata: 100%
- [ ] Precisão da busca semântica: > 80%
- [ ] Contexto de conhecimento < 1.000 tokens por consulta
