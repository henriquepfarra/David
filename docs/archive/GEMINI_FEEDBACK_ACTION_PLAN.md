# 📋 Plano de Ação: Feedback do Gerente Gemini

**Data**: 12/01/2026
**Revisor**: Gerente Gemini
**Status**: 🚧 Em Implementação

---

## 🎯 Visão Geral

Este documento consolida as observações do Gemini sobre a refatoração recente e define um plano de ação estruturado para resolver os problemas críticos e implementar melhorias arquiteturais.

---

## 🔴 Prioridade CRÍTICA

### 1. Loop de Estado no Frontend ("Loop da Morte")

**Status**: ✅ **EM CORREÇÃO**

#### Problema
```
Maximum update depth exceeded.
TRPCClientError: Conversa não encontrada
```

#### Causa Raiz
Race Condition entre:
- Estado React (`selectedConversationId`)
- URL (`?c=123`)
- Polling de query string (100ms)
- Múltiplas refs

#### Impacto
⚠️ **SEVERO**: Inutiliza a aplicação para usuários em fluxos de upload de PDF.

#### Solução Implementada
✅ **Single Source of Truth**: URL como única fonte de verdade

**Arquivos Criados**:
- `LOOP_FIX_PLAN.md` - Plano detalhado de correção
- `client/src/hooks/useConversationId.ts` - Hook customizado

**Próximos Passos**:
1. ✅ Hook criado
2. ⏳ Refatorar `David.tsx` (remover polling + sincronização bidirecional)
3. ⏳ Refatorar `DashboardLayout.tsx`
4. ⏳ Testes E2E do fluxo de upload

**Previsão de Conclusão**: Hoje (4h)

**Documentação**: Ver `LOOP_FIX_PLAN.md` para detalhes técnicos.

---

### 2. Singleton em Node.js

**Status**: ✅ **VERIFICADO - SEM RISCOS**

#### Observação do Gemini
> "Singletons podem ser problemáticos se mantiverem estado (stateful)"

#### Análise
Os services refatorados (`MessageService`, `ConversationService`, `PromptBuilder`) são **stateless**:

```typescript
// ✅ SAFE: Apenas métodos, sem estado da requisição
export class MessageService {
  async saveUserMessage(params) {
    // Não armazena userId ou conversationId como propriedade
    // Todos os dados vêm dos parâmetros
  }
}
```

#### Validação
- ✅ Nenhum service armazena `userId` como propriedade
- ✅ Nenhum service mantém cache de requisições anteriores
- ✅ Singleton usado apenas para economia de instanciação

#### Ação
✅ **Nenhuma ação necessária** - Padrão está correto para services stateless.

**Nota**: Se futuramente implementarmos cache interno (ex: `PromptBuilder` com cache de RAG), migrar para DI com escopo de requisição.

---

## 🟡 Prioridade MÉDIA

### 3. Refatorar processDocumentsRouter

**Status**: ⏳ **PLANEJADO**

#### Contexto
O relatório `REFACTORING_GOD_FUNCTIONS_REPORT.md` menciona este arquivo como candidato para aplicar o mesmo padrão de Services.

#### Razão
- Processamento de PDF é pesado e propenso a falhas
- Lógica complexa misturada com rotas (viola SRP)
- Difícil de testar isoladamente

#### Plano de Ação

**Fase 1: Análise** (1h)
- Mapear responsabilidades atuais do router
- Identificar god functions (>100 linhas)
- Definir interfaces dos services

**Fase 2: Criação de Services** (3h)
- `PdfProcessorService`: Extração de texto + metadata
- `ProcessRegistrationService`: Criação/atualização de processos
- `DocumentStorageService`: Upload para Google Drive
- Testes unitários (100% cobertura)

**Fase 3: Refatoração do Router** (2h)
- Substituir lógica por chamadas aos services
- Manter apenas orquestração
- Testes de integração

**Fase 4: Validação** (1h)
- Testes E2E de upload
- Performance benchmarking
- Deploy em staging

