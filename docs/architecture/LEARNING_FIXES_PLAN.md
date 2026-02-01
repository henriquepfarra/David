# 🔧 Plano de Correções - Aprendizado Contínuo

**Data:** 01/02/2026
**Status:** Pendente
**Prioridade:** Alta

---

## 📋 Resumo das Correções

| # | Correção | Prioridade | Tempo | Arquivos |
|---|----------|------------|-------|----------|
| 1 | Badge pendentes na Sidebar | 🔴 Alta | 30min | DashboardLayout.tsx |
| 2 | Padronizar thresholds | 🟡 Média | 15min | PromptBuilder.ts, minutar.handler.ts |
| 3 | Remover código morto | 🟢 Baixa | 10min | ContextService.ts, index.ts |
| 4 | Remover restrição 10 chars | 🟡 Média | 5min | PromptBuilder.ts |

**Total estimado:** ~1 hora

---

## 🔴 Correção 1: Badge de Pendentes na Sidebar

### Problema
O usuário não sabe que tem teses pendentes para revisar a menos que entre na página Intelligence.

### Solução
Adicionar badge com contador no item "Intelligence" da sidebar.

### Arquivo: `client/src/components/DashboardLayout.tsx`

```typescript
// 1. Adicionar import do trpc
import { trpc } from "@/lib/trpc";

// 2. Dentro do componente, adicionar query
const { data: pendingTheses } = trpc.thesis.getPendingCount.useQuery(undefined, {
    staleTime: 60_000, // Cache de 1 minuto
    refetchInterval: 60_000, // Refetch a cada 1 minuto
});

// 3. No item Intelligence da sidebar, adicionar badge
<SidebarItem
    icon={Brain}
    label="Intelligence"
    href="/intelligence"
    badge={pendingTheses?.count > 0 ? pendingTheses.count : undefined}
    badgeVariant="warning" // ou "destructive" para vermelho
/>
```

### Verificação
- [ ] Badge aparece quando há teses pendentes
- [ ] Badge some quando não há pendentes
- [ ] Badge atualiza após aprovar/rejeitar

---

## 🟡 Correção 2: Padronizar Thresholds

### Problema
Thresholds inconsistentes entre arquivos:

| Arquivo | Teses | Estilo |
|---------|-------|--------|
| PromptBuilder.ts | 0.6 | 0.5 |
| minutar.handler.ts | 0.3 | 0.3 |

### Solução
Padronizar para **0.5** em todos os lugares (bom equilíbrio entre precisão e recall).

### Arquivo 1: `server/services/PromptBuilder.ts`

**Linha ~133** (searchLegalTheses):
```typescript
// ANTES
{ limit: 3, threshold: 0.6 }

// DEPOIS
{ limit: 3, threshold: 0.5 }
```

### Arquivo 2: `server/commands/handlers/minutar.handler.ts`

**Linha ~291-292** (searchWritingStyle):
```typescript
// ANTES
{ limit: 2, threshold: 0.3 }

// DEPOIS
{ limit: 2, threshold: 0.5 }
```

**Linha ~295-297** (searchLegalTheses):
```typescript
// ANTES
{ limit: 3, threshold: 0.3 }

// DEPOIS
{ limit: 3, threshold: 0.5 }
```

### Opcional: Criar constante global
```typescript
// shared/const.ts
export const RAG_THRESHOLDS = {
    LEGAL_THESES: 0.5,
    WRITING_STYLE: 0.5,
    KNOWLEDGE_BASE: 0.6,
} as const;
```

### Verificação
- [ ] Grep por `threshold:` não encontra valores diferentes de 0.5 (exceto knowledge base)

---

## 🟢 Correção 3: Remover Código Morto (ContextService)

### Problema
`ContextService.ts` foi criado mas nunca usado. Duplica lógica que já existe no PromptBuilder.

### Solução
Remover arquivo e export.

### Passo 1: Remover arquivo
```bash
rm server/services/ContextService.ts
```

### Passo 2: Remover export em `server/services/index.ts`

```typescript
// REMOVER esta linha:
export { createBuilderWithLearning } from "./ContextService";
```

### Verificação
- [ ] Build passa sem erros (`pnpm build`)
- [ ] TypeCheck passa (`pnpm check`)
- [ ] Nenhum import quebrado

---

## 🟡 Correção 4: Remover Restrição de 10 Caracteres

### Problema
Busca de estilo só ativa para queries > 10 caracteres. Queries como "minutar" (7 chars) não ativam.

### Arquivo: `server/services/PromptBuilder.ts`

**Linha ~150**:
```typescript
// ANTES
if (searchTerm.length > 10) {

// DEPOIS
if (searchTerm.length > 3) {
```

### Justificativa
- 3 caracteres é suficiente para evitar buscas em "oi", "ok"
- Permite que termos jurídicos curtos funcionem ("JEC", "dano", "mora")

### Verificação
- [ ] Query "minutar" ativa busca de estilo
- [ ] Query "oi" não ativa busca de estilo

---

## 📝 Checklist de Implementação

### Antes de Começar
- [ ] Criar branch: `git checkout -b fix/learning-improvements`
- [ ] Verificar build atual: `pnpm build`

### Correções
- [ ] **1. Badge Sidebar**
  - [ ] Adicionar query trpc
  - [ ] Renderizar badge condicional
  - [ ] Testar visualmente

- [ ] **2. Thresholds**
  - [ ] PromptBuilder.ts (linha ~133)
  - [ ] minutar.handler.ts (linhas ~291, ~296)

- [ ] **3. Remover ContextService**
  - [ ] Deletar arquivo
  - [ ] Remover export

- [ ] **4. Restrição 10 chars**
  - [ ] Alterar para 3 chars

### Após Implementar
- [ ] `pnpm check` passa
- [ ] `pnpm build` passa
- [ ] Testar fluxo completo:
  - [ ] Aprovar uma minuta → Tese aparece como pendente
  - [ ] Badge aparece na sidebar
  - [ ] Aprovar tese → Badge atualiza
  - [ ] Nova minuta usa tese aprendida

### Commit
```bash
git add .
git commit -m "fix(learning): add pending badge, standardize thresholds, cleanup dead code

- Add thesis pending count badge to sidebar
- Standardize RAG thresholds to 0.5 across all files
- Remove unused ContextService.ts
- Lower style search min chars from 10 to 3

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🔮 Melhorias Futuras (Não Incluídas)

Estas são boas ideias mas não são críticas agora:

1. **Botão "Aprovar Minuta" no chat** após /minutar
2. **Toast de confirmação** quando tese é extraída
3. **Analytics avançadas** no StatsWidget
4. **Comando /tese pending** para listar pendentes no chat

---

## 📊 Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Visibilidade de pendentes | Baixa | Alta |
| Precisão do RAG | Inconsistente | Padronizada |
| Código morto | 62 linhas | 0 linhas |
| Cobertura de busca | >10 chars | >3 chars |

---

**Autor:** Análise automática
**Última atualização:** 01/02/2026
