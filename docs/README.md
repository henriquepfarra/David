# Documentação do David

Esta pasta contém toda a documentação técnica, arquitetura, testes e relatórios do projeto David.

## Estrutura

### `/architecture` - Arquitetura e Especificações
Documentos de design e arquitetura do sistema:
- **orchestration_architecture_v7.md** - Arquitetura completa do sistema de orquestração (IntentService + ContextBuilder + Motors)
- **rag_on_demand_evolution.md** - Evolução do sistema RAG on-demand com hierarquia e filtros
- **rag_on_demand_spec.md** - Especificação detalhada do RAG on-demand
- **system_commands_architecture.md** - 🆕 Arquitetura de Slash Commands do Sistema (/analise1, /minutar, /tese, etc.)

### `/modules` - Módulos de Especialização
Planos e documentação dos módulos especializados (JEC, FONAJE, etc.):
- **ESPECIALIZACOES_PLAN.md** - Plano original de especialização
- **ESPECIALIZACOES_PLAN_V2.md** - Versão 2 do plano de especialização
- **ESPECIALIZACOES_PLAN_V2.1_UPDATE.md** - Atualização V2.1 com abordagem híbrida (seed + RAG)

### `/frontend` - Refatoração de Frontend
Planos e documentação da refatoração do frontend:
- **README.md** - Índice da documentação de refatoração
- **FRONTEND_REFACTORING_PLAN.md** - Plano de refatoração (Fases 0-4) ✅ Fase 3 completa
- **FRONTEND_REFACTORING_PLAN_V4.md** - Próximas fases (5-10)
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
- **BETA_READINESS.md** - 🆕 Preparação para Beta: segurança de API keys, Sentry, e guia de escalabilidade

### `/db` - Database & Schema
Documentação relacionada ao banco de dados:
- **analise-schema-seed.md** - Análise do schema e seed
- **ENUNCIADOS FOJESP.pdf** - Enunciados FOJESP
- **enunciados fonaje.docx** - Enunciados FONAJE

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

## Principais Conquistas

### ✅ Orquestração Completa
- IntentService híbrido (heurística + LLM)
- ContextBuilder com pattern factory
- RAG otimizado por similaridade
- Motors A/B/C/D configuráveis

### ✅ Qualidade
- 100% precisão nos testes The Gauntlet
- Zero bugs ou crashes detectados
- UX polida sem flickering
- TypeCheck passando em todos os módulos

### ✅ Performance
- Mensagens de status dinâmicas (3.5s interval)
- Transição suave entre streaming e banco
- Latência otimizada (13-16s com gemini-2.5-pro)

## Como Usar Esta Documentação

1. **Para entender a arquitetura geral:** Leia `architecture/orchestration_architecture_v7.md`
2. **Para trabalhar com módulos especializados:** Veja `modules/ESPECIALIZACOES_PLAN_V2.1_UPDATE.md`
3. **Para refatoração de frontend:** Comece por `frontend/README.md`
4. **Para implementar RAG/Knowledge Base:** Consulte `rag/plano-rag-knowledge-base.md`
5. **Para rodar testes:** Use as perguntas em `testing/the_gauntlet.md`
6. **Para ver relatórios de implementação:** Confira `reports/orchestration_implementation.md`

## Status Atual

🟢 **PRODUCTION READY (Beta)**

Todos os blocos de 1-5 foram concluídos com sucesso. O sistema está robusto, testado e pronto para uso em produção.

### Infraestrutura Beta (Janeiro 2026)
- ✅ Segurança de API Keys - Usuários usam suas próprias chaves para LLM
- ✅ Monitoramento de Erros - Sentry integrado (frontend + backend)
- ✅ Deploy em Railway - MySQL + Express + Vite
- 📋 Próximos passos documentados em [BETA_READINESS.md](./reports/BETA_READINESS.md)
