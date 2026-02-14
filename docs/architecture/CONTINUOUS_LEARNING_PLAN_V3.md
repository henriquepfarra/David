# 🧠 Plano de Aprendizado Contínuo v3.0

**Data:** 28/01/2026
**Última atualização:** 13/02/2026
**Status:** ✅ Completo (Backend + Frontend)
**Prioridade:** ✅ CONCLUÍDO

---

## 📊 Estado Atual (Auditoria)

### ✅ Backend Pronto (95%)

| Componente | Status | Arquivo |
|------------|--------|---------|
| ThesisLearningService | ✅ Completo | `services/ThesisLearningService.ts` |
| Extração Dual (Tese + Estilo) | ✅ Completo | `thesisExtractor.ts` |
| Embeddings Duais | ✅ Completo | Integrado no ThesisLearningService |
| Quality Gate (PENDING→ACTIVE) | ✅ Completo | Schema + Service |
| RagService.searchLegalTheses() | ✅ Completo | `services/RagService.ts:201` |
| RagService.searchWritingStyle() | ✅ Completo | `services/RagService.ts:255` |
| Schema (learnedTheses) | ✅ Completo | `drizzle/schema.ts:287` |
| Schema (approvedDrafts) | ✅ Completo | `drizzle/schema.ts:265` |

### ✅ Implementado (Fev/2026)

| Componente | Status | Detalhes |
|------------|--------|---------|
| **ContextBuilder / PromptBuilder** | ✅ Concluído | Injeção de teses e estilo no prompt via `PromptBuilder.ts` |
| **Comando /tese** | ✅ Concluído | Handler com subcomandos em `tese.handler.ts` |
| **Badge de Pendentes** | ✅ Concluído | Sidebar com contador via `getPendingCount` |
| **Integração Motor B** | ✅ Concluído | Estilo injetado no /minutar |
| **Auto-trigger extração** | ✅ Concluído | Extração automática na aprovação de minuta |
| **Threshold RAG** | ✅ Concluído | Padronizado para 0.5 |

### ✅ Concluido (Frontend — Fev/2026)

| Componente | Status | Descricao |
|------------|--------|-----------|
| **UI Revisao de Teses** | ✅ Concluido | Pagina `/intelligence` unificada com 3 tabs (Caixa de Entrada, Teses Ativas, Minutas Aprovadas) |
| **CRUD Teses Ativas** | ✅ Concluido | Editar/deletar teses na tab "Teses Ativas" (`KnowledgeLibrary.tsx`) |
| **Minutas Aprovadas** | ✅ Concluido | Listar/visualizar/deletar minutas na tab "Minutas Aprovadas" (`ApprovedDrafts.tsx`) |
| **Pagina MemoriaDavid** | ✅ Removida | Funcionalidade consolidada em Intelligence |

### ✅ Concluido (Curadoria — Fev/2026)

| Componente | Status | Descricao |
|------------|--------|-----------|
| **Rastreamento de Uso** | ✅ Concluido | `useCount` + `lastUsedAt` em learnedTheses, tracking fire-and-forget |
| **Deduplicacao** | ✅ Concluido | `findSimilarTheses()`, dialog Substituir/Mesclar/Manter, `approveWithResolution` |
| **Curadoria Assistida** | ✅ Concluido | `getCurationSuggestions`, `findThesisClusters` (Union-Find), `CurationSuggestions.tsx` |
| **Cleanup Conversas** | ✅ Concluido | `cleanupAbandonedConversations()` + setInterval 24h |

---

