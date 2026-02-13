# 🎯 Roadmap MVP: David em < 1 Mês

**Data de Criação**: 18/01/2026
**Última atualização**: 13/02/2026
**Prazo**: < 1 mês para primeiros usuários
**Status**: 🟢 Semanas 1-2 concluídas, Semanas 3-4 em andamento

---

## 📊 Contexto da Decisão

### Pergunta Original
> Terminar refatoração vs. terminar funcionalidades primeiro?

### Resposta
**Nem um nem outro na forma pura** — seguir um caminho híbrido pragmático.

### Racional
| Opção | Prós | Contras |
|-------|------|---------|
| **Refatoração Pura** | Código limpo, fácil manutenção | 3-4 semanas sem entregar valor |
| **Funcionalidades Puras** | Entrega rápida | Dívida técnica exponencial |
| **Híbrido (escolhido)** | Estabiliza + entrega | Código imperfeito por mais tempo |

### Princípio Guia
> **"Corrigir apenas o que bloqueia funcionalidades ou uso, não refatorar por refatorar."**

---

## 📈 Estado Atual do Projeto

| Área | Status | Detalhes |
|------|--------|----------|
| **UI/Layout** | 90% | Redesign Settings concluído, user dropdown atualizado |
| **Features Jurídicas** | ✅ Backend + Frontend | Comando /tese, UI de revisão, CRUD teses/minutas em /intelligence |
| **Multi-Provider LLM** | ✅ Concluído | Google, OpenAI, Anthropic com seletor de modelo |
| **Sistema de Planos** | ✅ Concluído | tester/free/pro/avançado com créditos diários |
| **Segurança** | ✅ Concluído | CSP, circuit breaker, rate limiting, SSRF prevention |
| **Refatoração** | Em pausa | Configuracoes.tsx: 901→79 linhas (refatorado) |
| **Bug Crítico** | ✅ Resolvido | Loop of Death corrigido |

---

## 🗓️ Plano de Execução (4 Semanas)

### Semana 1: Estabilização Crítica ⚡

**Objetivo**: Eliminar bugs que bloqueiam uso básico

| # | Tarefa | Arquivos | Status |
|---|--------|----------|--------|
| 1.1 | Corrigir Loop of Death | `David.tsx`, `DashboardLayout.tsx` | ✅ FEITO |
| 1.2 | Definir LLM model default | `_core/llm.ts` | ✅ FEITO (fallback: gemini-2.5-flash) |
| 1.3 | Cleanup código morto (Fase 8) | `David.tsx` + 10 dialogs | ✅ FEITO (-38% linhas) |

**Entregável**: App estável para uso diário sem travamentos ✅ **COMPLETA**

#### 1.1 Loop of Death - Detalhes

**Problema**: Sincronização bidirecional de estado causa loop infinito
```
DashboardLayout → setLocation → David.tsx useEffect →
setSelectedConversationId → re-render → polling detecta mudança → LOOP
```

**Solução**: Hook `useConversationId` (já criado)
- URL como única fonte de verdade
- Remover polling de query string
- Remover sincronização duplicada

**Arquivos a modificar**:
- [x] `client/src/hooks/useConversationId.ts` — Já criado ✅
- [ ] `client/src/pages/David.tsx` — Integrar hook, remover código legado
- [ ] `client/src/components/DashboardLayout.tsx` — Usar hook para navegação

**Validação**:
- [ ] Upload PDF não trava
- [ ] Navegar entre conversas funciona
- [ ] F5 mantém conversa selecionada
- [ ] Voltar/avançar do browser funciona

---

### Semana 2: Features Jurídicas + Chat/IA 🧑‍⚖️

**Objetivo**: Completar aprendizado ativo + melhorar integração de contexto

#### 2A. Sistema de Teses (Aprendizado Ativo) — ✅ CONCLUÍDO

| # | Tarefa | Arquivos | Status |
|---|--------|----------|--------|
| 2A.0 | Comando /tese (ensino manual) | `server/commands/handlers/tese.handler.ts` | ✅ Concluído |
| 2A.0b | Threshold RAG padronizado 0.5 | `server/services/RagService.ts` | ✅ Concluído |
| 2A.0c | Auto-trigger extração na aprovação | `server/commands/handlers/minutar.handler.ts` | ✅ Concluído |
| 2A.1 | UI de revisão de teses pendentes | `Intelligence/PendingTheses.tsx` | ✅ Concluído |
| 2A.2 | Dialog approve/reject/edit | `Intelligence/components/ThesisCard.tsx` | ✅ Concluído |
| 2A.3 | Badge de pendentes no sidebar | `MemoriaJuridicaMenuItem.tsx` | ✅ Concluído |
| 2A.4 | Página unificada /intelligence | `Intelligence.tsx` (3 tabs) | ✅ Concluído |

