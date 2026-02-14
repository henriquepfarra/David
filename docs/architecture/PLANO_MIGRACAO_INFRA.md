# Plano de Migracao de Infraestrutura

**Data:** 13/02/2026
**Status:** Planejamento (executar quando atingir ponto de inflexao)

---

## Arquitetura Atual (Railway)

```
Railway
├── Servico: david-app
│   ├── Node.js (Express + tRPC + Vite)
│   ├── Streaming SSE para chat
│   ├── Auto-migration (drizzle-kit push no startup)
│   └── Deploy: push to main → build → deploy
│
├── Servico: MySQL 8
│   ├── Tabelas principais: users, conversations, messages, processes, drafts
│   ├── Tabelas de aprendizado: learnedTheses, approvedDrafts, knowledgeBase
│   ├── Embeddings: JSON columns (number[] serializado)
│   └── Storage: ~500MB incluso no plano
│
└── Dependencias Externas
    ├── Google Gemini API (LLM principal)
    ├── OpenAI API (alternativo)
    ├── Anthropic API (alternativo)
    ├── Google File API (upload de PDFs)
    └── Sentry (monitoramento de erros)
```

**Custo atual:** ~$5-10/mes (Railway Starter)
**Limites:** 8GB RAM, 8 vCPU, 500MB DB storage

---

## Pontos de Inflexao

### Ponto 1: Storage do banco (provavel primeiro gargalo)

**Quando:** ~50-100 usuarios ativos com uploads de PDFs

**Sintoma:** Railway alerta que storage esta chegando no limite de 500MB

**O que cresce mais rapido:**
- `messages` — cada mensagem de chat (incluindo respostas longas da IA)
- `processDocumentChunks` — chunks de PDFs com embeddings
- `knowledgeBase` — sumulas, enunciados (seed data ~50MB)

**Estimativa de crescimento:**
| Tabela | Por usuario/mes | 100 usuarios | 1000 usuarios |
|--------|----------------|-------------|--------------|
| messages | ~2MB | 200MB | 2GB |
| processDocumentChunks | ~5MB | 500MB | 5GB |
| learnedTheses | ~0.5MB | 50MB | 500MB |
| knowledgeBase | fixo | ~50MB | ~50MB |
| **Total** | ~7.5MB | ~800MB | ~7.5GB |

**Acao:** Upgrade para plano Pro do Railway ($20/mes, 50GB storage) ou migrar banco

### Ponto 2: Performance de embedding (segundo gargalo)

**Quando:** Um usuario acumula ~500+ teses ou o sistema tem ~200+ usuarios

**Sintoma:** Chat demora >1s para responder (tempo gasto no RagService buscando teses)

**Causa tecnica:** Cosine similarity calculado em memoria contra todos os embeddings do usuario. Complexidade O(n) por query.

**Acao:** Migrar busca vetorial para pgvector (ver secao de migracao abaixo)

### Ponto 3: Concorrencia de conexoes MySQL

**Quando:** ~100+ usuarios simultaneos fazendo chat (streaming SSE mantem conexao aberta)

**Sintoma:** "Too many connections" no MySQL, timeouts intermitentes

**Causa tecnica:** Cada stream SSE segura recursos do server. MySQL do Railway tem limite de conexoes.

**Acao:** Migrar para infra com connection pooling dedicado (PgBouncer/Supabase) ou escalar horizontalmente

### Ponto 4: Latencia geografica

**Quando:** Usuarios reclamam de lentidao (Railway roda em US-West por padrao)

**Sintoma:** ~200-300ms de latencia em cada request API (ida e volta Brasil-EUA)

**Acao:** Migrar app para regiao GRU (Sao Paulo) — Fly.io suporta nativamente

---

## Plano de Migracao Recomendado

### Fase M1: Sair do Railway → Fly.io + Supabase (~$30/mes)

**Trigger:** Atingir Ponto 1 ou Ponto 4
**Esforco:** 1-2 dias
**Downtime:** <30 minutos (com planejamento)

