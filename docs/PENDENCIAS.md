# Pendencias - David

**Ultima atualizacao:** 2026-02-13
**Score Geral:** 9/10 - Pronto para beta

---

## Mapa de Execucao

### Fase 1 — Funcionalidade que falta (bloqueia ciclo de aprendizado)

| # | Item | Esforco | Impacto |
|---|------|---------|---------|
| ~~1~~ | ~~UI de Revisao de Teses~~ | ~~Medio~~ | ~~Alto~~ ✅ Concluido |
| ~~3~~ | ~~Modulos Incompletos~~ | ~~Baixo~~ | ~~Medio~~ ✅ Ja estao cinza com "Em breve" no UI |

### Fase 2 — Polish para usuarios reais

| # | Item | Esforco | Impacto |
|---|------|---------|---------|
| ~~10~~ | ~~Empty States~~ | ~~Baixo~~ | ~~Medio~~ ✅ Concluido |
| ~~11~~ | ~~Loading States~~ | ~~Baixo~~ | ~~Medio~~ ✅ Concluido (skeletons) |
| ~~12~~ | ~~Responsividade Mobile~~ | ~~Medio~~ | ~~Medio~~ Adiado (usuarios usam desktop) |

### Fase 3 — Saude operacional

| # | Item | Esforco | Impacto |
|---|------|---------|---------|
| ~~6~~ | ~~Cleanup de Conversas~~ | ~~Baixo~~ | ~~Medio~~ ✅ Concluido |
| ~~5~~ | ~~Curadoria Inteligente de Teses~~ | ~~Medio~~ | ~~Alto~~ ✅ Concluido (5A+5B+5C) |
| 4 | Refatorar davidRouter.ts | Alto | Medio - manutenibilidade |

### Fase 4 — Infraestrutura (quando escalar)

| # | Item | Esforco | Impacto |
|---|------|---------|---------|
| 7 | Structured Logging | Medio | Baixo - debugging em producao |
| 8 | Cobertura de Testes | Alto | Medio - confianca em deploys |
| 9 | Cache Invalidation | Baixo | Baixo - edge case |
| 2 | Handler Analise Peticoes | Medio | Baixo - feature nova |
| M1 | Migracao Railway → Fly.io + Supabase | Alto | Alto - quando atingir ponto de inflexao |

**Plano detalhado:** [PLANO_MIGRACAO_INFRA.md](./architecture/PLANO_MIGRACAO_INFRA.md)

---

## Funcionalidade

### 1. ~~UI de Revisao de Teses~~ ✅ CONCLUIDO (13/02/2026)

Pagina unificada `/intelligence` com 3 abas:
- **Caixa de Entrada** — Aprovar/editar/rejeitar teses pendentes (`PendingTheses.tsx`)
- **Teses Ativas** — Listar, editar, deletar teses ativas (`KnowledgeLibrary.tsx`)
- **Minutas Aprovadas** — Listar, visualizar, deletar minutas (`ApprovedDrafts.tsx`)

**Endpoints no `thesisRouter.ts`:** getPendingCount, getPendingTheses, approveThesis, editThesis, rejectThesis, getActiveTheses, updateActiveThesis, deleteThesis, listApprovedDrafts, deleteApprovedDraft, getThesisStats, getThesisById, checkSimilarTheses, approveWithResolution, getCurationSuggestions

**Badge no sidebar:** `MemoriaJuridicaMenuItem.tsx` com contador de pendentes

**Pagina MemoriaDavid removida** — Funcionalidade consolidada em Intelligence

---

### 2. Handler de Analise de Peticoes (Prioridade Baixa)

Intent `PETITION_ANALYSIS` existe no IntentService mas nao tem handler dedicado com output estruturado (partes, pedidos, riscos).

**Arquivo:** `server/services/IntentService.ts`

---

### 3. ~~Modulos Incompletos~~ ✅ JA TRATADO

