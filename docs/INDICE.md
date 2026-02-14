# Índice da Documentação - David

**Última atualização:** 2026-02-13

Mapa completo da documentação técnica, arquitetura, testes e relatórios do projeto David.

## Estrutura

### `/architecture` - Arquitetura e Especificações
Documentos de design e arquitetura do sistema:
- **orchestration_architecture_v7.md** - Arquitetura completa do sistema de orquestração (IntentService + ContextBuilder + Motors)
- **rag_on_demand_evolution.md** - Evolução do sistema RAG on-demand com hierarquia e filtros
- **system_commands_architecture.md** - Arquitetura de Slash Commands do Sistema (/analise1, /minutar, /tese, etc.)
- **PDF_EXTRACTION_STRATEGY.md** - Estratégia híbrida de extração de PDF (local + File API)
- **CONTINUOUS_LEARNING_PLAN_V3.md** - Aprendizado continuo: ciclo de teses, curadoria inteligente (deduplicacao + tracking + clusters), cleanup
- **PLANO_MIGRACAO_INFRA.md** - Plano de migracao de infraestrutura (Railway → Fly.io/Supabase → AWS)

### `/modules` - Módulos de Especialização
Planos e documentação dos módulos especializados (JEC, FONAJE, etc.):
- **ESPECIALIZACOES_PLAN_V2.md** - Versão 2 do plano de especialização
- **ESPECIALIZACOES_PLAN_V2.1_UPDATE.md** - Atualização V2.1 com abordagem híbrida (seed + RAG)

### `/frontend` - Refatoração de Frontend
Planos e documentação da refatoração do frontend:
- **README.md** - Índice da documentação de refatoração
- **FRONTEND_REFACTORING_PLAN_V4.md** - Plano de refatoração (Fases 0-10)
- **EXECUTIVE_SUMMARY.md** - Resumo executivo para stakeholders
- **NEXT_STEPS.md** - Guia de início rápido
- **PR_TEMPLATES.md** - Templates de PR para cada fase

### `/rag` - Sistema RAG/Knowledge Base
Planos relacionados ao sistema de busca e base de conhecimento:
- **plano-rag-knowledge-base.md** - Plano completo de implementação da base de conhecimento inteligente

### `/testing` - Testes e Resultados
Suites de teste e resultados de validação:
- **the_gauntlet.md** - Suite de testes de stress para orquestração (20 perguntas desafiadoras)
- **gauntlet_results.md** - Resultados dos testes The Gauntlet (100% precisão)

### `/reports` - Relatórios de Implementação
Relatórios de progresso e walkthroughs:
- **orchestration_implementation.md** - Walkthrough completo da implementação da orquestração
- **orchestration_task_checklist.md** - Checklist de tarefas concluídas (Blocos 1-5)
- **walkthrough-implementacoes.md** - Walkthrough de implementações gerais
- **MVP_ROADMAP.md** - Roadmap do MVP
- **BETA_READINESS.md** - Preparação para Beta: segurança, escalabilidade e checklist de deploy

### `/RELATORIOS` - Relatórios Pontuais
- **2026-02-11_ESTABILIDADE.md** - Correções de estabilidade (memory leak, timeouts, CSP)
- **2026-02-11_SEGURANCA_ALTA.md** - Correções de segurança (circuit breaker, SSRF, upload limit)

### `/db` - Database & Schema
Documentação relacionada ao banco de dados:
- **analise-schema-seed.md** - Análise do schema e seed
- **ENUNCIADOS FOJESP.pdf** - Enunciados FOJESP
- **enunciados fonaje.docx** - Enunciados FONAJE

### Documentos na raiz de `/docs`
- **PENDENCIAS.md** - Correções e implementações pendentes (consolidado)
- **MODELO_NEGOCIO_API.md** - Modelo de negócio e precificação
- **TESTING_ENV_SETUP.md** - Setup do ambiente de testes

### `/issues` - Issues e Melhorias
Issues identificadas e planos de melhoria:
- **PROMPTS_MODAL_IMPROVEMENTS.md** - Melhorias do modal de prompts