#### Por que Fly.io
- Regiao GRU (Sao Paulo) — latencia <50ms para usuarios brasileiros
- Deploy via Dockerfile (ja temos)
- Auto-scaling (0 a N instancias)
- Custo: ~$5-10/mes para 1 instancia

#### Por que Supabase para o banco
- PostgreSQL managed com pgvector habilitado por padrao
- Free tier: 500MB, 2 projetos
- Pro: $25/mes, 8GB, backups automaticos
- Drizzle ORM suporta Postgres nativamente
- Resolve Pontos 1, 2 e 3 de uma vez

#### Passos da migracao

**1. Preparar Supabase (antes de migrar)**
```
- Criar projeto no Supabase (regiao South America East 1 se disponivel, senao US East)
- Anotar DATABASE_URL (postgres://...)
- Habilitar pgvector: CREATE EXTENSION IF NOT EXISTS vector;
```

**2. Adaptar Drizzle para PostgreSQL**

Mudancas no codigo (estimativa ~50 linhas):

```
// drizzle.config.ts
- dialect: "mysql",
+ dialect: "postgresql",

// server/db.ts
- import { drizzle } from "drizzle-orm/mysql2";
- import { createPool } from "mysql2/promise";
+ import { drizzle } from "drizzle-orm/node-postgres";
+ import { Pool } from "pg";

// drizzle/schema.ts — tipos que mudam:
- import { mysqlTable, int, varchar, longtext, timestamp, mysqlEnum, json } from "drizzle-orm/mysql-core";
+ import { pgTable, serial, integer, varchar, text, timestamp, pgEnum, jsonb, vector } from "drizzle-orm/pg-core";

// Mapeamento de tipos:
// mysqlTable → pgTable
// int().autoincrement() → serial()
// int() → integer()
// longtext() → text()
// mysqlEnum() → pgEnum()
// json() → jsonb() (ou vector(1536) para embeddings)
// timestamp().defaultNow() → timestamp().defaultNow()
```

**3. Migrar dados do MySQL para PostgreSQL**

```bash
# Exportar do MySQL (Railway)
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS $MYSQL_DB \
  --compatible=postgresql --no-create-info --complete-insert > data.sql

# Alternativa mais segura: usar pgloader
pgloader mysql://$MYSQL_URL postgresql://$SUPABASE_URL

# Ou: script Node.js que le do MySQL e insere no Postgres via Drizzle
# (mais controle, garante integridade dos embeddings)
```

**4. Adicionar pgvector para embeddings**

```sql
-- No Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;

-- Alterar colunas de embedding de jsonb para vector:
ALTER TABLE "learnedTheses"
  ADD COLUMN thesis_embedding_vec vector(1536),
  ADD COLUMN style_embedding_vec vector(1536);

-- Criar indice HNSW para busca rapida:
CREATE INDEX ON "learnedTheses"
  USING hnsw (thesis_embedding_vec vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Migrar dados existentes (jsonb → vector):
UPDATE "learnedTheses"
  SET thesis_embedding_vec = thesis_embedding::vector
  WHERE thesis_embedding IS NOT NULL;
```

**5. Adaptar RagService para pgvector**

```typescript
// Antes (in-memory cosine similarity):
const theses = await db.select().from(learnedTheses)
  .where(eq(learnedTheses.userId, userId));
// + calculo manual de similaridade em JS

// Depois (pgvector faz tudo no banco):
const results = await db.execute(sql`
  SELECT *, 1 - (thesis_embedding_vec <=> ${queryVector}::vector) as similarity
  FROM learned_theses
  WHERE user_id = ${userId} AND status = 'ACTIVE'
  ORDER BY thesis_embedding_vec <=> ${queryVector}::vector
  LIMIT 20
`);
// Busca em O(log n), resultado ja ordenado por similaridade
```

**6. Deploy no Fly.io**

