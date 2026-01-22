# 🚀 Próximos Passos - Refatoração David.tsx

**Status**: Pronto para começar
**Data**: 14/01/2026
**Tempo estimado total**: 30h (~5 dias úteis)

---

## 📋 Checklist de Início

### Antes de Começar:
- [ ] **Revisar o plano**: Ler [FRONTEND_REFACTORING_PLAN.md](./FRONTEND_REFACTORING_PLAN.md)
- [ ] **Criar issue no GitHub**: "Refatoração David.tsx - Monolito → Módulos"
- [ ] **Alinhar com time**: Daily de 5min para comunicar início
- [ ] **Backup**: Criar tag git `pre-refactor-backup`

---

## 🎯 Fase 0: Preparação (HOJE - 5h)

### 0.1 Auditoria de Estados (1h)

**Ação**: Criar arquivo `David_STATE_AUDIT.md`

```bash
cd /Users/henriquefarra/David/David/docs
touch David_STATE_AUDIT.md
```

**Conteúdo** (mapear todos os estados):
```markdown
# Auditoria de Estados - David.tsx

## Upload (3 estados → consolidar em 1)
- uploadState: UploadState
- attachedFiles: AttachedFile[]
- localAttachedFile: AttachedFile | null

## Chat (8 estados)
- messageInput: string
- pendingUserMessage: PendingMessage | null
- isStreaming: boolean
- streamingMessageId: string | null
- ...

## Prompts (7 estados)
- isPromptsModalOpen: boolean
- newPromptTitle: string
- ...

## Processos (4 estados)
- selectedProcessId: number | undefined
- ...
```

### 0.2 Testes E2E Baseline (2h)

**Ação**: Criar testes E2E com Playwright/Cypress

```bash
cd /Users/henriquefarra/David/David/client
npm install -D @playwright/test # ou cypress
```

**Criar arquivo**: `client/e2e/david.baseline.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('David.tsx Baseline', () => {
  test('upload PDF e enviar mensagem', async ({ page }) => {
    await page.goto('/david');

    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-fixtures/sample.pdf');

    // Verificar badge aparece
    await expect(page.locator('[data-testid="file-badge"]')).toBeVisible();

    // Enviar mensagem
    await page.fill('textarea', 'Analise este PDF');
    await page.press('textarea', 'Enter');

    // Verificar mensagem enviada
    await expect(page.locator('[data-testid="user-message"]')).toContainText('Analise este PDF');
  });

  test('navegação entre conversas', async ({ page }) => {
    // TODO: implementar
  });

  test('streaming de resposta', async ({ page }) => {
    // TODO: implementar
  });
});
```

**Executar**:
```bash
npx playwright test
```

### 0.3 Branch e Setup (2h)

**Ação**: Criar branch e estrutura

```bash
cd /Users/henriquefarra/David/David
git checkout -b refactor/david-consolidation
git push -u origin refactor/david-consolidation

# Criar estrutura de pastas
mkdir -p client/src/contexts
mkdir -p client/src/components/upload
mkdir -p client/src/components/chat
mkdir -p client/src/components/prompts
```

**Criar arquivo de feature flags**:
```bash
touch client/src/config/features.ts
```

```typescript
// client/src/config/features.ts
export const FEATURES = {
  USE_REFACTORED_UPLOAD: import.meta.env.VITE_REFACTORED_UPLOAD === 'true',
  USE_REFACTORED_CHAT_INPUT: import.meta.env.VITE_REFACTORED_CHAT_INPUT === 'true',
  USE_REFACTORED_PROMPTS: import.meta.env.VITE_REFACTORED_PROMPTS === 'true',
} as const;
```

---

## 🎯 Fase 0.5: Consolidação (AMANHÃ - 4h)

### Checklist:
- [ ] Criar estado consolidado `uploadStateNew`
- [ ] Manter estados antigos com `@deprecated`
- [ ] Sincronizar estados durante transição
- [ ] Atualizar todas as referências gradualmente
- [ ] Remover estados antigos
- [ ] Rodar testes E2E baseline
- [ ] **Criar PR pequeno** usando template em [PR_TEMPLATES.md](./PR_TEMPLATES.md)

### Comando para criar PR:
```bash
gh pr create --title "refactor: consolidar estados de upload" \
  --body-file docs/PR_TEMPLATES.md#fase-05-consolidação-de-estados
```

---

## 🎯 Fases Seguintes (Dias 3-5)

### Dia 3: Fase 1 (8h)
- Upload Module completo
- UploadContext + usePdfUpload + PdfUploader

### Dia 4: Fase 2 + 3 (12h)
- ChatInput (6h)
- Prompts Module (6h)

### Dia 5: Fase 4 (6h)
- Limpeza final
- Testes + validação
- Deploy staging

---

## 📞 Comunicação com Time

### Daily de 5min (todos os dias):
1. O que foi feito ontem?
2. O que será feito hoje?
3. Algum bloqueio?

### Quando pedir review:
- Após cada PR (Fase 0.5, 1, 2, 3, 4)
- Não esperar tudo ficar pronto

---

## 🚨 Critérios de Parada

**Interromper refatoração se**:
- Testes E2E quebrarem e não souber como consertar
- Performance cair > 20% vs baseline
- Descobrir dependência crítica não mapeada

**Nesses casos**:
1. Reverter para commit anterior
2. Documentar o problema
3. Discutir com time
4. Replanejar

---

## 📊 Como Medir Sucesso

### Métricas de Código:
```bash
# Contar linhas David.tsx
wc -l client/src/pages/David.tsx

# Contar useState
grep -c "useState" client/src/pages/David.tsx

# Contar useEffect
grep -c "useEffect" client/src/pages/David.tsx
```

### Métricas de Performance:
- React Profiler (antes vs depois)
- Lighthouse score (antes vs depois)
- Time to Interactive (antes vs depois)

---

## ✅ Começar AGORA

**Próximo comando a executar**:

```bash
# 1. Criar tag de backup
git tag pre-refactor-backup
git push origin pre-refactor-backup

# 2. Criar branch
git checkout -b refactor/david-consolidation

# 3. Começar auditoria de estados
code docs/David_STATE_AUDIT.md
```

---

## 🆘 Em Caso de Dúvidas

1. **Revisar documentação**:
   - [FRONTEND_REFACTORING_PLAN.md](./FRONTEND_REFACTORING_PLAN.md)
   - [PR_TEMPLATES.md](./PR_TEMPLATES.md)

2. **Perguntar no time**: Daily ou Slack

3. **Consultar análise original**: Este documento foi baseado em análise detalhada do código

---

**Boa sorte! 🚀**
