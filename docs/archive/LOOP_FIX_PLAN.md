# 🔴 Plano de Correção: Loop de Estado (Maximum Update Depth)

**Data**: 12/01/2026
**Prioridade**: 🔥 CRÍTICA
**Status**: 🚧 Em Análise

---

## 📊 Diagnóstico do Problema

### Sintoma
```
Maximum update depth exceeded.
TRPCClientError: Conversa não encontrada
```

### Causa Raiz Identificada

**LOOP BIDIREC IONAL DE ESTADO**:

```
┌──────────────────────────────────────────────────────────┐
│                    CICLO INFINITO                        │
└──────────────────────────────────────────────────────────┘

1. DashboardLayout.tsx (linha 489)
   ├─ Usuário clica em conversa
   └─ setLocation(`/david?c=${conv.id}`)
        ↓
2. David.tsx - useEffect (linhas 173-203)
   ├─ Detecta mudança em [location, urlSearch]
   └─ setSelectedConversationId(newId)
        ↓
3. David.tsx - useEffect de polling (linhas 76-87)
   ├─ Detecta mudança em query string a cada 100ms
   └─ setUrlSearch(window.location.search)
        ↓
4. Volta para (2) ⟲ LOOP INFINITO
```

### Evidências no Código

#### DashboardLayout.tsx
```typescript
// Linha 159: Criar nova conversa
setLocation(`/david?c=${data.id}`);

// Linha 489: Clicar em conversa
onClick={() => {
  setLocation(`/david?c=${conv.id}`);
}
```

#### David.tsx
```typescript
// Linhas 76-87: Polling de query string (PROBLEMA #1)
useEffect(() => {
  const checkUrl = () => {
    if (window.location.search !== urlSearch) {
      setUrlSearch(window.location.search); // ← Dispara re-render
    }
  };
  const interval = setInterval(checkUrl, 100); // ← 10 vezes por segundo!
  return () => clearInterval(interval);
}, [urlSearch]); // ← Depende de si mesmo

// Linhas 173-203: Sincronização URL → Estado (PROBLEMA #2)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const newId = cParam ? parseInt(cParam, 10) : null;

  if (newId !== lastUrlIdRef.current) {
    setSelectedConversationId(newId); // ← Atualiza estado
  }
}, [location, urlSearch]); // ← Dispara quando urlSearch muda

// Linha 470: Criar conversa (PROBLEMA #3)
createConversationMutation.onSuccess: (data) => {
  setSelectedConversationId(data.id); // ← Atualiza estado SEM atualizar URL
}
```

### Múltiplas Fontes de Verdade

1. **Estado React**: `selectedConversationId`
2. **URL (Query Param)**: `?c=123`
3. **Estado Auxiliar**: `urlSearch`
4. **Ref**: `lastUrlIdRef`
5. **Ref**: `selectedConversationIdRef`

**Resultado**: 5 fontes tentando se sincronizar = CAOS

---

## 🎯 Solução: Single Source of Truth

### Princípio

> **"A URL é a única fonte de verdade"**

- ✅ Estado React **DERIVA** da URL (read-only)
- ✅ Ações do usuário **MODIFICAM** a URL
- ✅ Componentes **LEEM** da URL via hook customizado
- ❌ Nunca modificar estado E URL ao mesmo tempo

### Arquitetura Proposta

```typescript
// ┌─────────────────────────────────────────┐
// │          FLUXO UNIDIRECIONAL            │
// └─────────────────────────────────────────┘

// 1. Hook customizado (nova abstração)
function useConversationId(): [number | null, (id: number | null) => void] {
  const [location, setLocation] = useLocation();

  // LEITURA: Sempre da URL
  const conversationId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    return c ? parseInt(c, 10) : null;
  }, [location]); // ← Apenas location, sem polling

  // ESCRITA: Sempre modifica a URL
  const setConversationId = useCallback((id: number | null) => {
    if (id === null) {
      setLocation('/david');
    } else {
      setLocation(`/david?c=${id}`);
    }
  }, [setLocation]);

  return [conversationId, setConversationId];
}

// 2. Uso no componente (SIMPLES)
const [conversationId, setConversationId] = useConversationId();

// 3. Criar conversa
createConversationMutation.onSuccess: (data) => {
  setConversationId(data.id); // ← Modifica URL, não estado
}

// 4. Clicar em conversa (DashboardLayout)
onClick={() => setConversationId(conv.id)}
```

