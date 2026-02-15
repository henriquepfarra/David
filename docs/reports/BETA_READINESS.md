# Beta Readiness - David Ghostwriter

**Data de Criação**: 27/01/2026
**Última atualização**: 15/02/2026
**Status**: Em Produção (Railway)

---

## Resumo Executivo

Este documento detalha as melhorias implementadas para preparar o David para uso em produção (beta), incluindo segurança de API keys, monitoramento de erros, sistema de planos e créditos, multi-provider LLM e recomendações para escalabilidade futura.

---

## Trabalho Concluído

### 1. Segurança de API Keys (Jan/2026)

**Problema identificado**: O sistema usava a chave do desenvolvedor (ENV.geminiApiKey) como fallback quando o usuário não tinha chave configurada, causando custos não planejados.

**Solução implementada**:

| Funcionalidade | Antes | Depois |
|----------------|-------|--------|
| Chat LLM (sendMessage) | Fallback para ENV.geminiApiKey | Requer chave do usuário ou plano |
| Extração de Teses | Fallback para ENV.geminiApiKey | Requer chave do usuário |
| Extração de PDF | Fallback para ENV.geminiApiKey | Requer chave do usuário |
| Geração de Títulos | Chave do usuário | Chave do sistema (baixo custo, UX) |
| Enhance Prompt | Sem chave definida | Chave do sistema (baixo custo, UX) |
| Transcrição de Áudio | Disponível | Desabilitado para beta |

**Commit**: `4bb4a42` - fix(security): enforce user API key for LLM calls, add beta feature flags

---

### 2. Monitoramento de Erros - Sentry (Jan/2026)

**Solução implementada**: Integração completa com Sentry para frontend e backend.

#### Frontend (`client/src/main.tsx`)
- Inicialização do Sentry com DSN via variável de ambiente
- ErrorBoundary React para capturar erros não tratados
- Captura de erros tRPC (queries e mutations)
- Filtragem de erros de autenticação (não envia para Sentry)

#### Backend (`server/instrument.ts` + `server/_core/index.ts`)
- Sentry inicializado via `--import ./dist/instrument.js`
- Captura de erros em streaming LLM
- Captura de erros 5xx no error handler global
- Remoção de headers sensíveis (cookie, authorization)

**Commit**: `d3e92d8` - fix: sentry instrumentation and db connection tuning

---

### 3. Estabilidade e Segurança (11/02/2026)

Correções de estabilidade e segurança de alta prioridade:

| Item | Problema | Solução | Arquivo |
|------|----------|---------|---------|
| Memory Leak | Conexões streaming zumbis | `res.on('close')` + flag de controle | `server/_core/index.ts` |
| LLM Timeouts | Requisições travadas | AbortController 30s | `server/_core/llm.ts` |
| CSP Headers | Vulnerável a XSS | Helmet.js com diretivas | `server/_core/index.ts` |
| Circuit Breaker | Cascata de falhas | opossum (50% threshold, 30s reset) | `server/_core/llm.ts` |
| SSRF Prevention | URLs internas acessíveis | Validação http/https only | `server/routers.ts` |
| Upload Limit | DoS por upload grande | Max 60MB (83MB base64) | `server/routers.ts` |

**Relatórios detalhados**:
- [2026-02-11_ESTABILIDADE.md](../RELATORIOS/2026-02-11_ESTABILIDADE.md)
- [2026-02-11_SEGURANCA_ALTA.md](../RELATORIOS/2026-02-11_SEGURANCA_ALTA.md)

---

### 4. Rate Limiting + Sistema de Planos (12/02/2026)

**Implementação completa** com 2 camadas de proteção:

#### Camada 1: Burst Protection (in-memory)
- Limite de requests por minuto por usuário (anti-flood)
- Baseado em plano do usuário

#### Camada 2: Quota Diária (banco de dados)
- Créditos diários (1 crédito = 1.000 tokens input+output)
- Tracking por `usageTracking` table, reset diário

#### Planos implementados

| Plano | Req/min | Créditos/dia | Providers Permitidos |
|-------|---------|-------------|---------------------|
| **tester** | 10 | 250 | Google, OpenAI, Anthropic |
| **free** | 5 | 100 | Google apenas |
| **pro** | 20 | 2.000 | Google, OpenAI, Anthropic |
| **avançado** | 20 | ilimitado (API própria) | Google, OpenAI, Anthropic |
| **admin** | 60 | ilimitado | Todos |

**Arquivos**: `server/rateLimiter.ts`, `server/db.ts`, `drizzle/schema.ts` (campo `plan`)

**Commit**: `18916b8` - feat: credit-based usage system with plan tiers and UI widget

---

### 5. Multi-Provider LLM (12/02/2026)

Suporte a 3 provedores de LLM com seletor na UI:

| Provider | Modelos Rápidos | Modelos Pro |
|----------|----------------|-------------|
| **Google** | Gemini 3 Flash (padrão) | Gemini 3 Pro |
| **Anthropic** | Claude 4.5 Haiku | Claude 4.5 Sonnet |
| **OpenAI** | GPT-5 Mini | GPT-5.2 |

**Modelo padrão**: `gemini-3-flash-preview` (fallback em todo o sistema)

**Arquivos**: `shared/curatedModels.ts`, `server/llmModels.ts`, `server/_core/llm.ts`

**Commit**: `d24f5bc` - feat: multi-provider LLM support, model selector UI, and Anthropic native API

---

### 6. Redesign Settings (13/02/2026)

Página de configurações redesenhada com sidebar e 5 seções:

| Seção | Componente | Descrição |
|-------|-----------|-----------|
| Minha Conta | `SettingsMinhaConta.tsx` | Perfil, sessão, logout |
| Uso | `SettingsUso.tsx` | Créditos consumidos, progresso do plano |
| Cobrança | `SettingsCobranca.tsx` | Plano atual (upgrade futuro) |
| Personalização | `SettingsPersonalizacao.tsx` | Prompt customizado, Base de Conhecimento |
| Avançado | `SettingsAvancado.tsx` | BYOK - chave API própria |

**Commit**: `79b54cb` - feat: redesign settings page with sidebar navigation and 'avancado' plan

---

### 7. Safe Migrations (15/02/2026)

Substituição de `drizzle-kit push` (que rodava interativamente e podia truncar tabelas) por migrações programáticas via `drizzle-orm/mysql2/migrator`.

| Aspecto | Antes (`drizzle-kit push`) | Depois (`migrate.ts`) |
|---------|---------------------------|----------------------|
| Interativo | Sim (TUI, requeria input) | Não (totalmente automático) |
| Destrutivo | Sim (truncava tabelas em mudanças de enum) | Não (aplica apenas SQL revisado) |
| Tracking | Nenhum | `__drizzle_migrations` table |
| Transição | N/A | Automática (seed de migrations existentes) |

**Workflow novo:** `pnpm db:generate` → revisar SQL → deploy

**Commits**: `7881e1d`, `23664db`, `c66c427`, `1a60966`

---

### 8. Refatoração Backend (15/02/2026)

Split de `server/davidRouter.ts` (1184 linhas, 42 endpoints) em 6 sub-routers em `server/routers/david/`, usando `mergeRouters` do tRPC. API paths inalterados — zero mudanças no frontend.

| Sub-router | Endpoints | Domínio |
|------------|-----------|---------|
| `conversations.ts` | 11 | CRUD de conversas |
| `chat.ts` | 4 | Mensagens e streaming |
| `googleFiles.ts` | 2 | Google File API |
| `prompts.ts` | 13 | Prompts e coleções |
| `learning.ts` | 12 | Teses, drafts, config |
| `admin.ts` | 1 | Admin migration |

Também inclui fix de cross-provider PDF: fallback de API key no `/analise1` quando o PDF foi uploaded com uma chave diferente da chave de leitura (403 → tenta chave do usuário).

**PR**: #9 | **Commits**: `b096561`, `a90c387`

---

## Trabalho Futuro (Pós-Beta)

### Prioridade Alta

#### 1. Health Check Endpoint
**Quando implementar**: Para monitoramento de uptime

```typescript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: 'connected',
  });
});
```

#### 2. Backup de Banco de Dados
**Quando implementar**: Imediatamente em produção

- Railway oferece backups automáticos para MySQL
- Configurar retenção de 7-30 dias
- Testar processo de restore periodicamente

---

### Prioridade Média

#### 3. Logs Estruturados
**Quando implementar**: Para debugging em produção
- Sugestão: Winston ou Pino com níveis e formatação JSON
- Substituir `console.log` por logger estruturado

#### 4. Testes E2E Automatizados
**Quando implementar**: Antes de grandes releases
- Framework sugerido: Playwright (já instalado)
- Cenários: Login → Chat → Enviar mensagem, Upload PDF → Análise

---

### Prioridade Baixa (Escala)

#### 5. Cache de Respostas
**Quando implementar**: Se latência for problema
- Redis para cache de títulos gerados, prompts enhanced, etc.

#### 6. CDN para Assets Estáticos
**Quando implementar**: Se tiver muitos usuários globais
- Cloudflare (gratuito) ou AWS CloudFront

#### 7. Separação de Serviços
**Quando implementar**: Se precisar escalar componentes independentemente

```
Arquitetura atual (monolito):
┌─────────────────────────────┐
│ Express Server              │
│ ├─ API Routes (tRPC)        │
│ ├─ Streaming LLM (SSE)     │
│ ├─ Rate Limiter             │
│ └─ Static Files (Vite)     │
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
- Rate limiting + planos
- **Custo estimado**: ~$20-50/mês

### Fase 2: 50-500 Usuários
Adicionar:
- [x] Rate limiting ✅ (Implementado Fev/2026)
- [ ] Health checks
- [ ] Logs estruturados
- [ ] Backup automático
- [ ] Métricas avançadas (APM)
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

# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Sentry
SENTRY_DSN="https://..."
VITE_SENTRY_DSN="https://..."

# LLM - Chaves do sistema (para planos geridos)
GEMINI_API_KEY="AIza..."
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

### Variáveis de ambiente opcionais:
```bash
# Config
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS="https://seu-dominio.com"
```

### Notas de deploy:
- Migrações de banco são aplicadas automaticamente via `server/migrate.ts` no startup
- O script `start` em `package.json`: `node dist/migrate.js && node dist/index.js`
- Para adicionar migrações: `pnpm db:generate` → revisar SQL em `drizzle/` → commit → deploy

---

## Referências

- [Sentry Dashboard](https://sentry.io)
- [Railway Dashboard](https://railway.app)
- [Google AI Studio](https://aistudio.google.com/app/apikey) - Obter GEMINI_API_KEY
- [docs/reports/MVP_ROADMAP.md](./MVP_ROADMAP.md) - Roadmap de funcionalidades
- [docs/PENDENCIAS.md](../PENDENCIAS.md) - Correções e implementações pendentes

---

**Documento mantido por**: Equipe David
**Última atualização**: 15/02/2026