### `/archive` - Documentos Históricos
Documentos de refatorações e correções já concluídas (referência histórica):
- **LOOP_FIX_PLAN.md** - Plano de correção do Loop of Death (Janeiro/2026) ✅
- **GEMINI_FEEDBACK_ACTION_PLAN.md** - Plano de ação baseado em feedback do Gemini ✅
- **REFACTORING_GOD_FUNCTIONS_ANALYSIS.md** - Análise de refatoração de god functions ✅
- **REFACTORING_GOD_FUNCTIONS_REPORT.md** - Relatório de refatoração concluída ✅
- **TEST_RESULTS.md** - Resultados de testes (Dezembro/2025) ✅
- **ANALISE_ERROS_TESTES.md** - Análise de erros de testes corrigidos ✅
- **ESPECIALIZACOES_PLAN.md** - Plano original de especialização (substituído por V2) ✅
- **FRONTEND_REFACTORING_PLAN.md** - Plano de refatoração original (substituído por V4) ✅
- **active_learning_plan.md** - Plano de aprendizado ativo (substituído por V3) ✅
- **rag_on_demand_spec.md** - Spec original RAG on-demand (substituída por evolution) ✅
- **LEARNING_FIXES_PLAN.md** - Correções do aprendizado (incorporadas no V3) ✅
- **CORRECOES_PENDENTES.md** - Tracker original (substituído por PENDENCIAS.md) ✅

---

## Principais Conquistas

### ✅ Orquestração Completa
- IntentService híbrido (heurística + LLM via gemini-2.5-flash-lite)
- ContextBuilder com pattern factory
- RAG híbrido otimizado por similaridade (threshold 0.5)
- Motors A/B/C/D configuráveis

### ✅ Multi-Provider LLM (Fev/2026)
- 3 provedores: Google Gemini, OpenAI GPT, Anthropic Claude
- 6 modelos curados no seletor de modelo (3 fast + 3 pro)
- Modelo padrão: Gemini 3 Flash Preview
- Circuit breaker (opossum) para resiliência de API
- Resolução inteligente de API keys (sistema vs. usuário)

### ✅ Sistema de Planos e Créditos (Fev/2026)
- 5 planos: tester, free, pro, avançado, admin
- Sistema de créditos (1 crédito = 1.000 tokens)
- Rate limiting com burst protection (anti-flood por minuto)
- Quotas diárias por plano
- Controle de providers por plano

### ✅ Segurança e Resiliência (Fev/2026)
- Helmet.js com CSP headers
- Circuit breaker para APIs de LLM
- Validação de URLs (prevenção SSRF)
- Limite de upload (60MB)
- Correção de memory leak em streaming
- Timeouts em todas as chamadas LLM (30s)
- Sentry integrado (frontend + backend)

### ✅ Redesign Settings (Fev/2026)
- Configurações com sidebar (5 seções)
- Plano Avançado com BYOK (Bring Your Own Key)
- Widget de créditos e uso
- User dropdown com resumo do plano

### ✅ Curadoria Inteligente de Teses (Fev/2026)
- Deduplicação na aprovação (cosine similarity > 0.85, dialog Substituir/Mesclar/Manter)
- Rastreamento de uso (useCount + lastUsedAt, fire-and-forget)
- Sugestões de curadoria (teses não usadas + clusters similares via Union-Find)

### ✅ Qualidade
- 100% precisão nos testes The Gauntlet
- TypeCheck passando em todos os módulos

### ✅ Performance
- Mensagens de status dinâmicas (3.5s interval)
- Transição suave entre streaming e banco
- Auto-migration (drizzle-kit push) no startup

---

## Como Usar Esta Documentação

1. **Para entender a arquitetura geral:** Leia `architecture/orchestration_architecture_v7.md`
2. **Para trabalhar com módulos especializados:** Veja `modules/ESPECIALIZACOES_PLAN_V2.1_UPDATE.md`
3. **Para refatoração de frontend:** Comece por `frontend/README.md`
4. **Para implementar RAG/Knowledge Base:** Consulte `rag/plano-rag-knowledge-base.md`
5. **Para rodar testes:** Use as perguntas em `testing/the_gauntlet.md`
6. **Para ver correções pendentes:** Confira `PENDENCIAS.md`
7. **Para modelo de negócio:** Veja `MODELO_NEGOCIO_API.md`

## Status Atual

🟢 **PRODUCTION READY (Beta)**

Todos os blocos de 1-5 foram concluídos com sucesso. O sistema está robusto, testado e pronto para uso em produção.

### Infraestrutura Beta (Fevereiro 2026)
- ✅ Multi-Provider LLM - Google, OpenAI e Anthropic com seletor de modelo
- ✅ Sistema de Planos - tester/free/pro/avançado com créditos diários
- ✅ Segurança Completa - CSP, circuit breaker, rate limiting, SSRF prevention
- ✅ Monitoramento de Erros - Sentry integrado (frontend + backend)
- ✅ Deploy em Railway - MySQL + Express + Vite com auto-migration
- 📋 Detalhes em [BETA_READINESS.md](./reports/BETA_READINESS.md) e [PENDENCIAS.md](./PENDENCIAS.md)