**Arquivos a Criar**:
```
server/services/
├── PdfProcessorService.ts
├── ProcessRegistrationService.ts
├── DocumentStorageService.ts
└── __tests__/
    ├── PdfProcessorService.test.ts
    ├── ProcessRegistrationService.test.ts
    └── DocumentStorageService.test.ts
```

**Previsão**: Sprint Atual (7h = ~1 dia)

---

### 4. Dependency Injection Real

**Status**: 📝 **DOCUMENTADO PARA FUTURO**

#### Observação do Gemini
> "Utilizar um container de DI (InversifyJS) facilita ainda mais os testes"

#### Análise

**Estado Atual**:
```typescript
// Dynamic imports + Singleton manual
const { getConversationService } = await import('./services/ConversationService');
const service = getConversationService();
```

**Proposta**:
```typescript
// Com InversifyJS
@injectable()
class ConversationService {
  constructor(
    @inject(TYPES.Database) private db: Database,
    @inject(TYPES.Logger) private logger: Logger
  ) {}
}

// No router
const service = container.get<ConversationService>(TYPES.ConversationService);
```

#### Benefícios
- ✅ Mocking mais fácil (sem `vi.mock`)
- ✅ Dependências explícitas (no constructor)
- ✅ Testes mais rápidos (sem imports dinâmicos)
- ✅ Escopo configurável (singleton, transient, request-scoped)

#### Quando Implementar?
**Critério**: Quando tivermos > 10 services ou precisarmos de request-scoped cache.

**Estimativa**: Sprint Futuro (2-3 dias)

---

### 5. Otimização de Performance (Cache de RAG)

**Status**: 📝 **DOCUMENTADO**

#### Observação do Gemini
> "Implementar cache (Redis) para resultados de busca vetorial"

#### Problema Atual
```typescript
// A CADA pergunta do usuário, busca no banco vetorial
const ragService = getRagService();
const context = await ragService.buildKnowledgeBaseContext(userId, query);
// ↑ 200-500ms por busca
```

**Cenário Problemático**:
- Usuário pergunta 5 vezes sobre o mesmo processo
- Mesmos documentos são buscados 5 vezes
- 5 × 300ms = 1.5s desperdiçado

#### Solução: Cache em Camadas

##### Camada 1: In-Memory (Implementação Simples)
```typescript
// server/services/PromptBuilder.ts
class PromptBuilder {
  private cache = new Map<string, { data: any, expiry: number }>();

  async buildContexts(params: BuildContextsParams) {
    const cacheKey = `${params.userId}-${params.processId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiry) {
      return cached.data; // Hit: < 1ms
    }

    const data = await this.fetchFromDatabase(...);
    this.cache.set(cacheKey, { data, expiry: Date.now() + 300000 }); // 5min
    return data;
  }
}
```

**Ganho**: 200-500ms → < 1ms (300x mais rápido)
**Trade-off**: Consumo de memória (~50MB para 1000 conversas ativas)

##### Camada 2: Redis (Produção/Escala)
```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