## 🎯 Arquitetura do Aprendizado Contínuo

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    CICLO DE APRENDIZADO CONTINUO + CURADORIA                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│   │  1. GERACAO  │───▶│  2. REVISAO  │───▶│  3. ATIVACAO │                   │
│   │  /minutar    │    │  PENDING     │    │  ACTIVE      │                   │
│   │  gera minuta │    │  REVIEW      │    │  no RAG      │                   │
│   └──────────────┘    └──────┬───────┘    └──────┬───────┘                   │
│          │                   │                   │                           │
│          ▼                   ▼                   ▼                           │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│   │  4. FEEDBACK │    │  5. EXTRACAO │    │  6. INJECAO  │                   │
│   │  Aprovar/    │    │  LLM extrai  │    │  Context     │                   │
│   │  Editar      │    │  Tese+Estilo │    │  Builder     │                   │
│   └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│          │                                       │                           │
│          └───────────────────────────────────────┘                           │
│                              │                                               │
│                              ▼                                               │
│                    ┌──────────────────┐                                      │
│                    │  PROXIMA MINUTA  │                                      │
│                    │  USA TESES       │                                      │
│                    │  APRENDIDAS      │                                      │
│                    └──────────────────┘                                      │
│                                                                               │
│   ┌───────────────────── CURADORIA ─────────────────────┐                    │
│   │                                                      │                   │
│   │  [Na aprovacao]       [No uso]        [Periodico]    │                   │
│   │  Deduplicacao ──────▶ Tracking ─────▶ Sugestoes      │                   │
│   │  similarity>0.85      useCount++      - nao usadas   │                   │
│   │  Substituir/          lastUsedAt      - clusters     │                   │
│   │  Mesclar/Manter                       - Union-Find   │                   │
│   │                                                      │                   │
│   └──────────────────────────────────────────────────────┘                    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Plano de Implementação

### FASE 1: Integração ContextBuilder (CRÍTICA)

**Objetivo:** Fazer o David usar teses aprendidas nas respostas.

**Tempo:** 2-3 horas

#### 1.1 Novo método: `injectLearnedTheses()`

```typescript
// server/services/ContextBuilder.ts

/**
 * Injeta teses jurídicas aprendidas do gabinete (Motor C - Argumentação)
 */
async injectLearnedTheses(userId: number, query: string): Promise<this> {
    const ragService = getRagService();
    const theses = await ragService.searchLegalTheses(query, userId, {
        limit: 3,
        threshold: 0.5
    });

    if (theses.length === 0) return this;

    const thesesContext = `
## 📚 TESES DO GABINETE (Memória do Juiz Titular)

**INSTRUÇÃO CRÍTICA:** As teses abaixo foram firmadas pelo juiz titular em casos anteriores.
Elas têm PRIORIDADE ABSOLUTA sobre jurisprudência externa genérica.

${theses.map((t, i) => `
### Tese ${i + 1} (Similaridade: ${(t.similarity * 100).toFixed(0)}%)
**Ratio Decidendi:** ${t.legalThesis}
**Fundamentos:** ${t.legalFoundations || 'N/A'}
**Palavras-chave:** ${t.keywords || 'N/A'}
`).join('\n')}

**CENÁRIO A - Memória Encontrada:** Aplique estas teses. Elas representam o entendimento consolidado do gabinete.
`;

    this.addSection('LEARNED_THESES', thesesContext);
    console.log(`[ContextBuilder] Injetadas ${theses.length} teses do gabinete`);
    return this;
}
```

#### 1.2 Novo método: `injectWritingStyle()`

```typescript
/**
 * Injeta amostras de estilo do gabinete (Motor B - Redação)
 */
async injectWritingStyle(userId: number, query: string): Promise<this> {
    const ragService = getRagService();
    const styles = await ragService.searchWritingStyle(query, userId, {
        limit: 2,
        threshold: 0.5
    });

    if (styles.length === 0) return this;

    const styleContext = `
## ✍️ PADRÃO DE REDAÇÃO DO GABINETE

**INSTRUÇÃO:** Replique o estilo de escrita abaixo. É assim que o juiz titular escreve.

${styles.map((s, i) => `
### Amostra ${i + 1}
${s.writingStyleSample}

**Características:**
- Formalidade: ${s.writingCharacteristics?.formality || 'formal'}
- Estrutura: ${s.writingCharacteristics?.structure || 'clássica'}
- Tom: ${s.writingCharacteristics?.tone || 'técnico'}
`).join('\n')}