---

## 📋 Plano de Implementação

### Fase 1: Criar Abstração (1h)

#### 1.1 Criar Hook `useConversationId`

**Arquivo**: `client/src/hooks/useConversationId.ts`

```typescript
import { useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook para gerenciar o ID da conversa selecionada.
 *
 * A URL é a ÚNICA fonte de verdade (?c=123).
 *
 * @returns [conversationId, setConversationId]
 */
export function useConversationId(): [number | null, (id: number | null) => void] {
  const [location, setLocation] = useLocation();

  // LEITURA: Deriva da URL (sem estado intermediário)
  const conversationId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    return c ? parseInt(c, 10) : null;
  }, [location]); // Reage apenas a mudanças no location do wouter

  // ESCRITA: Modifica a URL (e o location do wouter faz re-render)
  const setConversationId = useCallback((id: number | null) => {
    if (id === null) {
      setLocation('/david');
    } else {
      setLocation(`/david?c=${id}`);
    }
  }, [setLocation]);

  return [conversationId, setConversationId];
}
```

#### 1.2 Testes do Hook

**Arquivo**: `client/src/hooks/useConversationId.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useConversationId } from './useConversationId';

// Mock do wouter
vi.mock('wouter', () => ({
  useLocation: () => {
    const [loc, setLoc] = useState('/david?c=123');
    return [loc, setLoc];
  }
}));

describe('useConversationId', () => {
  it('deve ler ID da URL', () => {
    const { result } = renderHook(() => useConversationId());
    expect(result.current[0]).toBe(123);
  });

  it('deve retornar null se não há query param', () => {
    // Testar com URL /david
  });

  it('deve atualizar URL ao setar novo ID', () => {
    // act(() => result.current[1](456));
  });
});
```

---

### Fase 2: Refatorar David.tsx (2h)

#### 2.1 Remover Estado e Polling

**Arquivo**: `client/src/pages/David.tsx`

```diff
- const [location, setLocation] = useLocation();
- const [urlSearch, setUrlSearch] = useState(window.location.search);
- const [selectedConversationId, setSelectedConversationId] = useState<number | null>(...);
- const selectedConversationIdRef = useRef<number | null>(selectedConversationId);
- const lastUrlIdRef = useRef<number | null>(null);

+ import { useConversationId } from '@/hooks/useConversationId';
+ const [selectedConversationId, setSelectedConversationId] = useConversationId();

- // REMOVER: Polling de query string (linhas 76-87)
- useEffect(() => {
-   const checkUrl = () => { ... };
-   const interval = setInterval(checkUrl, 100);
-   return () => clearInterval(interval);
- }, [urlSearch]);

- // REMOVER: Sincronização URL → Estado (linhas 173-203)
- useEffect(() => {
-   const updateFromUrl = () => { ... };
-   updateFromUrl();
- }, [location, urlSearch, resetStream]);
```

#### 2.2 Atualizar Mutations

```diff
createConversationMutation.onSuccess: (data) => {
-  setSelectedConversationId(data.id);
+  setSelectedConversationId(data.id); // ← Agora modifica URL
  refetchConversations();
}
```

#### 2.3 Manter useEffect de Reset de Stream

```typescript
// Resetar stream quando conversa muda (MANTER)
useEffect(() => {
  if (selectedConversationId !== previousConversationIdRef.current) {
    resetStream();
    previousConversationIdRef.current = selectedConversationId;
  }
}, [selectedConversationId, resetStream]);
```

---

### Fase 3: Refatorar DashboardLayout.tsx (30min)

#### 3.1 Usar Hook ao Invés de setLocation Direto

**Arquivo**: `client/src/components/DashboardLayout.tsx`

```diff
+ import { useConversationId } from '@/hooks/useConversationId';

function DashboardLayout() {
-  const [location, setLocation] = useLocation();
+  const [, setConversationId] = useConversationId();

  // Criar nova conversa
  onSuccess: (data) => {
-    setLocation(`/david?c=${data.id}`);
+    setConversationId(data.id);
  }

  // Clicar em conversa
  onClick={() => {
-    setLocation(`/david?c=${conv.id}`);
+    setConversationId(conv.id);
  }}

  // Nova conversa (limpar seleção)
-  setLocation("/david");
+  setConversationId(null);
}
```

---

### Fase 4: Testes de Integração (1h)

