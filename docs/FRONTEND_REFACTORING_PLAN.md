# 🔧 Plano de Refatoração do Frontend: David.tsx (v3 - Final)

**Atualização**: 14/01/2026
**Tempo estimado**: 30h (~5 dias úteis)
**Status**: ✅ Aprovado

## 📚 Documentação Relacionada

- [📊 Resumo Executivo](./EXECUTIVE_SUMMARY.md) - Para gestão e stakeholders
- [🚀 Próximos Passos](./NEXT_STEPS.md) - Guia de início rápido
- [📝 Templates de PR](./PR_TEMPLATES.md) - Templates para cada fase
- [📋 Este documento](./FRONTEND_REFACTORING_PLAN.md) - Plano técnico detalhado

---

## Estado Atual vs Meta

| Métrica | Atual | Meta |
|---------|-------|------|
| Linhas | 2924 | <500/arquivo |
| useState | 46 | <10/componente |
| useEffect | 11 | <5/componente |
| Fontes de verdade (upload) | 3 | 1 |

---

## Decisões Técnicas

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Estado | Context API split | Não adiciona dependência |
| Re-renders | State/Actions separados | Evita cascata |
| Zustand | Não agora | Só se performance ruim |
| Ordem | Consolidar → Context → Componentes | Evita refatorar 2x |
| **Rollback** | **Feature flag** | **Deploy seguro** |

---

## Fase 0: Preparação (5h)

### 0.1 Auditoria de Estados (1h)
Documentar os 46 estados e dependências.

### 0.2 Testes E2E Baseline (2h)
- Upload PDF → Enviar mensagem
- Navegação entre conversas
- Streaming de resposta
- **Criar snapshots visuais** (Playwright)

### 0.3 Branch e Setup (2h)
- Criar branch `refactor/david-consolidation`
- Configurar feature flag

```typescript
// client/src/config/features.ts
export const FEATURES = {
  USE_REFACTORED_UPLOAD: import.meta.env.VITE_REFACTORED_UPLOAD === 'true'
};
```

---

## Fase 0.5: Consolidação de Estados (4h) ⭐

### Estratégia de Migração Segura

**1. Criar novo estado consolidado**:
```typescript
const [uploadStateNew, setUploadStateNew] = useState({
  isUploading: false,
  stage: null,
  files: [],
  error: null
});
```

**2. Manter estados antigos temporariamente**:
```typescript
// @deprecated - remover após migração
const [attachedFiles, setAttachedFiles] = useState([]);
const [localAttachedFile, setLocalAttachedFile] = useState(null);
```

**3. Sincronizar durante transição**:
```typescript
useEffect(() => {
  setUploadStateNew(prev => ({ ...prev, files: attachedFiles }));
}, [attachedFiles]);
```

**4. Migrar uso gradualmente → 5. Remover estados antigos**

---

## Fase 1: Upload Module (8h)

### 1.1 Criar Context Split (2h)

```typescript
// client/src/contexts/UploadContext.tsx

export const UploadStateContext = createContext<UploadState | null>(null);
export const UploadActionsContext = createContext<UploadActions | null>(null);

export function UploadProvider({ children }) {
  const [state, setState] = useState<UploadState>({...});
  
  const actions = useMemo(() => ({
    uploadFile: async (file: File) => {...},
    removeFile: (uri: string) => {...},
    clearFiles: () => {...}
  }), []);
  
  return (
    <UploadStateContext.Provider value={state}>
      <UploadActionsContext.Provider value={actions}>
        {children}
      </UploadActionsContext.Provider>
    </UploadStateContext.Provider>
  );
}

// Hooks auxiliares
export const useUploadState = () => useContext(UploadStateContext);
export const useUploadActions = () => useContext(UploadActionsContext);
```

### 1.2 Extrair usePdfUpload (3h)
### 1.3 Extrair PdfUploader (3h)

---

## Fase 2: Chat Input (6h)

### 2.1 Extrair ChatInput (4h)
### 2.2 Integração (2h)

---

## Fase 3: Prompts Module (6h)

### 3.1 Extrair usePrompts (3h)
### 3.2 Extrair PromptsModal (3h)

---

## Fase 4: Limpeza e Validação (6h)

### 4.1 Limpar David.tsx (2h)

### 4.2 Testes Finais (4h)
- Testes E2E completos
- React Profiler (performance)
- **Comparar com baseline da Fase 0.2**
- Code review

---

## Checklist de Execução

- [ ] **Fase 0**: Preparação
  - [ ] Documentar auditoria
  - [ ] Testes E2E baseline + snapshots
  - [ ] Branch + feature flag
  - **Critério**: Todos os testes baseline passando

- [ ] **Fase 0.5**: Consolidação
  - [ ] Consolidar uploadState
  - [ ] Sync temporário funcionando
  - [ ] PR pequeno
  - **Critério**: Nenhum teste E2E quebrado

- [ ] **Fase 1**: Upload Module
  - [ ] UploadContext (split)
  - [ ] usePdfUpload
  - [ ] PdfUploader
  - **Critério**: Upload idêntico ao anterior

- [ ] **Fase 2**: Chat Input
  - **Critério**: Auto-resize e atalhos funcionando

- [ ] **Fase 3**: Prompts Module
  - **Critério**: CRUD sem regressões

- [ ] **Fase 4**: Validação
  - **Critério**: Performance ≥ baseline