**REGRA DE OURO:** Escreva EXATAMENTE como as amostras acima. Não invente novo estilo.
`;

    this.addSection('WRITING_STYLE', styleContext);
    console.log(`[ContextBuilder] Injetadas ${styles.length} amostras de estilo`);
    return this;
}
```

#### 1.3 Integrar no `createBuilderForIntent()`

```typescript
// server/services/index.ts ou onde o builder é criado

export async function createBuilderForIntent(
    intent: IntentResult,
    userId: number,
    query: string,
    processContext?: ProcessContext
): Promise<ContextBuilder> {
    const builder = new ContextBuilder();

    // ... configuração existente ...

    // ✨ NOVO: Injetar aprendizado se Motor B ou C ativos
    if (intent.motors.includes('C')) {
        await builder.injectLearnedTheses(userId, query);
    }

    if (intent.motors.includes('B')) {
        await builder.injectWritingStyle(userId, query);
    }

    return builder;
}
```

---

### FASE 2: UI de Revisão de Teses (ALTA PRIORIDADE)

**Objetivo:** Interface para aprovar/rejeitar teses pendentes.

**Tempo:** 4-6 horas

#### 2.1 Estrutura de Componentes

```
client/src/pages/Intelligence/
├── index.tsx                    # Página principal (já existe)
├── PendingTheses.tsx            # 🆕 Lista de teses pendentes
├── ThesisReviewDialog.tsx       # 🆕 Modal de revisão
├── ThesisCard.tsx               # 🆕 Card de tese individual
└── StatsWidget.tsx              # Estatísticas (já existe)
```

#### 2.2 PendingTheses.tsx

```typescript
interface PendingThesis {
    id: number;
    legalThesis: string;
    writingStyleSample: string;
    legalFoundations: string;
    keywords: string;
    createdAt: Date;
    // Dados do draft original
    draftType: 'sentenca' | 'decisao' | 'despacho';
    processNumber?: string;
}

// Features:
// - Lista de cards com preview da tese
// - Botões: Aprovar (✓), Editar (✎), Rejeitar (✗)
// - Filtro por tipo de peça
// - Ordenação por data
```

#### 2.3 ThesisReviewDialog.tsx

```typescript
// Modal com:
// - Visualização completa da tese
// - Campos editáveis para legalThesis e writingStyleSample
// - Preview da minuta original (expandível)
// - Botão "Aprovar" / "Aprovar com Edições" / "Rejeitar"
// - Campo de motivo (se rejeitar)
```

#### 2.4 Endpoints tRPC Necessários

```typescript
// server/routers/thesisRouter.ts (NOVO)

getPendingTheses: protectedProcedure
    .query(async ({ ctx }) => {
        // Buscar teses com status = PENDING_REVIEW do usuário
    }),

approveThesis: protectedProcedure
    .input(z.object({ thesisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
        // Chamar ThesisLearningService.approveThesis()
    }),

rejectThesis: protectedProcedure
    .input(z.object({
        thesisId: z.number(),
        reason: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
        // Chamar ThesisLearningService.rejectThesis()
    }),

editAndApprove: protectedProcedure
    .input(z.object({
        thesisId: z.number(),
        legalThesis: z.string().optional(),
        writingStyle: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
        // Chamar ThesisLearningService.editAndApproveThesis()
    }),
```

---

### FASE 3: Badge de Pendentes na Sidebar

**Objetivo:** Mostrar contador de teses aguardando revisão.

**Tempo:** 1-2 horas

#### 3.1 Modificar DashboardLayout.tsx

```typescript
// Adicionar query para contar pendentes
const { data: pendingCount } = trpc.thesis.getPendingCount.useQuery();

// No item da sidebar "Memória/Intelligence":
<SidebarItem
    icon={Brain}
    label="Intelligence"
    badge={pendingCount > 0 ? pendingCount : undefined}
    badgeColor="yellow"
/>
```

