# Correções Pendentes - David MVP

**Última atualização:** 2026-02-10
**Status:** Preparação para testes com usuários reais
**Score Geral:** 7/10 - Pronto para beta restrito

---

## SCORECARD

| Categoria | Score | Status |
|-----------|-------|--------|
| Segurança | 7/10 | Auth sólida, falta rate limiting |
| Confiabilidade | 7.5/10 | Retry OK, faltam timeouts |
| Estabilidade | 7/10 | Pool DB OK, streaming precisa cleanup |
| Arquitetura | 6.5/10 | Separação clara, davidRouter grande |

---

## PONTOS FORTES (manter)

- [x] Type Safety End-to-End (TypeScript + Zod + Drizzle)
- [x] Autenticação Robusta (Google OAuth + JWT + API keys criptografadas AES-256-GCM)
- [x] Retry Logic (Exponential backoff para falhas temporárias)
- [x] Pool de Conexão (Keep-alive + waitForConnections)
- [x] Error Handling (171 blocos try/catch, TRPCError)
- [x] Separação de Concerns (Services isolados)
- [x] Súmulas no banco de dados (seed executado)

---

## 🔴 PRIORIDADE CRÍTICA (bloqueia produção)

### C1. Rate Limiting Ausente
**Risco:** DoS, brute force de API keys, abuse de recursos
**Impacto:** CRÍTICO - Sistema vulnerável a ataques

**Endpoints expostos sem proteção:**
- POST `/api/david/stream` - Sem limite de requests/segundo
- POST `/api/trpc/settings.listModels` - Sem limite de validações de API key
- GET `/api/oauth/google/login` - Sem limite

**Solução:**
```typescript
// Instalar: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requests por window
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many requests, please try again later' }
});

app.use('/api/', limiter);
```

**Arquivo:** `server/index.ts`
**Status:** [ ] Pendente

---

### C2. Memory Leak em Streaming
**Risco:** Conexões zumbis, Out of Memory
**Impacto:** CRÍTICO - Servidor pode travar com N usuários

**Problema:** `res.write()` acumula dados se cliente desconectar sem cleanup

**Código atual** (index.ts ~linha 562-583):
```typescript
for await (const yieldData of streamFn({...})) {
  res.write(`data: ${JSON.stringify(...)}\n\n`);
}
```

**Solução:**
```typescript
let isClientConnected = true;

res.on('close', () => {
  console.log('[Stream] Client disconnected');
  isClientConnected = false;
});

for await (const yieldData of streamFn({...})) {
  if (!isClientConnected) break;
  res.write(`data: ${JSON.stringify(...)}\n\n`);
}
```

**Arquivo:** `server/index.ts`
**Status:** [ ] Pendente

---

### C3. Timeout em Requisições LLM
**Risco:** Requisições travadas indefinidamente
**Impacto:** CRÍTICO - Recursos bloqueados, UX ruim

**Problema:** Chamadas LLM sem timeout, podem ficar bloqueadas para sempre

