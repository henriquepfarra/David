# Beta Readiness - David Ghostwriter

**Data de Criação**: 27/01/2026
**Status**: Em Produção (Railway)

---

## Resumo Executivo

Este documento detalha as melhorias implementadas para preparar o David para uso em produção (beta), incluindo segurança de API keys, monitoramento de erros e recomendações para escalabilidade futura.

---

## Trabalho Concluído

### 1. Segurança de API Keys

**Problema identificado**: O sistema usava a chave do desenvolvedor (ENV.geminiApiKey) como fallback quando o usuário não tinha chave configurada, causando custos não planejados.

**Solução implementada**:

| Funcionalidade | Antes | Depois |
|----------------|-------|--------|
| Chat LLM (sendMessage) | Fallback para ENV.geminiApiKey | Requer chave do usuário |
| Extração de Teses | Fallback para ENV.geminiApiKey | Requer chave do usuário |
| Extração de PDF | Fallback para ENV.geminiApiKey | Requer chave do usuário |
| Geração de Títulos | Chave do usuário | Chave do sistema (baixo custo, UX) |
| Enhance Prompt | Sem chave definida | Chave do sistema (baixo custo, UX) |
| Transcrição de Áudio | Disponível | Desabilitado para beta |

**Arquivos modificados**:
- `server/_core/llm.ts` - Removido fallback perigoso
- `server/titleGenerator.ts` - Usa explicitamente ENV.geminiApiKey
- `server/services/enhancePrompt.ts` - Usa explicitamente ENV.geminiApiKey
- `server/routers/davidRouter.ts` - Validação de API key obrigatória
- `server/thesisExtractor.ts` - Requer apiKey como parâmetro

**Feature Flag adicionada**:
```typescript
// shared/const.ts
export const FEATURES = {
  AUDIO_TRANSCRIPTION: false, // Desabilitado para beta
};
```

**Commit**: `4bb4a42` - fix(security): enforce user API key for LLM calls, add beta feature flags

---

### 2. Monitoramento de Erros (Sentry)

**Problema identificado**: Sem visibilidade de erros em produção.

**Solução implementada**: Integração completa com Sentry para frontend e backend.

#### Frontend (`client/src/main.tsx`)
- Inicialização do Sentry com DSN via variável de ambiente
- ErrorBoundary React para capturar erros não tratados
- Captura de erros tRPC (queries e mutations)
- Filtragem de erros de autenticação (não envia para Sentry)
- Remoção de cookies antes do envio (privacidade)

#### Backend (`server/_core/index.ts`)
- Sentry inicializado antes de outros imports
- Captura de erros em streaming LLM
- Captura de erros 5xx no error handler global
- Remoção de headers sensíveis (cookie, authorization)
- Habilitado apenas em produção

**Variáveis de ambiente**:
```bash
# Backend (Node.js)
SENTRY_DSN="https://..."

# Frontend (Vite - prefixo VITE_ obrigatório)
VITE_SENTRY_DSN="https://..."
```

**Commit**: `6cc1304` - feat(monitoring): add Sentry error tracking for frontend and backend

---

## Trabalho Futuro (Pós-Beta)

### Prioridade Alta

#### 1. Rate Limiting por Usuário
**Quando implementar**: Quando houver abuso ou custos elevados

```typescript
// Sugestão de implementação
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por janela
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});

app.use('/api/', apiLimiter);
```

#### 2. Health Check Endpoint
**Quando implementar**: Para monitoramento de uptime

```typescript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: 'connected', // verificar conexão
  });
});
```

#### 3. Backup de Banco de Dados
**Quando implementar**: Imediatamente em produção

- Railway oferece backups automáticos para MySQL
- Configurar retenção de 7-30 dias
- Testar processo de restore periodicamente

---

### Prioridade Média

#### 4. Logs Estruturados
**Quando implementar**: Para debugging em produção