#### 3.2 Endpoint de Contagem

```typescript
getPendingCount: protectedProcedure
    .query(async ({ ctx }) => {
        const db = await getDb();
        const result = await db.select({ count: sql`COUNT(*)` })
            .from(learnedTheses)
            .where(and(
                eq(learnedTheses.userId, ctx.user.id),
                eq(learnedTheses.status, "PENDING_REVIEW")
            ));
        return result[0]?.count ?? 0;
    }),
```

---

### FASE 4: Comando /tese (MÉDIA PRIORIDADE)

**Objetivo:** Gerenciar teses via chat.

**Tempo:** 3-4 horas

#### 4.1 Registrar Comando

```typescript
// server/commands/handlers/tese.handler.ts

registerCommand('/tese', {
    name: 'Gerenciar Teses',
    description: 'Listar, buscar e gerenciar teses aprendidas',
    usage: '/tese [list|search|obsolete] [args]',
    modules: ['*'],
    handler: handleTeseCommand,
});
```

#### 4.2 Subcomandos

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `/tese` | Lista todas teses ativas | `/tese` |
| `/tese list` | Lista com paginação | `/tese list 2` (página 2) |
| `/tese search <query>` | Busca semântica | `/tese search dano moral` |
| `/tese show <id>` | Mostra tese específica | `/tese show 15` |
| `/tese obsolete <id>` | Marca como obsoleta | `/tese obsolete 15` |
| `/tese pending` | Lista pendentes | `/tese pending` |

#### 4.3 Output Formatado

```markdown
## 📚 Suas Teses Aprendidas (5 ativas)

### Tese #15 - Dano Moral Presumido
**Status:** ✅ ATIVA
**Criada em:** 25/01/2026
**Fundamentos:** Súmula 54/STJ, Art. 186 CC
**Palavras-chave:** dano moral, inscrição indevida, negativação

---

### Tese #12 - Inversão do Ônus da Prova
...
```

---

### FASE 5: Trigger Automático no /minutar

**Objetivo:** Ao aprovar minuta do /minutar, extrair tese automaticamente.

**Tempo:** 2-3 horas

#### 5.1 Modificar minutar.handler.ts

```typescript
// Após gerar minuta, adicionar metadata para o frontend
return {
    content: draftContent,
    metadata: {
        isDraft: true,
        draftType: 'sentenca',
        canApprove: true, // Sinaliza que pode aprovar
    }
};
```

#### 5.2 Frontend: Detectar Minuta e Mostrar Botões

```typescript
// No MessageBubble.tsx ou similar
if (message.metadata?.canApprove) {
    return (
        <DraftApprovalButtons
            messageId={message.id}
            onApprove={handleApprove}
            onEdit={handleEdit}
        />
    );
}
```

#### 5.3 Fluxo de Aprovação

```
[Usuário clica "Aprovar"]
    │
    ▼
[Frontend chama trpc.david.approveDraft()]
    │
    ▼
[Backend salva em approvedDrafts]
    │
    ▼
[Background: ThesisLearningService.processApprovedDraft()]
    │
    ├──▶ [Extrai tese + estilo via LLM]
    ├──▶ [Gera embeddings duais]
    └──▶ [Salva com status PENDING_REVIEW]
    │
    ▼
[Toast: "Minuta aprovada! Tese extraída e aguardando revisão."]
```

---

### FASE 6: Curadoria Inteligente de Teses

**Objetivo:** Manter qualidade da base de teses conforme cresce — sem arquivar por idade (tese antiga pode ser valida).

**Status:** ✅ Completo (Fev/2026)

#### 6.1 Schema — Rastreamento de Uso

Dois campos adicionados na tabela `learnedTheses`:

```sql
useCount    INT DEFAULT 0 NOT NULL    -- Quantas vezes o RAG retornou esta tese
lastUsedAt  TIMESTAMP NULL            -- Ultima vez que o RAG retornou esta tese
```

