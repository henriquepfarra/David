# Walkthrough: Correções de RAG, Performance e UX

## Resumo Geral
Esta sessão focou em resolver problemas críticos de UX e performance no David, incluindo filtros de RAG, hierarquia de súmulas, mensagens de status dinâmicas, e eliminação completa do "piscar" visual ao finalizar streaming.

---

## 1. Correções de Hierarquia RAG

### Problema
O sistema priorizava `autorityLevel` (Vinculante > STF > STJ) sobre similaridade semântica, fazendo com que súmulas STF menos relevantes aparecessem antes de súmulas STJ mais relevantes.

### Solução
**Arquivo:** [`RagService.ts`](file:///Users/henriquefarra/David/David/server/services/RagService.ts)

- **Nova estratégia:** Ordenar por **similaridade primeiro**, hierarquia só para resolver conflitos de súmulas com mesmo número
- Removido sort por `authorityLevel` antes da similaridade
- Mantido `resolveConflicts()` para casos onde Súmula Vinculante e Súmula comum têm mesmo número

```diff
- // Ordenar por: 1) autoridade, 2) similaridade
- const sorted = rawResults.sort((a, b) => {
-     if (a.authorityLevel !== b.authorityLevel) {
-         return a.authorityLevel - b.authorityLevel;
-     }
-     return b.similarity - a.similarity;
- });
+ // Ordenar APENAS por similaridade (maior = melhor)
+ const sorted = rawResults.sort((a, b) => b.similarity - a.similarity);
```

**Resultado:** Súmulas STJ agora aparecem primeiro quando são mais relevantes semanticamente.

---

## 2. Filtro Específico por Tribunal

### Problema
Quando usuário perguntava "súmulas STJ sobre X", o sistema retornava mistura de STF/STJ sem priorizar o tribunal solicitado.

### Solução
**Arquivo:** [`IntentService.ts`](file:///Users/henriquefarra/David/David/server/services/IntentService.ts)

- Adicionados padrões regex para detectar "súmula STJ" ou "súmula STF"
- Novo campo `ragFilter` no resultado da classificação
- Mapeamento no endpoint para converter filtro em `filterTypes` específicos

**Arquivo:** [`server/_core/index.ts`](file:///Users/henriquefarra/David/David/server/_core/index.ts)

```typescript
const filterMap: Record<string, string[]> = {
  STF_STJ: ["sumula_stf", "sumula_stj", "sumula_vinculante"],
  STF: ["sumula_stf", "sumula_vinculante"],
  STJ: ["sumula_stj"],  // ← Filtro específico
  STF_ONLY: ["sumula_stf"],
};
```

**Resultado:** Perguntas específicas sobre STJ só retornam súmulas STJ.

---

## 3. Bloqueio de "DIAGNÓSTICO DE LEITURA" em Modo Abstrato

### Problema
O modelo gerava "DIAGNÓSTICO DE LEITURA: ..." mesmo em perguntas abstratas (sem documentos anexados).

### Solução
**Arquivo:** [`ContextBuilder.ts`](file:///Users/henriquefarra/David/David/server/services/ContextBuilder.ts)

- Modificado `addAllCore()` para aceitar `{ skipGatekeeper: true }`
- `createBuilderForIntent()` detecta se Motor A está ativo
- `createAbstractBuilder()` adiciona instrução explícita bloqueando diagnóstico

```typescript
builder.addSection("NO_DIAGNOSTICO", 
    `**INSTRUÇÃO CRÍTICA:** Esta é uma consulta jurídica abstrata (sem documentos anexados). ` +
    `NÃO gere "DIAGNÓSTICO DE LEITURA" ou "RESPOSTA TÉCNICA" formatada. ` +
    `Responda de forma direta e objetiva, como um assistente jurídico respondendo uma pergunta conceitual.`
);
```

**Resultado:** Consultas abstratas não geram mais diagnóstico técnico.

---

## 4. Mensagens de Status Dinâmicas

### Problema
Mensagem fixa "Só um segundo..." ou "Pensando..." durante todo o loading, dando impressão de sistema travado.

### Solução
**Arquivo:** [`useChatStream.ts`](file:///Users/henriquefarra/David/David/client/src/hooks/useChatStream.ts)

- Adicionado estado `statusMessage` ao hook
- Implementado rotação automática de mensagens a cada 2 segundos:
  - "Conectando..."
  - "Analisando sua solicitação..."
  - "Pesquisando base de dados..."
  - "Consultando jurisprudência..."
  - "Cruzando informações..."
  - "Verificando precedentes..."
  - "Processando resposta..."

**Arquivo:** [`David.tsx`](file:///Users/henriquefarra/David/David/client/src/pages/David.tsx)

```tsx
// Antes
<span>Só um segundo...</span>

// Depois
<span>{statusMessage}</span>
```

**Resultado:** UI dinâmica que transmite sensação de atividade contínua.

---

## 5. Eliminação Completa do "Piscar" ao Finalizar Streaming

### Problema Identificado
Através de browser testing, descobrimos que `isStreaming` era setado para `false` **ANTES** de `refetchMessages()` completar, causando um gap visual:

1. Stream termina → `isStreaming = false`
2. Mensagem streaming **desaparece**
3. `refetchMessages()` ainda rodando... ← **GAP VISUAL**
4. Mensagens do banco aparecem

### Logs de Diagnóstico
```
[DEBUG] isStreaming antes refetch: false  ← Problema!
[DEBUG] Refetch completo
[DEBUG] Mensagens após refetch: 4
```

### Solução Final
**Arquivo:** [`useChatStream.ts`](file:///Users/henriquefarra/David/David/client/src/hooks/useChatStream.ts)

- Removido `setIsStreaming(false)` do evento `type: "done"` no hook
- Deixado apenas o callback `onDone()` ser chamado

**Arquivo:** [`David.tsx`](file:///Users/henriquefarra/David/David/client/src/pages/David.tsx)

- Movido `resetStream()` para DEPOIS de `await refetchMessages()`
- Nova sequência:
  1. Stream termina → `onDone` chamado
  2. `refetchMessages()` executa → mensagens do banco carregam
  3. `resetStream()` chamado → `isStreaming = false`
  4. **Transição suave sem gap!**

```typescript
await performStream(conversationId, content, {
  onDone: async () => {
    // Buscar novas mensagens do banco (inclui a que acabou de ser salva)
    await refetchMessages();
    
    // AGORA resetar o stream - mensagens do banco já estão carregadas
    // Isso elimina o gap visual entre isStreaming=false e mensagens do banco
    resetStream();
    setPendingUserMessage(null);
  },
});
```

**Resultado:** Transição completamente suave, sem piscar ou gap visual.

---

## 6. Otimizações de Performance (React Query)

**Arquivo:** [`David.tsx`](file:///Users/henriquefarra/David/David/client/src/pages/David.tsx)

- `staleTime`: 1s → 30s (reduz refetches desnecessários)
- `refetchOnMount: false`
- `refetchOnReconnect: false`
- `refetchOnWindowFocus: false`

**Resultado:** Menos re-renders e melhor performance percebida.

---

## Resumo de Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| [`RagService.ts`](file:///Users/henriquefarra/David/David/server/services/RagService.ts) | Ordenação por similaridade primeiro |
| [`IntentService.ts`](file:///Users/henriquefarra/David/David/server/services/IntentService.ts) | Padrões STJ/STF específicos |
| [`server/_core/index.ts`](file:///Users/henriquefarra/David/David/server/_core/index.ts) | Mapeamento de filterTypes |
| [`ContextBuilder.ts`](file:///Users/henriquefarra/David/David/server/services/ContextBuilder.ts) | skipGatekeeper + NO_DIAGNOSTICO |
| [`useChatStream.ts`](file:///Users/henriquefarra/David/David/client/src/hooks/useChatStream.ts) | statusMessage dinâmico + timing fix |
| [`David.tsx`](file:///Users/henriquefarra/David/David/client/src/pages/David.tsx) | resetStream após refetch |

---

## Testes Realizados

1. ✅ **Browser testing pessoal** com logs de diagnóstico
2. ✅ Verificação de logs do servidor mostrando filtros corretos
3. ✅ TypeCheck passou em todas as alterações
4. ✅ Confirmação do usuário: problema resolvido

---

## Resultado Final

- ✅ RAG retorna súmulas corretas por tribunal
- ✅ Hierarquia funciona corretamente (similaridade > autoridade)  
- ✅ Mensagens de status dinâmicas melhoram percepção de performance
- ✅ **Zero "piscar" visual ao finalizar streaming**
- ✅ UI polida e profissional