```typescript
// Sugestão: usar winston ou pino
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : { target: 'pino-pretty' }
});

// Uso
logger.info({ userId, action: 'message_sent' }, 'User sent message');
```

#### 5. Métricas de Uso
**Quando implementar**: Para entender padrões de uso

Métricas sugeridas:
- Mensagens por usuário/dia
- Tokens consumidos por usuário
- Tempo de resposta médio
- Taxa de erro por endpoint
- Uso de features (teses, análise, etc.)

#### 6. Testes E2E Automatizados
**Quando implementar**: Antes de grandes releases

Framework sugerido: Playwright (já instalado)

Cenários críticos:
- Login → Chat → Enviar mensagem
- Upload de PDF → Análise
- Configurar chave API → Usar chat

---

### Prioridade Baixa (Escala)

#### 7. Cache de Respostas
**Quando implementar**: Se latência for problema

```typescript
// Redis para cache de respostas frequentes
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache de títulos gerados, prompts enhanced, etc.
const cacheKey = `title:${hash(message)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

#### 8. CDN para Assets Estáticos
**Quando implementar**: Se tiver muitos usuários globais

- Cloudflare (gratuito)
- AWS CloudFront
- Vercel Edge

#### 9. Separação de Serviços
**Quando implementar**: Se precisar escalar componentes independentemente

```
Arquitetura atual (monolito):
┌─────────────────────────────┐
│ Express Server              │
│ ├─ API Routes               │
│ ├─ tRPC                     │
│ ├─ Streaming LLM            │
│ └─ Static Files             │
└─────────────────────────────┘

Arquitetura futura (se necessário):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ API Server   │  │ LLM Worker   │  │ Static CDN   │
│ (Express)    │  │ (Queue-based)│  │ (Cloudflare) │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Guia de Escalabilidade

### Fase 1: 1-50 Usuários (Atual)
- Monolito no Railway
- MySQL único
- Sentry para erros
- **Custo estimado**: ~$20-50/mês

### Fase 2: 50-500 Usuários
Adicionar:
- [ ] Rate limiting
- [ ] Health checks
- [ ] Logs estruturados
- [ ] Backup automático
- [ ] Métricas básicas
- **Custo estimado**: ~$100-200/mês

### Fase 3: 500-5000 Usuários
Adicionar:
- [ ] Redis para cache/sessions
- [ ] CDN para assets
- [ ] Múltiplas instâncias (load balancer)
- [ ] Monitoramento avançado (APM)
- [ ] Database read replicas
- **Custo estimado**: ~$500-1500/mês

### Fase 4: 5000+ Usuários
Considerar:
- [ ] Kubernetes ou similar
- [ ] Microserviços para LLM
- [ ] Database sharding
- [ ] Multi-região
- [ ] Time de DevOps dedicado
- **Custo estimado**: $3000+/mês

---

## Checklist de Deploy

### Antes de cada deploy:
- [ ] Testes passando (`pnpm test`)
- [ ] TypeCheck passando (`pnpm check`)
- [ ] Build sem erros (`pnpm build`)
- [ ] Variáveis de ambiente configuradas no Railway

### Variáveis de ambiente obrigatórias:
```bash
# Core
DATABASE_URL="mysql://..."
JWT_SECRET="..." # mínimo 32 caracteres

# Sentry (recomendado)
SENTRY_DSN="https://..."
VITE_SENTRY_DSN="https://..."

# LLM (sistema - para features de baixo custo)
GEMINI_API_KEY="AIza..."
```

### Variáveis de ambiente opcionais:
```bash
# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Config
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS="https://seu-dominio.com"
```

---

## Referências

- [Sentry Dashboard](https://sentry.io)
- [Railway Dashboard](https://railway.app)
- [Google AI Studio](https://aistudio.google.com/app/apikey) - Obter GEMINI_API_KEY
- [docs/reports/MVP_ROADMAP.md](./MVP_ROADMAP.md) - Roadmap de funcionalidades

---

**Documento mantido por**: Equipe David
**Última atualização**: 27/01/2026