**Arquivo:** `drizzle/schema.ts:325-327`

#### 6.2 Rastreamento Automatico (Fire-and-Forget)

Quando `searchLegalTheses()` ou `searchWritingStyle()` retornam teses como resultado, o `RagService` incrementa `useCount` e atualiza `lastUsedAt` de forma assincrona (nao bloqueia a resposta ao usuario).

```
[Usuario envia mensagem]
    |
    v
[RagService.searchLegalTheses()] -- retorna 3 teses
    |
    |-- [resposta ao usuario] (sincrono)
    |
    |-- [trackThesisUsage([id1, id2, id3])] (fire-and-forget)
            |
            v
        UPDATE learnedTheses
        SET useCount = useCount + 1, lastUsedAt = NOW()
        WHERE id IN (id1, id2, id3)
```

**Arquivo:** `server/services/RagService.ts` — metodo privado `trackThesisUsage()`

#### 6.3 Deduplicacao na Aprovacao

Ao aprovar uma tese pendente, o sistema verifica automaticamente se ja existe tese ativa com conteudo similar (cosine similarity >= 0.85). Se encontrar, mostra dialog ao usuario.

```
[Usuario clica "Aprovar" em tese pendente]
    |
    v
[Frontend chama trpc.thesis.checkSimilarTheses({ thesisId })]
    |
    v
[Backend: RagService.findSimilarTheses(embedding, userId, { threshold: 0.85 })]
    |
    |-- Nenhuma similar → Aprova direto (approveThesis)
    |
    |-- Similar encontrada → Retorna matches ao frontend
            |
            v
        [SimilarThesisDialog mostra opcoes:]
            |
            |-- "Substituir" → replace: marca antiga como obsoleta, aprova nova
            |-- "Mesclar"    → merge: combina fundamentos + keywords, marca antiga como obsoleta
            |-- "Manter"     → keep_both: aprova nova sem alterar existente
            |
            v
        [trpc.thesis.approveWithResolution({ thesisId, resolution, replaceThesisId })]
```

**Endpoints:**
- `thesisRouter.checkSimilarTheses` — query que retorna teses similares com % de similaridade
- `thesisRouter.approveWithResolution` — mutation com 3 acoes (replace/merge/keep_both)

**Frontend:**
- `Intelligence/components/SimilarThesisDialog.tsx` — dialog com cards e botoes de acao
- `Intelligence/PendingTheses.tsx` — fluxo de aprovacao modificado

**Backend:**
- `RagService.findSimilarTheses(embedding, userId, { threshold, excludeId })` — busca cosine similarity

#### 6.4 Curadoria Assistida

Painel de sugestoes na tab "Teses Ativas" que identifica problemas na base de teses:

**Tipo 1: Teses nunca resgatadas**
- Criterio: `useCount = 0` E `createdAt < 30 dias atras`
- Significado: O RAG nunca retornou esta tese em nenhuma resposta
- Causas possiveis: tese muito especifica, mal formulada, ou palavras-chave inadequadas
- Acao sugerida: revisar ou remover

**Tipo 2: Clusters de teses similares**
- Criterio: Pares de teses com cosine similarity > 0.80
- Algoritmo: Union-Find para agrupar teses transitivamente similares
- Complexidade: O(n²) — aceitavel para < 1000 teses por usuario
- Acao sugerida: mesclar ou remover duplicatas

```
[trpc.thesis.getCurationSuggestions]
    |
    |-- Query: teses com useCount=0 e createdAt < 30d
    |       -> unusedTheses[]
    |
    |-- RagService.findThesisClusters(userId, { threshold: 0.80 })
    |       -> Carrega todas teses ativas com embedding
    |       -> Pairwise cosine similarity
    |       -> Union-Find para agrupar
    |       -> clusters[]
    |
    v
[CurationSuggestions.tsx]
    |-- Card colapsavel com badge de contagem
    |-- Secao "Teses nunca resgatadas" com dias desde criacao
    |-- Secao "Teses com conteudo similar" com % de similaridade
    |-- Botao deletar em cada tese (com AlertDialog de confirmacao)
    |-- Auto-esconde quando 0 sugestoes
    |-- Cache de 5 min (staleTime) no React Query
```