**Página unificada** (`/intelligence`) com 3 tabs:
- **Caixa de Entrada** — Aprovar/editar/rejeitar teses pendentes
- **Teses Ativas** — CRUD de teses ativas (editar/deletar)
- **Minutas Aprovadas** — Listar/visualizar/deletar minutas

**Endpoints** (thesisRouter.ts — 12 endpoints):
- `getPendingCount`, `getPendingTheses`, `approveThesis`, `editThesis`, `rejectThesis`
- `getActiveTheses`, `updateActiveThesis`, `deleteThesis`, `getThesisById`
- `listApprovedDrafts`, `deleteApprovedDraft`, `getThesisStats`

**Nota:** Página `MemoriaDavid.tsx` removida — funcionalidade consolidada em Intelligence

#### 2B. Análise de Petições (Novo Intent)

| # | Tarefa | Arquivos | Escopo |
|---|--------|----------|--------|
| 2B.1 | Adicionar intent PETITION_ANALYSIS | `IntentService.ts` | Classificação |
| 2B.2 | Prompt específico para análise | `PromptBuilder.ts` | Template estruturado |
| 2B.3 | Trigger por comando ou detecção | `davidRouter.ts` | `/analisar` ou auto |

**Output esperado**:
- Partes identificadas
- Pedidos principais
- Pontos de atenção
- Prazos relevantes
- Fundamentação legal citada

#### 2C. Melhorar Uso de Documentos do Processo

| # | Tarefa | Arquivos | Escopo |
|---|--------|----------|--------|
| 2C.1 | Verificar integração File API | `ContextBuilder.ts` | PDFs entram no contexto |
| 2C.2 | Ajustar retrieval de chunks | `RagService.ts` | Priorizar docs do processo |
| 2C.3 | Testar fluxo completo | E2E | Upload → Pergunta → Resposta |

**Entregável**: David usa conteúdo dos documentos anexados nas respostas

---

### Semana 3: Polish de UI/UX ✨

**Objetivo**: Experiência profissional para usuário final

| # | Tarefa | Escopo | Prioridade |
|---|--------|--------|------------|
| 3.1 | Empty states | Chat vazio, prompts vazios, inbox | Alta |
| 3.2 | Loading states consistentes | Skeleton loaders | Alta |
| 3.3 | Feedback visual de uploads | Progress bar real | Média |
| 3.4 | Responsividade mobile | Dialogs, sidebar | Média |
| 3.5 | Onboarding básico | Tooltip primeiro uso | Baixa |

**Entregável**: UI que não causa confusão em usuário novo

---

### Semana 4: Testes com Usuários + Buffer 🧪

**Objetivo**: Validar com usuários reais, corrigir o que surgir

| # | Tarefa | Foco |
|---|--------|------|
| 4.1 | Deploy para ambiente de teste | Staging com dados reais |
| 4.2 | Sessões com 2-3 usuários | Observar uso, coletar feedback |
| 4.3 | Hotfixes baseado em feedback | Priorizar por impacto |
| 4.4 | Buffer para imprevistos | ~3 dias de margem |

**Entregável**: Produto validado por usuários reais

---

## 🚫 O Que NÃO Fazer Agora

| Item | Motivo | Quando Fazer |
|------|--------|--------------|
| Refatorar davidRouter.ts (god object) | Funciona, não bloqueia (712 linhas) | Pós-MVP |
| Extrair MessageList/ChatArea (Fase 5-6) | Nice-to-have | Pós-MVP |
| Aumentar cobertura de testes para 70% | Importante mas não urgente | Pós-MVP |
| Dark mode | Feature, não necessidade | Pós-feedback |
| i18n | Só precisa português | Se expandir |
| Logging estruturado (Pino/Winston) | console.log funciona para beta | Pós-feedback |

---

## 📁 Arquivos Críticos por Semana

### Semana 1 (Estabilização)
```
client/src/
├── pages/David.tsx              # Integrar useConversationId
├── hooks/useConversationId.ts   # ✅ Já criado
└── components/DashboardLayout.tsx # Usar hook para navegação

server/
└── davidRouter.ts               # Fallback de modelo LLM
```

### Semana 2 (Features Jurídicas) ✅ CONCLUÍDA
```
client/src/pages/Intelligence/
├── index.tsx                    # Página com 3 tabs ✅
├── PendingTheses.tsx            # Caixa de Entrada ✅
├── KnowledgeLibrary.tsx         # Teses Ativas (edit/delete) ✅
├── ApprovedDrafts.tsx           # Minutas Aprovadas ✅
└── components/
    ├── ThesisCard.tsx           # Card com approve/reject/edit ✅
    └── StatsWidget.tsx          # Métricas ✅

server/routers/thesisRouter.ts   # 12 endpoints com ownership check ✅
```

### Semana 3 (UI Polish)
```
client/src/
├── components/ui/               # Empty states, skeletons
├── pages/*.tsx                  # Adicionar estados vazios
└── styles/                      # Ajustes responsivos
```

---

## ✅ Critérios de Sucesso (Definition of Done)

### Para considerar "Pronto para Usuários":

