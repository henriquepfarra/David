# 🧠 Plano de Aprendizado Contínuo v3.0

**Data:** 28/01/2026
**Última atualização:** 13/02/2026
**Status:** ✅ Backend completo, Frontend UI de revisão pendente
**Prioridade:** 🟡 MÉDIA (falta apenas UI de revisão no frontend)

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

### ❌ Pendente (Frontend)

| Componente | Prioridade | Descrição |
|------------|------------|-----------|
| **UI Revisão de Teses** | ALTA | Frontend integrado para aprovar/rejeitar teses na página MemoriaDavid |

---

## 🎯 Arquitetura do Aprendizado Contínuo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CICLO DE APRENDIZADO CONTÍNUO                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │  1. GERAÇÃO  │───▶│  2. REVISÃO  │───▶│  3. ATIVAÇÃO │                  │
│   │              │    │              │    │              │                  │
│   │  /minutar    │    │  PENDING     │    │  ACTIVE      │                  │
│   │  gera minuta │    │  REVIEW      │    │  no RAG      │                  │
│   └──────────────┘    └──────────────┘    └──────────────┘                  │
│          │                   │                   │                          │
│          ▼                   ▼                   ▼                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│   │  4. FEEDBACK │    │  5. EXTRAÇÃO │    │  6. INJEÇÃO  │                  │
│   │              │    │              │    │              │                  │
│   │  Aprovar/    │    │  LLM extrai  │    │  Context     │                  │
│   │  Editar      │    │  Tese+Estilo │    │  Builder     │                  │
│   └──────────────┘    └──────────────┘    └──────────────┘                  │
│          │                   │                   │                          │
│          └───────────────────┴───────────────────┘                          │
│                              │                                               │
│                              ▼                                               │
│                    ┌──────────────────┐                                     │
│                    │   PRÓXIMA MINUTA │                                     │
│                    │   USA TESES      │                                     │
│                    │   APRENDIDAS     │                                     │
│                    └──────────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
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

### Backend
- `server/services/ThesisLearningService.ts` - Orquestração do aprendizado
- `server/services/RagService.ts` - Busca semântica de teses
- `server/services/ContextBuilder.ts` - Onde injetar teses
- `server/thesisExtractor.ts` - Extração via LLM
- `drizzle/schema.ts` - Tabelas learnedTheses, approvedDrafts

### Frontend
- `client/src/pages/Intelligence/` - Página de memória
- `client/src/components/DashboardLayout.tsx` - Sidebar com badge

### Comandos
- `server/commands/handlers/` - Handlers existentes
- `server/commands/registry.ts` - Registro de comandos

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

---

**Última atualização:** 13/02/2026
**Status:** ✅ Backend completo | ❌ UI de revisão de teses pendente (ver PENDENCIAS.md)