Modulos familia, criminal e fazenda ja aparecem como `isAvailable: false` no UI, com label "Em breve" e botoes desabilitados. Nao confunde o usuario.

Quando implementar prompts especificos, basta preencher `systemPrompt` e mudar `isAvailable: true` em `server/prompts/modules/index.ts`.

---

## Qualidade de Codigo

### 4. Refatorar davidRouter.ts (Prioridade Media)

712 linhas, god object. Quebrar em sub-routers:

```
server/routers/
  davidRouter.ts (main - 50 linhas, composicao)
  davidChat.ts (conversa + mensagens)
  davidLearning.ts (teses + drafts aprovados)
  davidDocuments.ts (documentos do processo)
```

**Arquivo:** `server/davidRouter.ts`

---

### 5. ~~Curadoria Inteligente de Teses~~ ✅ CONCLUIDO (13/02/2026)

Sistema completo de curadoria de teses com 3 subsistemas:

#### ~~5A. Deduplicacao na criacao~~ ✅

Ao aprovar tese, compara embedding contra teses ativas (threshold 0.85).
Se similar encontrada, dialog oferece: Substituir / Mesclar fundamentos / Manter ambas.

**Backend:**
- `RagService.findSimilarTheses(embedding, userId, { threshold, excludeId })` — busca por cosine similarity
- `thesisRouter.checkSimilarTheses` — endpoint que retorna matches antes da aprovacao
- `thesisRouter.approveWithResolution` — resolve conflito com 3 acoes:
  - `replace`: marca tese antiga como obsoleta, aprova nova
  - `merge`: combina fundamentos + keywords unicos, marca antiga como obsoleta, aprova nova
  - `keep_both`: aprova nova sem alterar existente

**Frontend:**
- `SimilarThesisDialog.tsx` — dialog com cards de teses similares, % de similaridade, 3 botoes de acao
- `PendingTheses.tsx` — fluxo: clicar Aprovar → fetch checkSimilarTheses → se match, mostrar dialog → resolver

#### ~~5B. Rastreamento de uso~~ ✅

Campos `useCount` (int, default 0) e `lastUsedAt` (timestamp, nullable) na tabela `learnedTheses`.
Incrementados automaticamente quando RAG retorna a tese (fire-and-forget, nao bloqueia resposta).

**Schema:** `drizzle/schema.ts` — 2 campos adicionados
**Logica:** `RagService.trackThesisUsage(thesisIds)` — chamado apos `searchLegalTheses` e `searchWritingStyle`

#### ~~5C. Curadoria assistida~~ ✅

Painel de sugestoes na tab "Teses Ativas" com 2 tipos de alerta:

**1. Teses nunca resgatadas** — `useCount = 0` apos 30+ dias de criacao
- Indica teses que o RAG nunca retornou em respostas
- Pode significar: tese muito especifica, mal formulada, ou redundante

**2. Clusters de teses similares** — similaridade > 0.80 (cosine) entre si
- Usa algoritmo Union-Find para agrupar teses similares
- Mostra % media de similaridade do cluster
- Permite deletar duplicatas diretamente

**Backend:**
- `RagService.findThesisClusters(userId, { threshold })` — O(n²) pairwise comparison + Union-Find
- `thesisRouter.getCurationSuggestions` — endpoint que retorna unused + clusters

**Frontend:**
- `CurationSuggestions.tsx` — card colapsavel com badge de contagem
- Integrado no topo do `KnowledgeLibrary.tsx`, acima da busca
- Auto-esconde quando nao ha sugestoes (0 itens)
- Botao de deletar em cada tese com confirmacao
- Cache de 5 min (staleTime) para nao refazer calculo a cada render

**Nota:** Performance O(n²) so e problema com 1000+ teses por usuario.
Migrar para pgvector apenas se/quando escalar para 100+ usuarios ativos.

---

### 6. ~~Cleanup de Conversas Abandonadas~~ ✅ CONCLUIDO (13/02/2026)