- [ ] **Estabilidade**
  - [ ] Upload de PDF funciona sem travar (Loop of Death corrigido)
  - [ ] Chat responde consistentemente (modelo default definido)

- [ ] **Features Jurídicas**
  - [ ] Juiz consegue aprovar/rejeitar teses extraídas
  - [ ] David analisa petições quando solicitado
  - [ ] Respostas usam conteúdo dos documentos do processo

- [ ] **UX**
  - [ ] UI não tem estados "em branco" confusos
  - [ ] Funciona em mobile (pelo menos visualização)

- [ ] **Validação**
  - [ ] 2-3 usuários testaram sem assistência
  - [ ] Completaram tarefas básicas com sucesso

---

## 🧪 Plano de Testes

### 1. Loop of Death
```bash
# Testar manualmente:
1. Abrir /david
2. Criar nova conversa
3. Upload de PDF
4. Navegar para outra conversa
5. Voltar para a conversa com PDF
6. Verificar: sem travamento, sem "Maximum update depth"
```

### 2. Chat com Modelo Default
```bash
# Testar:
1. Remover configuração de modelo do usuário
2. Enviar mensagem
3. Verificar: resposta normal (não crash)
```

### 3. Sistema de Teses
```bash
# Testar:
1. Aprovar uma minuta
2. Verificar extração de tese (backend)
3. Acessar "Memória" > "Pendentes"
4. Revisar e aprovar tese
5. Verificar: tese aparece em "Ativas"
```

### 4. Análise de Petições
```bash
# Testar:
1. Anexar petição (PDF)
2. Enviar: "analise essa petição"
3. Verificar: resposta estruturada com pontos de atenção
```

### 5. Contexto de Documentos
```bash
# Testar:
1. Selecionar processo com documentos
2. Perguntar algo específico do processo
3. Verificar: resposta usa informações dos docs
```

---

## 📊 Métricas de Acompanhamento

| Métrica | Inicial | Meta | Atual |
|---------|---------|------|-------|
| David.tsx linhas | 2.924 | <1500 | **1.820** (-38%) |
| Configuracoes.tsx linhas | 901 | <100 | **79** (-91%) ✅ |
| useState hooks | 46 | <20 | **29** (-37%) |
| useEffect hooks | 14 | <8 | **12** |
| Bugs críticos | 2 | 0 | **0** ✅ |
| Semana 1 | - | Completa | ✅ **100%** |
| Features jurídicas completas | 60% | 90% | **90%** ✅ |
| Segurança implementada | 0% | 100% | **100%** ✅ |
| Multi-Provider LLM | 0% | 100% | **100%** ✅ |
| Sistema de Planos | 0% | 100% | **100%** ✅ |
| Usuários testaram | 0 | 3+ | 0 |

---

## 🔄 Trade-offs Aceitos

1. **David.tsx continua grande** — Refatoração completa adiada para pós-MVP
2. **Cobertura de testes baixa** — Foco em testes manuais e E2E críticos
3. **God functions no backend** — Funcionam, não bloqueiam
4. **Sem dark mode** — Feature cosmética, não essencial

---

## 📅 Checkpoints

| Data | Checkpoint | Critério |
|------|------------|----------|
| Fim Semana 1 | Estabilização | App não trava, chat funciona |
| Fim Semana 2 | Features | Teses + análise funcionando |
| Fim Semana 3 | Polish | UI profissional |
| Fim Semana 4 | Validação | Feedback de usuários reais |

---

## 🚀 Próximos Passos Imediatos

1. ~~**UI de Revisão de Teses**~~ ✅ Concluído (13/02/2026)
   - Página `/intelligence` unificada com 3 tabs
   - CRUD completo de teses e minutas
   - Badge no sidebar com contador de pendentes

2. **Polish de UI/UX** (Semana 3)
   - Empty states para chat vazio, prompts vazios
   - Loading states consistentes
   - Responsividade mobile

3. **Testes com Usuários** (Semana 4)
   - Deploy para ambiente de teste
   - Sessões com 2-3 usuários

---

## Conquistas Extras (Fev/2026 - fora do escopo original)

Implementações que aceleraram o roadmap além do planejado:

- ✅ **Multi-Provider LLM**: 3 provedores (Google, OpenAI, Anthropic) com seletor na UI
- ✅ **Sistema de Planos e Créditos**: 5 planos com rate limiting e burst protection
- ✅ **Segurança Completa**: CSP, circuit breaker, SSRF prevention, upload limits
- ✅ **Redesign Settings**: Sidebar com 5 seções, plano avançado BYOK
- ✅ **Auto-Migration**: drizzle-kit push no startup
- ✅ **Comando /tese**: Ensino manual de teses implementado
- ✅ **Página Intelligence unificada**: 3 tabs (Caixa de Entrada, Teses Ativas, Minutas Aprovadas) — MemoriaDavid removida

---

**Documento vivo** — Atualizar conforme progresso