```bash
# Criar app
fly launch --name david-app --region gru

# Configurar env vars
fly secrets set DATABASE_URL=postgres://... GEMINI_API_KEY=... etc

# Deploy
fly deploy

# Verificar
fly status
fly logs
```

**7. Migrar DNS e validar**

```
- Apontar dominio para Fly.io
- Testar todas as features (chat, upload PDF, /tese, /minutar)
- Monitorar logs por 24h
- Desligar Railway quando estavel
```

### Fase M2: Escalar horizontal (quando precisar)

**Trigger:** Atingir Ponto 3 (~100+ usuarios simultaneos)
**Esforco:** Meio dia

```
Fly.io
├── App: david-app (2-4 instancias, auto-scale)
│   ├── min_machines_running = 1
│   ├── max_machines_running = 4
│   └── Regiao: GRU (Sao Paulo)
│
├── Supabase (PostgreSQL + pgvector)
│   ├── Connection pooling via Supavisor (incluso)
│   ├── Read replicas (se necessario)
│   └── Backups automaticos
│
└── CDN (opcional)
    └── Cloudflare para assets estaticos
```

Mudancas necessarias:
- SSE streaming: funciona com multiplas instancias (cada conexao e independente)
- Sessions: ja sao stateless (JWT via WorkOS)
- File uploads: manter Google File API (nao depende da instancia)
- Scheduled jobs (cleanup): usar `fly machines run` com cron externo ou manter setInterval (roda em todas as instancias, idempotente)

### Fase M3: Infra enterprise (quando justificar)

**Trigger:** ~1000+ usuarios, receita recorrente que justifique o custo
**Custo:** $100-500/mes

```
AWS Sao Paulo (sa-east-1)
├── ECS Fargate (containers)
│   ├── Auto-scaling por CPU/memoria
│   ├── ALB com health checks
│   └── Deploy via GitHub Actions + ECR
│
├── RDS PostgreSQL (pgvector nativo)
│   ├── Multi-AZ (alta disponibilidade)
│   ├── Automated backups + PITR
│   └── Read replicas para queries pesadas
│
├── CloudFront (CDN)
│   └── Assets estaticos + caching
│
├── CloudWatch (monitoring)
│   └── Alertas, dashboards, logs
│
└── S3 (storage de arquivos)
    └── Substituir Google File API por upload direto
```

**Nao migrar para AWS antes de ter receita.** O custo operacional (tempo de setup, manutenção, debugging) so compensa com escala real.

---

## Checklist Pre-Migracao

Antes de iniciar qualquer migracao:

- [ ] Backup completo do banco MySQL
- [ ] Listar todas as env vars do Railway
- [ ] Testar build do Docker localmente
- [ ] Mapear todos os tipos MySQL → Postgres no schema
- [ ] Testar drizzle-kit push no Postgres local
- [ ] Script de migracao de dados testado com dados reais
- [ ] Plano de rollback (manter Railway ativo por 1 semana apos migracao)

## O que NAO mudar na migracao

- Frontend (React, tRPC client) — zero mudancas
- Rotas da API (tRPC endpoints) — zero mudancas
- Logica de negocio (commands, services) — zero mudancas
- Autenticacao (WorkOS) — zero mudancas
- LLM integrations (Gemini, OpenAI, Anthropic) — zero mudancas

A migracao e 100% backend: banco + deploy. O frontend nao sabe e nao precisa saber onde o backend roda.

---

## Resumo de Custos

| Fase | Infra | Custo/mes | Suporta |
|------|-------|-----------|---------|
| Atual | Railway | $5-10 | ~50 usuarios |
| M1 | Fly.io + Supabase | $30-40 | ~500 usuarios |
| M2 | Fly.io (multi) + Supabase Pro | $60-100 | ~2000 usuarios |
| M3 | AWS Sao Paulo | $100-500 | 5000+ usuarios |

**Regra de ouro:** so migrar quando o ponto de inflexao for real (nao antecipado). Otimizacao prematura de infra e desperdicio de tempo que poderia ser gasto em features.

---

**Ultima atualizacao:** 13/02/2026
