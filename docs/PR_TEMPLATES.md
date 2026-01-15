# 📝 Templates de PR - Refatoração David.tsx

## Fase 0.5: Consolidação de Estados

```markdown
## 🎯 Objetivo
Consolidar 3 estados de upload em 1 única fonte de verdade.

## 🔧 Mudanças
- ✅ Consolidou `uploadState`, `attachedFiles`, `localAttachedFile` → `uploadState`
- ✅ Removeu race conditions no fluxo de upload
- ✅ Estados deprecated mantidos temporariamente com `@deprecated`

## 📊 Antes vs Depois

**Antes**:
```typescript
const [uploadState, setUploadState] = useState({...});
const [attachedFiles, setAttachedFiles] = useState([]);
const [localAttachedFile, setLocalAttachedFile] = useState(null);
```

**Depois**:
```typescript
const [uploadState, setUploadState] = useState({
  isUploading: false,
  stage: null,
  files: [],      // ← consolidou attachedFiles
  error: null
});
```

## ✅ Checklist
- [ ] Todos os testes E2E baseline passando
- [ ] Upload de PDF funciona identicamente
- [ ] Nenhuma regressão visual (snapshots)
- [ ] Code review aprovado

## 📸 Screenshots
[Adicionar screenshots de upload funcionando]

## 🧪 Como Testar
1. Fazer upload de PDF
2. Verificar badge aparece corretamente
3. Enviar mensagem com PDF anexado
4. Verificar que arquivo é enviado
```

---

## Fase 1: Upload Module

```markdown
## 🎯 Objetivo
Extrair módulo de upload completo: Context + Hook + Componente

## 🔧 Mudanças
- ✅ Criou `UploadContext` com split de State/Actions
- ✅ Criou hook `usePdfUpload`
- ✅ Extraiu componente `<PdfUploader />`
- ✅ Reduziu David.tsx em ~150 linhas

## 📦 Novos Arquivos
- `client/src/contexts/UploadContext.tsx` (80 linhas)
- `client/src/hooks/usePdfUpload.ts` (60 linhas)
- `client/src/components/upload/PdfUploader.tsx` (120 linhas)

## 🏗️ Arquitetura

```
David.tsx
  └─ UploadProvider
      ├─ UploadStateContext (leitura)
      └─ UploadActionsContext (ações)
           └─ PdfUploader (componente)
```

## 🧪 Testes Adicionados
- ✅ Testes unitários de `usePdfUpload`
- ✅ Testes de integração de `UploadContext`
- ✅ Testes E2E não quebraram

## ⚡ Performance
- Re-renders reduzidos em X% (React Profiler)
- Upload funciona identicamente

## ✅ Checklist
- [ ] Testes unitários passando
- [ ] Testes E2E passando
- [ ] Nenhuma regressão funcional
- [ ] Code review aprovado

## 🚀 Deploy
- Feature flag: `VITE_REFACTORED_UPLOAD=false` (desabilitado por padrão)
```

---

## Fase 2: Chat Input

```markdown
## 🎯 Objetivo
Extrair componente `ChatInput` com toda sua lógica

## 🔧 Mudanças
- ✅ Extraiu `<ChatInput />` (180 linhas)
- ✅ Preservou auto-resize do textarea
- ✅ Preservou atalhos de teclado (Enter, Shift+Enter)
- ✅ Integrou com `UploadContext`
- ✅ Reduziu David.tsx em ~200 linhas

## 📦 Novos Arquivos
- `client/src/components/chat/ChatInput.tsx` (180 linhas)

## 🎨 Funcionalidades Preservadas
- ✅ Auto-resize do textarea conforme digita
- ✅ Enter envia, Shift+Enter quebra linha
- ✅ Botão de anexar PDF
- ✅ Botão de gravação de áudio
- ✅ Badge de arquivo anexado
- ✅ Indicador de modelo (Bot)

## ✅ Checklist
- [ ] Auto-resize funciona
- [ ] Atalhos de teclado funcionam
- [ ] Upload integrado funciona
- [ ] Testes E2E passando
- [ ] Code review aprovado

## 🧪 Como Testar
1. Digitar mensagem longa → verificar auto-resize
2. Pressionar Enter → enviar mensagem
3. Pressionar Shift+Enter → quebrar linha
4. Anexar PDF → verificar badge
```

---

## Fase 3: Prompts Module

```markdown
## 🎯 Objetivo
Extrair módulo completo de prompts salvos

## 🔧 Mudanças
- ✅ Criou hook `usePrompts`
- ✅ Extraiu `<PromptsModal />` (400 linhas)
- ✅ Extraiu `<PromptEditor />`
- ✅ Reduziu David.tsx em ~450 linhas

## 📦 Novos Arquivos
- `client/src/hooks/usePrompts.ts` (100 linhas)
- `client/src/components/prompts/PromptsModal.tsx` (250 linhas)
- `client/src/components/prompts/PromptEditor.tsx` (150 linhas)

## 🎯 Funcionalidades
- ✅ CRUD de prompts
- ✅ Gerenciamento de coleções
- ✅ Modal de prompts
- ✅ Editor de prompt

## ✅ Checklist
- [ ] CRUD de prompts funciona
- [ ] Coleções funcionam
- [ ] Modal abre/fecha corretamente
- [ ] Testes E2E passando
- [ ] Code review aprovado
```

---

## Fase 4: Validação Final

```markdown
## 🎯 Objetivo
Finalizar refatoração e validar que tudo funciona

## 🔧 Mudanças
- ✅ Removeu código duplicado/deprecated
- ✅ Limpou David.tsx → ~500 linhas finais
- ✅ Removeu estados consolidados antigos
- ✅ Atualizou imports

## 📊 Resultados Finais

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Linhas David.tsx | 2924 | ~500 | **83% ↓** |
| useState | 46 | ~12 | **74% ↓** |
| useEffect | 11 | ~4 | **64% ↓** |
| Responsabilidades | 12 | 2 | **83% ↓** |

## 🧪 Testes
- ✅ Todos os testes E2E passando
- ✅ Performance ≥ baseline (React Profiler)
- ✅ Nenhuma regressão funcional
- ✅ Snapshots visuais iguais

## 🚀 Deploy
- Feature flag: `VITE_REFACTORED_UPLOAD=true` (habilitar em produção)
- Monitorar logs por 24h
- Rollback se necessário

## ✅ Checklist Final
- [ ] David.tsx < 600 linhas
- [ ] Todos os testes passando
- [ ] Performance validada
- [ ] Code review final aprovado
- [ ] Deploy em staging OK
- [ ] Aprovação para produção
```

---

## Como Usar Esses Templates

1. **Copiar template da fase atual**
2. **Preencher seções específicas** (screenshots, métricas, etc.)
3. **Criar PR no GitHub** com o template preenchido
4. **Linkar issue de refatoração** (se houver)
5. **Marcar reviewers** apropriados
6. **Aguardar aprovação** antes de mergear