Funcao `cleanupAbandonedConversations()` em `server/db.ts` remove conversas sem mensagens com >7 dias.
Roda no startup do server + a cada 24h via `setInterval` em `server/_core/index.ts`.

---

## Infraestrutura

### 7. Structured Logging (Prioridade Baixa)

Substituir `console.log` por Winston ou Pino com niveis e formatacao JSON.

---

### 8. Cobertura de Testes (Prioridade Baixa)

~48% atual. Foco em:
- [ ] RagService.searchWithHierarchy
- [ ] IntentService
- [ ] ThesisLearningService

---

### 9. Cache Invalidation no RAG (Prioridade Baixa)

RagService cache com TTL fixo 5min, sem invalidacao quando knowledgeBase muda.

**Arquivo:** `server/services/RagService.ts`

---

## UI/UX

### 10. ~~Empty States~~ ✅ CONCLUIDO (13/02/2026)

Todas as paginas com listas tem empty states visuais com icones e texto descritivo:
- Processos: FolderOpen + CTA
- Minutas: FileText + texto
- Jurisprudencia: Scale + texto
- SearchPage: Search/MessageSquare + texto
- DavidPrompts: FileText + texto
- Intelligence (3 tabs): emojis + hints de busca

---

### 11. ~~Loading States~~ ✅ CONCLUIDO (13/02/2026)

Skeleton loaders nas listagens principais, Loader2 spinner em paginas menores:
- Processos: skeleton cards (6 placeholders em grid)
- Minutas: skeleton cards (6 placeholders em grid)
- Jurisprudencia: skeleton cards (3 placeholders em lista)
- ProcessoDetalhes: Loader2 padronizado
- SearchPage: Loader2 spinner
- DavidPrompts: Loader2 spinner
- Intelligence (3 tabs): Loader2 spinner

---

### 12. ~~Responsividade Mobile~~ Adiado

Usuarios usam desktop. Mobile nao e prioridade para beta.

---

## Backlog (Pos-MVP)

| Item | Quando |
|------|--------|
| Exportacao de minutas (PDF/DOCX) | Pos-feedback |
| Dark mode | Pos-feedback |
| i18n | Se expandir |
| Constants centralizadas | Quando refatorar |
| Acessibilidade (aria-labels) | Quando refatorar UI |

---

## Historico de Resolucao

Para referencia, os seguintes itens ja foram resolvidos e estao documentados em `archive/CORRECOES_PENDENTES.md`:

- Rate Limiting + Planos (C1) - Fev/2026
- Memory Leak em Streaming (C2) - Fev/2026
- Timeout em Requisicoes LLM (C3) - Fev/2026
- CSP Headers (A1) - Fev/2026
- Circuit Breaker (A2) - Fev/2026
- Validacao de URLs / SSRF (A3) - Fev/2026
- Limite de Upload (A4) - Fev/2026
- Loop de Aprendizado de Teses (M1) - **Ja funciona via PromptBuilder.ts** (linhas 130-167)
- UI de Revisao de Teses (#1) - **Unificado em /intelligence** com 3 tabs (Fev/2026)
- Pagina MemoriaDavid removida - **Consolidada em Intelligence** (Fev/2026)
- Empty States (#10) - **Todas as paginas com icones e texto** (Fev/2026)
- Loading States (#11) - **Skeleton loaders em listagens, Loader2 padronizado** (Fev/2026)
- Modulos Incompletos (#3) - **Ja estao cinza com "Em breve"** (Fev/2026)
- Cleanup de Conversas (#6) - **cleanupAbandonedConversations() + setInterval 24h** (Fev/2026)
- Curadoria Inteligente de Teses (#5) - **Sistema completo: deduplicacao + tracking + sugestoes** (Fev/2026)
  - 5A: findSimilarTheses + SimilarThesisDialog + approveWithResolution
  - 5B: useCount + lastUsedAt + trackThesisUsage (fire-and-forget)
  - 5C: getCurationSuggestions + CurationSuggestions.tsx (unused + clusters via Union-Find)