**Endpoint:** `thesisRouter.getCurationSuggestions`
**Backend:** `RagService.findThesisClusters(userId, { threshold })`
**Frontend:** `Intelligence/components/CurationSuggestions.tsx` (integrado no `KnowledgeLibrary.tsx`)

#### 6.5 Performance e Limites

| Operacao | Complexidade | Limite Seguro |
|----------|-------------|---------------|
| findSimilarTheses | O(n) | < 1000 teses/usuario |
| findThesisClusters | O(n²) | < 1000 teses/usuario |
| trackThesisUsage | O(1) UPDATE | Sem limite |
| getCurationSuggestions | O(n²) | Cache 5 min mitiga |

Para escalar alem de 1000 teses por usuario, migrar para pgvector com indice HNSW.
Ver [PLANO_MIGRACAO_INFRA.md](./PLANO_MIGRACAO_INFRA.md) para detalhes.

---

### Manutencao: Cleanup de Conversas Abandonadas

Funcao `cleanupAbandonedConversations()` remove conversas sem mensagens com mais de 7 dias de todos os usuarios.

```
[Server startup] → cleanupAbandonedConversations() (execucao imediata)
                  + setInterval(24h) → cleanupAbandonedConversations()
```

**Criterio:** conversa com `createdAt < 7 dias atras` E zero mensagens associadas.
**Arquivo:** `server/db.ts` — funcao `cleanupAbandonedConversations()`
**Agendamento:** `server/_core/index.ts` — startup + setInterval 24h

---

## 📊 Métricas de Sucesso

| Métrica | Meta | Como Medir |
|---------|------|------------|
| Taxa de Aprovação | 50%+ minutas aprovadas | `approvedDrafts.count / messages.drafts.count` |
| Precisão Extração | 80%+ teses corretas | Taxa de ACTIVE vs REJECTED |
| Reuso de Teses | 30%+ minutas usam teses | Logs do ContextBuilder |
| Latência Extração | < 5 segundos | Timer no ThesisLearningService |
| UI Responsiva | < 200ms interações | Performance monitoring |

---

## 🗓️ Cronograma Sugerido

| Fase | Prioridade | Tempo | Dependências |
|------|------------|-------|--------------|
| **1. ContextBuilder** | 🔴 CRÍTICA | 2-3h | Nenhuma |
| **2. UI Revisão** | 🔴 ALTA | 4-6h | Fase 1 |
| **3. Badge Sidebar** | 🟡 MÉDIA | 1-2h | Fase 2 |
| **4. Comando /tese** | 🟡 MÉDIA | 3-4h | Fase 1 |
| **5. Trigger /minutar** | 🔴 ALTA | 2-3h | Fase 2 |

**Total estimado:** 12-18 horas

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| LLM extrai tese incorreta | Alto | Quality Gate obriga revisão humana |
| Embedding falha | Médio | Fallback: salva sem embedding, busca por keywords |
| Usuário não revisa teses | Alto | Badge + notificação + onboarding |
| Muitas teses obsoletas | Baixo | Comando `/tese obsolete` + UI de gerenciamento |

---

## 🔗 Arquivos Relevantes

### Backend — Aprendizado
- `server/services/ThesisLearningService.ts` - Orquestracao: extrair, aprovar, rejeitar, editar teses
- `server/services/RagService.ts` - Busca semantica + deduplicacao + clusters + tracking de uso
- `server/routers/thesisRouter.ts` - 15 endpoints TRPC para teses e minutas
- `server/thesisExtractor.ts` - Extracao de tese dual via LLM
- `drizzle/schema.ts` - Tabelas learnedTheses (com useCount/lastUsedAt), approvedDrafts

