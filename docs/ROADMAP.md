# Roadmap - David

**Ultima atualizacao:** 2026-02-13
**Status atual:** Beta pronto (9/10)

---

## Visao Geral

```
[HOJE] ──── Beta ─────────────────────────────────────────────────────────────▶

  Fase A                 Fase B                  Fase C              Fase D
  Qualidade de Codigo    Observabilidade         Features            Escala
  ───────────────────    ──────────────          ─────────           ──────
  Refatorar routers      Structured Logging      Analise Peticoes    Migracao Infra
                         Cobertura de Testes     Export PDF/DOCX     pgvector
                         Cache Invalidation      Novos Modulos       Connection pooling
                                                 Dark mode

  [Antes de crescer]     [Antes de produção]     [Pós-feedback]      [Ponto de inflexão]
```

---

## Fase A — Qualidade de Codigo (pre-escala)

**Quando:** Antes de adicionar features novas
**Objetivo:** Manutenibilidade do codigo existente

### A1. Refatorar davidRouter.ts

**Prioridade:** Media | **Esforco:** Alto

O `davidRouter.ts` tem ~712 linhas (god object). Quebrar em sub-routers por dominio:

```
server/routers/
  davidRouter.ts       (composicao — ~50 linhas)
  davidChat.ts         (conversa + mensagens)
  davidLearning.ts     (teses + drafts aprovados)
  davidDocuments.ts    (documentos do processo)
```

**Arquivo:** `server/davidRouter.ts`
**Risco:** Baixo (refatoracao interna, API publica nao muda)
**Dependencias:** Nenhuma

---

## Fase B — Observabilidade (pre-producao)

**Quando:** Antes de ter usuarios reais em volume
**Objetivo:** Capacidade de debugar problemas em producao

### B1. Structured Logging

**Prioridade:** Media | **Esforco:** Medio

Substituir `console.log` por logger estruturado (Pino ou Winston):
- Niveis: error, warn, info, debug
- Formato JSON para parsing automatico
- Contexto automatico: userId, conversationId, requestId
- Rotacao de logs em producao

**Impacto:** Debugging em producao passa de "procurar no console" para "filtrar por usuario/erro"

### B2. Cobertura de Testes

**Prioridade:** Media | **Esforco:** Alto

Cobertura atual: ~48%. Foco nos servicos criticos:

| Servico | Cobertura Atual | Meta | Prioridade |
|---------|----------------|------|------------|
| RagService.searchWithHierarchy | Baixa | 80% | Alta |
| IntentService | Baixa | 80% | Alta |
| ThesisLearningService | Baixa | 70% | Media |
| thesisRouter endpoints | Nenhuma | 60% | Media |

**Tipo de testes:** Unit tests com mocks de DB e LLM

### B3. Cache Invalidation no RAG

**Prioridade:** Baixa | **Esforco:** Baixo

RagService cache com TTL fixo 5min, sem invalidacao quando knowledgeBase muda.

**Solucao proposta:** Invalidar cache do usuario quando:
- Tese aprovada/editada/deletada
- Knowledge base atualizada

**Arquivo:** `server/services/RagService.ts`

---

## Fase C — Features (pos-feedback de usuarios)

**Quando:** Apos primeiros usuarios reais usarem o sistema
**Objetivo:** Funcionalidades pedidas por usuarios

### C1. Handler de Analise de Peticoes

**Prioridade:** Baixa | **Esforco:** Medio

Intent `PETITION_ANALYSIS` existe no IntentService mas nao tem handler dedicado.

**Entregavel:** Output estruturado com:
- Partes do processo
- Pedidos identificados
- Riscos e pontos de atencao
- Prazos relevantes

**Arquivo:** `server/services/IntentService.ts`

### C2. Exportacao de Minutas (PDF/DOCX)

**Prioridade:** Media | **Esforco:** Medio

Usuarios precisam exportar minutas para uso no sistema judicial.

**Opcoes:**
- PDF via Puppeteer ou html-pdf
- DOCX via docx.js
- Ambos (recomendado — DOCX para editar, PDF para protocolar)

### C3. Novos Modulos Especializados

**Prioridade:** Baixa | **Esforco:** Medio por modulo

Modulos inativos ja tem UI pronta (badge "Em breve", botoes desabilitados).

Para ativar, basta preencher prompts em `server/prompts/modules/index.ts`:
- Familia
- Criminal
- Fazenda Publica

**Detalhes:** [orchestration_architecture_v7.md](./architecture/orchestration_architecture_v7.md) — secao "Sistema de Modulos"

### C4. Dark Mode

**Prioridade:** Baixa | **Esforco:** Baixo

Tailwind ja suporta `dark:` classes. Falta:
- Toggle no UI (Settings ou header)
- Persistir preferencia do usuario
- Revisar componentes customizados

### C5. Acessibilidade

**Prioridade:** Baixa | **Esforco:** Medio

- aria-labels nos componentes interativos
- Navegacao por teclado
- Contraste de cores (WCAG AA)

---

## Fase D — Escala (ponto de inflexao)

**Quando:** ~50-100 usuarios ativos simultaneos
**Objetivo:** Infraestrutura que aguenta crescimento

### D1. Migracao de Infraestrutura

**Prioridade:** Alta (quando atingir trigger) | **Esforco:** Alto

```
Railway (atual)  →  Fly.io + Supabase (medio prazo)  →  AWS (longo prazo)
```

**Triggers de migracao:**
- MySQL: "Too many connections" ou latencia > 200ms
- Railway: custos > $50/mes ou limites de memoria
- Upload: Google File API atingindo limites

**Plano detalhado:** [PLANO_MIGRACAO_INFRA.md](./architecture/PLANO_MIGRACAO_INFRA.md)

### D2. pgvector para Embeddings

**Prioridade:** Media (quando atingir trigger) | **Esforco:** Medio

Atualmente embeddings sao armazenados como JSON e comparados em memoria (O(n²) para clusters).

**Trigger:** > 1000 teses por usuario OU > 100 usuarios ativos
**Solucao:** Migrar para PostgreSQL + pgvector com indice HNSW

### D3. i18n

**Prioridade:** Baixa | **Esforco:** Alto

Apenas se expandir para mercados nao-lusofono.

---

## Backlog (sem prazo definido)

| Item | Trigger |
|------|---------|
| Constants centralizadas | Quando refatorar |
| Responsividade mobile | Se usuarios pedirem |

---

## Dependencias entre Fases

```
Fase A (Qualidade) ──┐
                     ├──▶ Fase C (Features) ──▶ Fase D (Escala)
Fase B (Observab.) ──┘
```

- Fases A e B podem rodar em paralelo
- Fase C depende de feedback de usuarios (nao de A/B)
- Fase D so quando atingir triggers de escala
- Dentro de cada fase, os itens sao independentes entre si

---

## Documentacao Relacionada

| Documento | Conteudo |
|-----------|----------|
| [orchestration_architecture_v7.md](./architecture/orchestration_architecture_v7.md) | Arquitetura de orquestracao + modulos |
| [CONTINUOUS_LEARNING_PLAN_V3.md](./architecture/CONTINUOUS_LEARNING_PLAN_V3.md) | Ciclo de aprendizado + curadoria |
| [PLANO_MIGRACAO_INFRA.md](./architecture/PLANO_MIGRACAO_INFRA.md) | Detalhes da migracao D1 |
| [MODELO_NEGOCIO_API.md](./MODELO_NEGOCIO_API.md) | Planos, creditos, precificacao |
