# Execução: Refatoração do DAVID

## Bloco 1: Backend Core ✅
- [x] Criar `RagService.ts` (encapsula hybridSearch + hierarquia)
- [x] Criar `ContextBuilder.ts` (Builder Pattern)
- [x] Modificar `llm.ts` (retry + fallback + circuit breaker)
- [x] Testes: hybridSearch.test.ts passando (15 testes)

## Bloco 2: Frontend Core ✅
- [x] Criar `useChatStream.ts`
- [x] Criar `StreamParser.ts`
- [x] Criar componentes: ThinkingAccordion, CitationBadge, MessageBubble

## Bloco 3: Integração
### Fase 3.1: Modularizar Routers ✅
- [x] Criar `conversationRouter.ts` (12 procedures)
- [x] Criar `promptRouter.ts` (11 procedures)
- [x] Criar `routers/index.ts`
- [x] TypeCheck + 18 testes passando

### Fase 3.2: Integrar RagService + ContextBuilder ✅
- [x] Substituir hybridSearch por RagService
- [x] Substituir montagem manual de prompt por ContextBuilder
- [x] Adicionar addSection() e requests ao ContextBuilder
- [x] TypeCheck passando
### Fase 3.3: Componentizar David.tsx ✅
- [x] Substituir streamMessage por useChatStream (-75 linhas)
- [x] TypeCheck passando
### Fase 3.4: Limpeza Final ✅
- [x] Criado StreamParser.test.ts (12 testes)
- [x] 18 testes do servidor passando
- [x] TypeCheck final passando
- [x] Corrigido buffer StreamParser para tags divididas

## Bloco 4: Integração Final (identificado pelo gerente)
- [ ] Conectar sub-routers ao davidRouter.ts (requer edição manual grande - pausado)
- [x] Verificar MessageBubble/Thinking - **Thinking já funciona!** (backend salva separado)
- [ ] Citações [[REF:...]] não são renderizadas pelo Streamdown (requer integração futura)

## Bloco 5: Router Semântico (IntentService)
- [x] Fase 1: Criar IntentService.ts (classificação híbrida)
- [x] Fase 2: Atualizar ContextBuilder com createBuilderForIntent()
- [x] Fase 3: Integrar no endpoint de streaming
- [ ] Fase 4: Testes "The Gauntlet"