#### 4.1 Teste E2E do Fluxo de Upload

**Arquivo**: `client/src/pages/David.e2e.test.ts`

```typescript
describe('Fluxo de Upload de PDF', () => {
  it('deve criar conversa, anexar PDF e não entrar em loop', async () => {
    // 1. Arrastar PDF
    // 2. Verificar criação de conversa
    // 3. Verificar que URL foi atualizada
    // 4. Verificar que não há loops (monitorar re-renders)
    // 5. Enviar primeira mensagem
  });
});
```

---

## 🧪 Validação

### Checklist de Testes

- [ ] Hook `useConversationId` funciona isoladamente
- [ ] Criar nova conversa atualiza URL corretamente
- [ ] Clicar em conversa na sidebar navega corretamente
- [ ] Upload de PDF não causa loop
- [ ] Voltar/avançar no navegador funciona
- [ ] Compartilhar link com `?c=123` abre conversa correta
- [ ] Não há mais erros "Maximum update depth"
- [ ] Não há mais erros "Conversa não encontrada"

### Métricas de Sucesso

| Métrica | Antes | Depois | Meta |
|---------|-------|--------|------|
| **useEffects em David.tsx** | 14 | < 8 | ⬇️ 50% |
| **Re-renders por navegação** | ~50-100 | < 3 | ⬇️ 95% |
| **Tempo para estabilizar** | ∞ (loop) | < 100ms | ✅ |
| **Fontes de verdade** | 5 | 1 | ⬇️ 80% |

---

## 🚀 Implementação Incremental

### Sprint 1 (Hoje - 4h)

1. ✅ Criar hook `useConversationId` + testes
2. ✅ Refatorar `David.tsx` (remover polling e sincronização)
3. ✅ Refatorar `DashboardLayout.tsx`
4. ✅ Testes manuais de upload de PDF

### Sprint 2 (Amanhã - 2h)

5. ✅ Testes E2E automatizados
6. ✅ Monitoramento de re-renders (React DevTools Profiler)
7. ✅ Deploy em staging + validação com usuário real

---

## 📊 Análise de Risco

### Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Quebrar navegação** | Média | Alto | Testes E2E abrangentes |
| **URLs não funcionarem** | Baixa | Alto | Validação com regex + testes |
| **wouter não detectar mudanças** | Baixa | Médio | Usar `location` do hook |
| **Refs ficarem desatualizados** | Baixa | Baixo | Remover refs desnecessários |

### Plano de Rollback

```typescript
// Se houver problema crítico:
git revert <commit-hash>
git push origin main --force

// Ou feature flag:
const USE_NEW_NAVIGATION = process.env.VITE_USE_NEW_NAV === 'true';

if (USE_NEW_NAVIGATION) {
  const [id, setId] = useConversationId();
} else {
  const [id, setId] = useState(...); // Código antigo
}
```

---

## 🎯 Próximos Passos (Pós-Correção)

### Prioridade Média (Após resolver loop)

1. **Refatorar processDocumentsRouter**
   - Aplicar mesmo padrão de Services
   - Separar upload, extração e vinculação

2. **Implementar Cache de RAG**
   - Redis para resultados de busca vetorial
   - Invalidação inteligente por mudança de docs

3. **Processamento Assíncrono de PDF**
   - Fila BullMQ para uploads grandes
   - WebSocket para notificação de conclusão

4. **Dependency Injection**
   - InversifyJS ou similar
   - Facilitar mocking nos testes

---

## 📝 Notas Técnicas

### Por que o Polling Falha?

```typescript
// ❌ ANTI-PATTERN
useEffect(() => {
  const interval = setInterval(checkUrl, 100);
  return () => clearInterval(interval);
}, [urlSearch]); // ← Recria interval a cada mudança de urlSearch
```

**Problema**:
1. `urlSearch` muda
2. Effect re-executa
3. Cria novo interval
4. Interval antigo continua rodando (leak)
5. 10 checks/segundo viram 100, depois 1000...

### Por que URL Como Fonte de Verdade?

1. **Persistência**: Funciona com F5, voltar/avançar
2. **Compartilhamento**: Links diretos funcionam
3. **Debugging**: Estado visível na barra de endereço
4. **SEO**: URLs significativas
5. **Simplicidade**: Menos estado = menos bugs

---

**Documento gerado automaticamente pela análise do loop**
**Baseado no relatório**: `arquivos teste/analise_erro_loop.md`