### Backend — Contexto e Injecao
- `server/services/ContextBuilder.ts` - Builder de contexto
- `server/PromptBuilder.ts` - Injecao de teses e estilo no prompt (linhas 130-170)

### Backend — Manutencao
- `server/db.ts` - cleanupAbandonedConversations()
- `server/_core/index.ts` - Agendamento de cleanup (startup + 24h)

### Frontend — Intelligence
- `client/src/pages/Intelligence/PendingTheses.tsx` - Caixa de entrada com fluxo de deduplicacao
- `client/src/pages/Intelligence/KnowledgeLibrary.tsx` - Teses ativas + curadoria
- `client/src/pages/Intelligence/ApprovedDrafts.tsx` - Minutas aprovadas
- `client/src/pages/Intelligence/components/ThesisCard.tsx` - Card de tese pendente
- `client/src/pages/Intelligence/components/SimilarThesisDialog.tsx` - Dialog de conflito
- `client/src/pages/Intelligence/components/CurationSuggestions.tsx` - Painel de curadoria
- `client/src/pages/Intelligence/components/StatsWidget.tsx` - Metricas

### Frontend — Sidebar
- `client/src/components/MemoriaJuridicaMenuItem.tsx` - Badge com contador de pendentes

### Comandos
- `server/commands/handlers/tese.handler.ts` - Comando /tese com subcomandos

---

## 📝 Checklist de Implementação

### Fase 1 - ContextBuilder ✅
- [x] Implementar `injectLearnedTheses()` → Inline em `PromptBuilder.ts:130-170`
- [x] Implementar `injectWritingStyle()` → Inline em `PromptBuilder.ts:150-165`
- [x] Integrar em `createBuilderForIntent()` → `buildContexts()`
- [x] Testar com tese real → thesisRouter.test.ts

### Fase 2 - UI Revisão ✅
- [x] Criar `PendingTheses.tsx`
- [x] Criar `ThesisReviewDialog.tsx` → Integrado em `ThesisCard.tsx`
- [x] Criar `ThesisCard.tsx`
- [x] Criar endpoints tRPC (getPending, approve, reject, edit)
- [x] Testar fluxo completo

### Fase 3 - Badge ✅
- [x] Endpoint `getPendingCount`
- [x] Badge no sidebar item → `MemoriaJuridicaMenuItem.tsx`

### Fase 4 - Comando /tese ✅
- [x] Handler com subcomandos → `tese.handler.ts`
- [x] Output formatado
- [x] Registrar no registry

### Fase 5 - Trigger /minutar ✅
- [x] Metadata `canApprove` no response
- [x] Botões de aprovação no frontend → `David.tsx:483-525`
- [x] Endpoint `approveDraft` → `approvedDraftsRouter`
- [x] Toast de confirmação

### Fase 6 - Curadoria Inteligente ✅
- [x] Adicionar `useCount` + `lastUsedAt` no schema (`drizzle/schema.ts`)
- [x] Tracking automatico no RagService (`trackThesisUsage`)
- [x] `findSimilarTheses()` no RagService (deduplicacao)
- [x] `checkSimilarTheses` endpoint no thesisRouter
- [x] `approveWithResolution` endpoint (replace/merge/keep_both)
- [x] `SimilarThesisDialog.tsx` (frontend de conflito)
- [x] Fluxo de aprovacao com verificacao automatica (`PendingTheses.tsx`)
- [x] `findThesisClusters()` no RagService (Union-Find)
- [x] `getCurationSuggestions` endpoint (unused + clusters)
- [x] `CurationSuggestions.tsx` (painel no KnowledgeLibrary)

### Manutencao ✅
- [x] `cleanupAbandonedConversations()` em `server/db.ts`
- [x] Agendamento no startup + setInterval 24h (`server/_core/index.ts`)

---

**Ultima atualizacao:** 13/02/2026
**Status:** ✅ Completo — Aprendizado + Curadoria + Manutencao