async buildContexts(params: BuildContextsParams) {
  const cacheKey = `rag:${params.userId}:${params.processId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const data = await this.fetchFromDatabase(...);
  await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5min TTL
  return data;
}
```

**Ganho**: Compartilhado entre instâncias do servidor
**Trade-off**: Latência de rede (~5-10ms)

##### Camada 3: Invalidação Inteligente
```typescript
// Invalidar cache quando:
// 1. Documento novo adicionado ao processo
onDocumentUpload(processId) {
  redis.del(`rag:*:${processId}`); // Wildcard delete
}

// 2. Knowledge base atualizada
onKnowledgeBaseUpdate(userId) {
  redis.del(`rag:${userId}:*`);
}

// 3. Máximo 5 minutos (TTL automático)
```

#### Implementação

**Fase 1: In-Memory Cache** (2h)
- Adicionar `Map<string, CachedData>` no PromptBuilder
- LRU eviction (max 1000 entries)
- Testes unitários

**Fase 2: Redis (Produção)** (4h)
- Setup Redis (Railway/Upstash)
- Migrar cache para Redis
- Monitoramento (hit rate)

**Fase 3: Invalidação** (2h)
- Hooks em uploads de docs
- Invalidação em batch

**Previsão**: Sprint Futuro (8h = 1 dia)

**Ganho Esperado**: 30-50% redução em latência p95 de respostas

---

### 6. Processamento Assíncrono de PDF

**Status**: 📝 **DOCUMENTADO PARA FUTURO**

#### Observação do Gemini
> "Mover extração de PDF para fila de background (BullMQ)"

#### Problema Atual
```
Cliente → Upload PDF (5MB) → Servidor processa → 30s → Cliente recebe resposta
                                    ↑
                            Timeout em 20s = ❌ FALHA
```

#### Solução: Processamento Assíncrono

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO ASSÍNCRONO                         │
└─────────────────────────────────────────────────────────────┘

1. Cliente → Upload PDF → Servidor
   ├─ Salva arquivo
   ├─ Cria job na fila
   └─ Retorna: { status: "processing", jobId: "abc123" }
        ↓ (Cliente: 200ms)

2. Worker (Background) → Processa PDF
   ├─ Extrai texto (OCR)
   ├─ Extrai metadata
   ├─ Gera embeddings
   └─ Atualiza banco: status = "done"
        ↓ (30-60s em background)

3. Cliente → Polling/WebSocket
   ├─ GET /api/jobs/abc123 → { status: "done", result: {...} }
   └─ Ou: WebSocket push → { type: "job_complete", jobId: "abc123" }
```

#### Implementação

**Stack**:
- **BullMQ**: Gerenciamento de filas
- **Redis**: Backend para BullMQ
- **Socket.io**: Notificações em tempo real (opcional)

**Fase 1: Setup BullMQ** (3h)
```typescript
// server/queues/pdfProcessor.ts
import { Queue, Worker } from 'bullmq';

export const pdfQueue = new Queue('pdf-processing', {
  connection: { host: 'localhost', port: 6379 }
});

export const pdfWorker = new Worker('pdf-processing', async (job) => {
  const { fileUri, userId } = job.data;

  // Processar PDF
  const text = await extractText(fileUri);
  const metadata = await extractMetadata(text);

  // Salvar no banco
  await saveProcessMetadata(userId, metadata);

  return { success: true, processId: metadata.id };
});
```

**Fase 2: Endpoint de Upload** (2h)
```typescript
// server/davidRouter.ts
uploadPdfAsync: protectedProcedure
  .mutation(async ({ ctx, input }) => {
    const fileUri = await uploadToStorage(input.file);

    const job = await pdfQueue.add('extract', {
      fileUri,
      userId: ctx.user.id,
    });

    return { jobId: job.id, status: 'processing' };
  });
```

**Fase 3: Endpoint de Status** (1h)
```typescript
checkJobStatus: protectedProcedure
  .input(z.object({ jobId: z.string() }))
  .query(async ({ input }) => {
    const job = await pdfQueue.getJob(input.jobId);
    return {
      status: await job.getState(), // 'waiting' | 'active' | 'completed' | 'failed'
      result: job.returnvalue,
      progress: job.progress,
    };
  });
```

**Fase 4: Frontend (Polling)** (2h)
```typescript
// client/src/hooks/usePdfUpload.ts
export function usePdfUpload() {
  const uploadMutation = trpc.uploadPdfAsync.useMutation();

  const upload = async (file: File) => {
    const { jobId } = await uploadMutation.mutateAsync({ file });

    // Polling a cada 2s
    const checkStatus = async () => {
      const status = await trpc.checkJobStatus.query({ jobId });
      if (status.status === 'completed') {
        toast.success('PDF processado!');
        return status.result;
      } else if (status.status === 'failed') {
        toast.error('Erro ao processar PDF');
      } else {
        setTimeout(checkStatus, 2000);
      }
    };

    checkStatus();
  };

  return { upload };
}
```

**Previsão**: Sprint Futuro (8h = 1 dia)

**Benefícios**:
- ✅ Sem timeouts em uploads grandes
- ✅ UX melhor (feedback de progresso)
- ✅ Servidor não bloqueia em operações longas
- ✅ Retry automático em falhas

---

## 📊 Resumo Executivo

### Problemas Críticos (Resolver Hoje)

| # | Problema | Impacto | Status | ETA |
|---|----------|---------|--------|-----|
| 1 | Loop de Estado Frontend | 🔴 Bloqueante | ✅ Em correção | 4h |

### Melhorias Arquiteturais (Próximos Sprints)

| # | Melhoria | Benefício | Complexidade | Prioridade |
|---|----------|-----------|--------------|------------|
| 3 | Refatorar processDocumentsRouter | Testabilidade, manutenibilidade | Média | 🟡 Alta |
| 5 | Cache de RAG | 30-50% ⬇️ latência | Baixa | 🟡 Média |
| 6 | Processamento Assíncrono PDF | Sem timeouts, melhor UX | Alta | 🟢 Média |
| 4 | Dependency Injection | Melhor DX (testes) | Média | 🟢 Baixa |

### Timeline Proposto

```
┌─────────────────────────────────────────────────────────────┐
│                    ROADMAP (3 SPRINTS)                      │
└─────────────────────────────────────────────────────────────┘

Sprint Atual (Esta Semana)
├─ ✅ Refatoração de God Functions (CONCLUÍDO)
├─ 🚧 Correção de Loop de Estado (Hoje - 4h)
└─ 🎯 Refatorar processDocumentsRouter (Restante da semana - 7h)

Sprint 2 (Próxima Semana)
├─ Cache de RAG (In-Memory) - 2h
├─ Cache de RAG (Redis) - 4h
└─ Invalidação de Cache - 2h

Sprint 3 (Semana Seguinte)
├─ Setup BullMQ + Redis - 3h
├─ Processamento Assíncrono PDF - 5h
└─ (Opcional) Dependency Injection - 16h
```

---

## 🎓 Lições Aprendidas

### Do Feedback do Gemini

1. **Análise Crítica**: O Gemini identificou corretamente problemas estruturais (loop de estado, processDocumentsRouter)

2. **Priorização Correta**: Separou problemas críticos (bloqueantes) de melhorias arquiteturais (incrementais)

3. **Soluções Pragmáticas**: Não sugeriu over-engineering, mas melhorias incrementais com ROI claro

4. **Validação de Padrões**: Confirmou que Singleton stateless está correto (não é sempre um anti-pattern)

### Para Futuras Refatorações

1. ✅ **Sempre testar fluxos críticos** (upload, criação de conversa) após mudanças grandes
2. ✅ **Monitorar re-renders** em componentes complexos (React DevTools Profiler)
3. ✅ **Documentar decisões arquiteturais** (por que escolhemos X ao invés de Y)
4. ✅ **Cache primeiro, escala depois** (in-memory antes de Redis)
5. ✅ **Assíncrono para operações > 5s** (não bloquear thread principal)

---

## 📞 Próximos Passos Imediatos

### Hoje (Próximas 4h)

1. ✅ Implementar correção do loop de estado
   - ✅ Hook `useConversationId` criado
   - ⏳ Refatorar `David.tsx`
   - ⏳ Refatorar `DashboardLayout.tsx`
   - ⏳ Testes E2E

2. 📝 Documentar decisões de arquitetura
   - ⏳ Adicionar ADR (Architecture Decision Record) para Single Source of Truth

3. ✅ Commit e push das correções
   - ⏳ Mensagem de commit detalhada
   - ⏳ Link para `LOOP_FIX_PLAN.md` e este documento

### Amanhã (Validação)

4. 🧪 Testes em staging com usuários reais
   - Upload de PDF
   - Navegação entre conversas
   - Voltar/avançar no navegador

5. 📊 Monitoramento de métricas
   - Re-renders por ação
   - Tempo de estabilização
   - Taxa de erro "Maximum update depth"

---

**Documento gerado em resposta ao feedback do Gerente Gemini**
**Autor**: Claude Sonnet 4.5
**Data**: 12/01/2026
