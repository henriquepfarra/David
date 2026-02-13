# Pendencias - David

**Ultima atualizacao:** 2026-02-13
**Score Geral:** 9/10 - Pronto para beta

---

## Funcionalidade

### 1. UI de Revisao de Teses (Prioridade Alta)

Frontend para aprovar/rejeitar teses extraidas automaticamente.

**Backend pronto** - endpoints em `server/routers/thesisRouter.ts`:
- `getPendingCount` - Contagem para badge
- `getPendingTheses` - Lista para revisao
- `approveThesis` - Aprovar tese
- `editThesis` - Editar antes de aprovar
- `rejectThesis` - Rejeitar tese

**O que falta no frontend:**
- [ ] Integrar PendingTheses na pagina MemoriaDavid
- [ ] Dialog de edicao/aprovacao/rejeicao
- [ ] Badge no sidebar com contador de pendentes
- [ ] Feedback visual apos aprovacao/rejeicao

**Componentes existentes** (parciais):
- `client/src/pages/Intelligence/PendingTheses.tsx`
- `client/src/pages/Intelligence/ThesisCard.tsx`

**Ref:** `docs/architecture/CONTINUOUS_LEARNING_PLAN_V3.md`

---

### 2. Handler de Analise de Peticoes (Prioridade Baixa)

Intent `PETITION_ANALYSIS` existe no IntentService mas nao tem handler dedicado com output estruturado (partes, pedidos, riscos).

**Arquivo:** `server/services/IntentService.ts`

---

### 3. Modulos Incompletos (Prioridade Media)

Apenas JEC tem implementacao real. Outros modulos tem `systemPrompt: ''`.

**Arquivos:**
- `server/modules/jec/` - Implementado
- `server/modules/familia/` - Vazio
- `server/modules/criminal/` - Vazio
- `server/modules/fazenda/` - Vazio

**Acao:** Implementar prompts especificos OU remover opcoes do UI.

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

### 5. Embedding Storage sem Limite (Prioridade Media)

Vetores de embedding crescem indefinidamente. Implementar:
- Archiving de embeddings antigos (>6 meses)
- Paginacao em queries de embedding

**Arquivos:** `drizzle/schema.ts`, `server/services/RagService.ts`

---

### 6. Cleanup de Conversas Abandonadas (Prioridade Media)

Conversas sem mensagens nao sao limpas. Criar job para limpar conversas vazias > 7 dias.

**Arquivo:** `server/db.ts` ou novo `server/jobs/cleanup.ts`

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

### 10. Empty States (Prioridade Media)

Chat vazio, listas vazias, inbox zero - adicionar estados visuais informativos.

---

### 11. Loading States (Prioridade Media)

Skeletons consistentes em todas as paginas.

---

### 12. Responsividade Mobile (Prioridade Media)

Ajustes de layout para dispositivos moveis.

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