**Solução:**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ...
  });
} finally {
  clearTimeout(timeout);
}
```

**Arquivos:** `server/_core/llm.ts`, `server/services/*.ts`
**Status:** [ ] Pendente

---

## 🟠 PRIORIDADE ALTA (importante para estabilidade)

### A1. Content Security Policy (CSP) Headers
**Risco:** XSS, injeção de scripts maliciosos
**Impacto:** ALTO - Segurança do frontend

**Problema:** Sem headers CSP no Express

**Solução:**
```typescript
// npm install helmet
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // ajustar conforme necessário
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
  }
}));
```

**Arquivo:** `server/index.ts`
**Status:** [ ] Pendente

---

### A2. Circuit Breaker para APIs Externas
**Risco:** Cascata de falhas quando Gemini/OpenAI ficam lentos
**Impacto:** ALTO - Sistema inteiro pode degradar

**Problema:** Sem proteção quando APIs externas falham repetidamente

**Solução:**
```typescript
// npm install opossum
import CircuitBreaker from 'opossum';

const options = {
  timeout: 30000, // 30s
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30s antes de tentar novamente
};

const breaker = new CircuitBreaker(callLLM, options);

breaker.on('open', () => console.log('Circuit opened - API failures detected'));
breaker.on('halfOpen', () => console.log('Circuit half-open - testing API'));
breaker.on('close', () => console.log('Circuit closed - API recovered'));
```

**Arquivo:** `server/_core/llm.ts`
**Status:** [ ] Pendente

---

### A3. Validação de URLs (SSRF Prevention)
**Risco:** Server-Side Request Forgery
**Impacto:** ALTO - Acesso a recursos internos

**Problema:** Campo `url` em jurisprudência aceita qualquer string

**Solução:**
```typescript
const urlSchema = z.string().url().refine(
  (url) => {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  },
  { message: 'URL must be http or https' }
);
```

**Arquivo:** `server/routers.ts` (jurisprudence endpoints)
**Status:** [ ] Pendente

---

### A4. Validação de Tamanho de Upload
**Risco:** Upload de arquivos gigantes trava servidor
**Impacto:** ALTO - DoS por upload

**Problema:** `fileData` (base64) sem limite de tamanho

**Código atual** (routers.ts):
```typescript
.input(z.object({
  filename: z.string(),
  fileData: z.string(), // SEM tamanho máximo!
  fileType: z.string(),
}))
```

**Solução:**
```typescript
.input(z.object({
  filename: z.string().max(255),
  fileData: z.string().max(50 * 1024 * 1024, "File too large (max 50MB)"),
  fileType: z.string().max(100),
}))
```

**Arquivo:** `server/routers.ts`
**Status:** [ ] Pendente

---

## 🟡 PRIORIDADE MÉDIA (melhorias importantes)

### M1. Loop de Aprendizado de Teses (FUNCIONALIDADE)
**Problema:** Teses extraídas de minutas aprovadas NÃO são injetadas nas respostas.

**Situação Atual:**
- [x] `ThesisLearningService.processApprovedDraft()` - Extrai teses e salva
- [x] `RagService.searchLegalTheses()` - Busca teses ativas
- [x] `RagService.searchWritingStyle()` - Busca padrões de escrita
- [ ] `ContextBuilder` NÃO chama esses métodos

**Correção necessária em `ContextBuilder.ts`:**
```typescript
// No método build():
if (this.motors.C) {
  const theses = await this.ragService.searchLegalTheses(query, userId);
  context += this.formatTheses(theses);
}
if (this.motors.B) {
  const styles = await this.ragService.searchWritingStyle(query, userId);
  context += this.formatStyles(styles);
}
```

**Arquivo:** `server/services/ContextBuilder.ts`
**Status:** [ ] Pendente

---

### M2. UI de Revisão de Teses (FUNCIONALIDADE)
**Problema:** Componentes existem mas integração incompleta.

**Arquivos existentes:**
- `client/src/pages/Intelligence/PendingTheses.tsx`
- `client/src/pages/Intelligence/ThesisCard.tsx`
- `server/routers/thesisRouter.ts`

**O que falta:**
- [ ] Integrar PendingTheses na página MemoriaDavid
- [ ] Adicionar dialog de edição/aprovação/rejeição
- [ ] Badge no sidebar com contador de pendentes
- [ ] Feedback visual após aprovação/rejeição

**Status:** [ ] Pendente

---

### M3. Refatorar davidRouter.ts (God Object)
**Problema:** 712 linhas, difícil de testar e manter
**Impacto:** MÉDIO - Manutenibilidade

**Solução:** Quebrar em sub-routers:
```
server/routers/
  davidRouter.ts (main - 50 linhas, composição)
  davidChat.ts (conversa + mensagens)
  davidLearning.ts (teses + drafts aprovados)
  davidDocuments.ts (documentos do processo)
```

**Arquivo:** `server/davidRouter.ts`
**Status:** [ ] Pendente

---

### M4. Embedding Storage sem Limite
**Problema:** Vetores de embedding crescem indefinidamente
**Impacto:** MÉDIO - Custo e performance de banco

**Solução:**
- Implementar archiving de embeddings antigos (>6 meses)
- Adicionar paginação em queries de embedding
- Considerar índice vetorial (pgvector ou similar)

**Arquivo:** `drizzle/schema.ts`, `server/services/RagService.ts`
**Status:** [ ] Pendente

---

### M5. Sistema de Módulos Incompleto
**Problema:** Apenas JEC tem implementação real, outros têm `systemPrompt: ''`

**Arquivos:**
- `server/modules/jec/` - Implementado
- `server/modules/familia/` - Vazio
- `server/modules/criminal/` - Vazio
- `server/modules/fazenda/` - Vazio

**Ação:** Implementar prompts específicos OU remover opções do UI

**Status:** [ ] Pendente

---

### M6. Cleanup de Conversas
**Problema:** Conversas abandonadas não são limpas
**Impacto:** MÉDIO - Crescimento de banco

**Solução:**
```typescript
// Adicionar job para limpar conversas sem mensagens > 7 dias
async function cleanupAbandonedConversations() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db.delete(conversations)
    .where(and(
      eq(conversations.messageCount, 0),
      lt(conversations.createdAt, cutoff)
    ));
}
```

**Arquivo:** `server/db.ts` ou novo `server/jobs/cleanup.ts`
**Status:** [ ] Pendente

---

## 🟢 PRIORIDADE BAIXA (melhorias nice-to-have)

### B1. Structured Logging
**Problema:** `console.log` espalhado, difícil de filtrar
**Solução:** Winston ou Pino com níveis e formatação JSON

**Arquivo:** `server/_core/logger.ts`
**Status:** [ ] Pendente

---

### B2. Cobertura de Testes
**Problema:** ~48% de cobertura atual
**Meta:** 80%+ de cobertura

**Foco:**
- [ ] RagService.searchWithHierarchy
- [ ] IntentService
- [ ] ThesisLearningService

**Status:** [ ] Pendente

---

### B3. Cache Invalidation
**Problema:** RagService cache pode servir dados desatualizados (TTL fixo 5min)
**Solução:** Invalidar cache quando knowledgeBase muda

**Arquivo:** `server/services/RagService.ts`
**Status:** [ ] Pendente

---

### B4. Constants Centralizadas
**Problema:** Magic strings espalhadas (`"sumula_stf"`, TTLs hardcoded)
**Solução:** Criar `server/constants.ts` central

**Status:** [ ] Pendente

---

### B5. Análise de Petições
**Problema:** Intent `PETITION_ANALYSIS` existe mas não tem handler dedicado
**Solução:** Criar handler com output estruturado (partes, pedidos, riscos)

**Arquivo:** `server/services/IntentService.ts`
**Status:** [ ] Pendente

---

## CHECKLIST PRÉ-PRODUÇÃO

### Segurança
- [ ] Rate limiting ativo em todos endpoints
- [ ] Timeouts LLM configurados (30s)
- [ ] Memory leak em streaming corrigido
- [ ] CSP headers implementados
- [ ] Validação de tamanho de upload
- [ ] Validação de URLs (SSRF)
- [ ] Circuit breaker em APIs externas

### Funcionalidade
- [ ] Loop de aprendizado de teses funcionando
- [ ] UI de revisão de teses completa
- [ ] Badge de teses pendentes no sidebar

### Estabilidade
- [ ] Cleanup de conversas abandonadas
- [ ] Archiving de embeddings antigos
- [ ] Logging estruturado

### Testes
- [ ] Cobertura 80%+
- [ ] Load testing (100+ usuários simultâneos)

---

## ARQUIVOS CHAVE

**Backend Core:**
- [server/index.ts](server/index.ts) - Entry point, middleware
- [server/davidRouter.ts](server/davidRouter.ts) - Chat principal (712 linhas)
- [server/routers.ts](server/routers.ts) - Endpoints tRPC
- [server/_core/llm.ts](server/_core/llm.ts) - Chamadas LLM

**Services:**
- [server/services/ContextBuilder.ts](server/services/ContextBuilder.ts) - Montagem de prompts
- [server/services/RagService.ts](server/services/RagService.ts) - Busca semântica
- [server/services/ThesisLearningService.ts](server/services/ThesisLearningService.ts) - Aprendizado
- [server/services/IntentService.ts](server/services/IntentService.ts) - Classificação

**Frontend:**
- [client/src/pages/David.tsx](client/src/pages/David.tsx) - Chat UI
- [client/src/pages/Intelligence/PendingTheses.tsx](client/src/pages/Intelligence/PendingTheses.tsx) - Revisão de teses
- [client/src/pages/Configuracoes.tsx](client/src/pages/Configuracoes.tsx) - Settings

**Database:**
- [drizzle/schema.ts](drizzle/schema.ts) - Definição de tabelas
- [server/db.ts](server/db.ts) - CRUD functions

---

## HISTÓRICO DE CORREÇÕES

| Data | Item | Status |
|------|------|--------|
| 2026-02-10 | Filtro de modelos recomendados | ✅ Concluído |
| 2026-02-10 | Toggle "mostrar todos" modelos | ✅ Concluído |
| 2026-02-10 | Seed de súmulas no banco | ✅ Concluído |
