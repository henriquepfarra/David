# 🔍 ANÁLISE DE IMPACTO E RISCO: Refatoração God Functions

**Data**: 2026-01-11
**Arquivo**: `server/davidRouter.ts`
**Funções**: `sendMessage` (208 linhas) e `sendMessageStream` (212 linhas)
**Severidade**: 🔴 CRÍTICA
**Prioridade**: MÉDIA-ALTA

---

## 1. ANÁLISE DAS FUNÇÕES ATUAIS

### 1.1 Métricas de Código

| Métrica | sendMessage | sendMessageStream | Total |
|---------|-------------|-------------------|-------|
| **Linhas de código** | 208 | 212 | 420 |
| **Complexidade ciclomática estimada** | ~15 | ~15 | ~30 |
| **Níveis de indentação máx** | 5 | 5 | - |
| **Responsabilidades identificadas** | 9 | 9 | 18 |
| **Operações de I/O (await)** | 12+ | 13+ | 25+ |
| **Blocos try-catch** | 2 | 2 | 4 |

### 1.2 Responsabilidades Identificadas

Ambas as funções fazem **TUDO**:

1. ✅ **Autenticação/Autorização** (linhas 407-410, 618-621)
   - Verificar se conversa pertence ao usuário

2. ✅ **Persistência de Mensagem do Usuário** (linhas 412-417, 623-628)
   - Salvar mensagem no banco de dados

3. ✅ **Sistema de Comandos** (linhas 419-445, 630-658)
   - Detectar e executar comandos `/comando`
   - Buscar processo e executar prompt salvo

4. ✅ **Gerenciamento de Histórico** (linhas 448-449, 661-662)
   - Buscar mensagens anteriores

5. ✅ **Geração Automática de Título** (linhas 451-478, 664-691)
   - Detectar primeira mensagem
   - Buscar info de processo
   - Gerar título em background

6. ✅ **RAG (Retrieval-Augmented Generation)** (linhas 480-482, 693-695)
   - Buscar base de conhecimento relevante

7. ✅ **Contexto de Processo** (linhas 484-547, 697-761)
   - Buscar dados do processo
   - Buscar documentos do processo
   - Buscar casos similares (busca semântica)
   - Montar contexto formatado

8. ✅ **Montagem de Prompt do Sistema** (linhas 549-574, 763-788)
   - Combinar múltiplos módulos (Core, JEC, Orquestrador, Motores)
   - Adicionar preferências de estilo
   - Montar mensagens para LLM

9. ✅ **Invocação da LLM e Resposta** (linhas 576-605, 790-820)
   - Chamar API da LLM (síncrono vs streaming)
   - Salvar resposta
   - Tratar erros

**Violações de SOLID**:
- ❌ **SRP (Single Responsibility)**: 9 responsabilidades diferentes
- ❌ **OCP (Open/Closed)**: Difícil estender sem modificar
- ❌ **DIP (Dependency Inversion)**: Acoplamento direto com db.ts

### 1.3 Dependências

**Imports diretos**:
- `db.ts`: 10 funções (getConversationById, createMessage, getProcessForContext, etc)
- `executeSavedPrompt` do promptExecutor
- `generateConversationTitle` do titleGenerator
- `getRagService` do RagService
- `invokeLLM` / `invokeLLMStream` do llm
- 8+ constantes de prompt (CORE_IDENTITY, CORE_TONE, etc)

**Acoplamento**: ALTO (34 imports de db.ts no arquivo todo)

---

## 2. IMPACTO DA REFATORAÇÃO

### 2.1 Impacto Técnico

#### Arquivos que serão MODIFICADOS:
1. ✏️ `server/davidRouter.ts` - Simplificar funções para orquestração
2. ✏️ `server/services/ContextBuilder.ts` - Já existe, pode precisar extensão

#### Arquivos que serão CRIADOS:
1. 🆕 `server/services/MessageService.ts` - Lógica de mensagens
2. 🆕 `server/services/ConversationService.ts` - Lógica de conversas
3. 🆕 `server/services/PromptBuilder.ts` - Montagem de prompts
4. 🆕 `server/services/__tests__/MessageService.test.ts` - Testes
5. 🆕 `server/services/__tests__/ConversationService.test.ts` - Testes

#### Funções novas que serão extraídas:

**MessageService**:
```typescript
- async saveUserMessage(conversationId, content): Promise<void>
- async saveAssistantMessage(conversationId, content, thinking?): Promise<void>
- async getConversationHistory(conversationId, limit?): Promise<Message[]>
```

**ConversationService**:
```typescript
- async validateConversationAccess(conversationId, userId): Promise<Conversation>
- async handleFirstMessageActions(conversationId, content, processId?): Promise<void>
```

**PromptBuilder** (ou estender ContextBuilder):
```typescript
- async buildSystemPrompt(options): Promise<string>
- async buildLLMMessages(systemPrompt, history, contexts): Promise<LLMMessage[]>
```

**CommandExecutor** (ou manter inline):
```typescript
- async tryExecuteCommand(content, conversationId, userId, processId): Promise<string | null>
```

#### Impacto em testes existentes:
- ⚠️ **NENHUM teste unitário existente para essas funções** (cobertura 13%)
- ✅ Refatoração permite ADICIONAR testes incrementalmente
- ⚠️ Testes E2E/integração podem quebrar se não houver cuidado

#### Impacto em outras partes do código:
- ✅ **BAIXO**: Essas funções são chamadas apenas pelo frontend via tRPC
- ✅ Assinatura das funções pode permanecer idêntica (contrato mantido)
- ✅ Clientes não serão afetados se interface permanecer igual

### 2.2 Impacto no Usuário Final

| Aspecto | Impacto | Detalhes |
|---------|---------|----------|
| **Funcionalidade** | ✅ NENHUM | Lógica permanece idêntica, apenas reorganizada |
| **Performance** | ⚡ POSITIVO | Possibilidade de cache e otimizações em services |
| **Estabilidade** | ⚠️ RISCO MÉDIO | Risco de regressão se testes inadequados |
| **UX** | ✅ NENHUM | Interface permanece igual |

**Risco de Regressão**: MÉDIO
- Código está funcionando em produção
- Reorganização pode introduzir bugs sutis (ex: ordem de execução)
- Mitigação: Testes abrangentes + rollout gradual

### 2.3 Impacto na Equipe

| Métrica | Estimativa |
|---------|-----------|
| **Tempo de refatoração** | 16-24 horas |
| **Tempo de code review** | 4-6 horas |
| **Tempo de testes** | 8-12 horas |
| **Total** | **3-5 dias úteis** |

**Breakdown do tempo**:
- Dia 1: Criar MessageService + testes (6h)
- Dia 2: Criar ConversationService + PromptBuilder + testes (8h)
- Dia 3: Refatorar sendMessage (4h) + testes integração (4h)
- Dia 4: Refatorar sendMessageStream (4h) + testes integração (4h)
- Dia 5: Code review + ajustes + deploy (6h)

**Complexidade de Review**: ALTA
- 5 arquivos novos + modificações em 2 existentes
- ~800-1000 linhas de código movidas/modificadas
- Necessário entender fluxo completo

---

## 3. ANÁLISE DE RISCOS

### 3.1 Riscos CRÍTICOS 🔴

#### Risco 1: Quebra na Ordem de Execução
**Descrição**: RAG/contexto sendo buscado antes/depois de quando deveria
**Probabilidade**: MÉDIA (40%)
**Impacto**: Sistema gera respostas sem contexto adequado
**Mitigação**:
- ✅ Testes de integração verificando contexto em cada etapa
- ✅ Logs detalhados mostrando ordem de execução
- ✅ Review minucioso do fluxo de dados

#### Risco 2: Perda de Dados em Transações
**Descrição**: Mensagens não são salvas corretamente durante erros
**Probabilidade**: BAIXA (15%)
**Impacto**: Usuário perde conversas, dados inconsistentes
**Mitigação**:
- ✅ Implementar transactions onde necessário
- ✅ Testes de falha/rollback
- ✅ Idempotência nas operações de DB

#### Risco 3: Quebra de Streaming
**Descrição**: sendMessageStream para de funcionar corretamente
**Probabilidade**: MÉDIA (30%)
**Impacto**: Frontend não recebe chunks, experiência ruim
**Mitigação**:
- ✅ Testes específicos de streaming
- ✅ Manter generator function pattern
- ✅ Não modificar lógica de yield

### 3.2 Riscos MÉDIOS 🟡

#### Risco 4: Performance Degradada
**Descrição**: Novas camadas de abstração adicionam overhead
**Probabilidade**: BAIXA (20%)
**Impacto**: Resposta 50-200ms mais lenta
**Mitigação**:
- ✅ Benchmark antes/depois
- ✅ Minimizar async/await desnecessários
- ✅ Usar Promise.all onde possível

#### Risco 5: Duplicação Acidental de Lógica
**Descrição**: Lógica similar em services e router
**Probabilidade**: MÉDIA (35%)
**Impacto**: Manutenção mais difícil
**Mitigação**:
- ✅ Code review rigoroso
- ✅ Documentação clara de responsabilidades
- ✅ ESLint rules para detectar duplicação

#### Risco 6: Testes Insuficientes
**Descrição**: Cobertura continua baixa após refatoração
**Probabilidade**: ALTA (60%)
**Impacto**: Bugs não detectados, regressões futuras
**Mitigação**:
- ✅ Exigir cobertura mínima 70% nos novos services
- ✅ CI/CD bloqueando merge se cobertura cair
- ✅ TDD durante refatoração

### 3.3 Riscos BAIXOS 🟢

#### Risco 7: Conflitos de Merge
**Descrição**: Branch de refatoração conflitando com outras mudanças
**Probabilidade**: MÉDIA (40%)
**Impacto**: Tempo extra para resolver conflitos
**Mitigação**:
- ✅ Comunicar com equipe
- ✅ Feature freeze temporário
- ✅ Refatorar em sprint dedicado

#### Risco 8: Confusão de Documentação
**Descrição**: Documentação não reflete nova arquitetura
**Probabilidade**: ALTA (70%)
**Impacto**: Onboarding mais lento
**Mitigação**:
- ✅ Atualizar README com nova arquitetura
- ✅ JSDoc em todos os novos services
- ✅ Diagrama de sequência do fluxo

---

## 4. BENEFÍCIOS ESPERADOS

### 4.1 Benefícios Imediatos

✅ **Testabilidade**
- **Antes**: 0% de cobertura nas funções principais
- **Depois**: 70%+ de cobertura em services
- **Ganho**: Detectar bugs antes de produção

✅ **Manutenibilidade**
- **Antes**: 420 linhas para entender fluxo completo
- **Depois**: ~50 linhas por service (8x mais fácil)
- **Ganho**: Onboarding 3x mais rápido

✅ **Legibilidade**
- **Antes**: 5 níveis de indentação, scroll de tela
- **Depois**: 2-3 níveis, funções com nomes claros
- **Ganho**: Code review 2x mais rápido

✅ **Debugging**
- **Antes**: Logs espalhados, difícil rastrear
- **Depois**: Logs estruturados por service
- **Ganho**: Troubleshooting 50% mais rápido

### 4.2 Benefícios a Longo Prazo

✅ **Reutilização**
- MessageService pode ser usado por:
  - Bulk message import
  - Message templates
  - Scheduled messages

✅ **Extensibilidade**
- Adicionar novos tipos de contexto sem modificar router
- A/B testing de diferentes estratégias de RAG
- Plugins para diferentes LLMs

✅ **Documentação**
- JSDoc força documentar cada service
- Tipos TypeScript mais precisos
- Exemplos de uso em testes

✅ **Arquitetura**
- Padrão replicável para outros routers
- Migração futura para microservices facilitada
- Separação clara de camadas (controller/service/data)

---

## 5. ESTRATÉGIA DE REFATORAÇÃO

### 5.1 Abordagem Recomendada

**✅ INCREMENTAL** (não Big Bang)

**Por quê?**
- Reduz risco de breaking changes catastróficas
- Permite rollback granular
- Facilita code review (PRs menores)
- Mantém sistema funcionando durante refatoração

**Feature Flag?**
- ⚠️ CONSIDERAR se refatoração for em produção ativa
- ✅ Usar variável env `USE_REFACTORED_SERVICES=false`
- ✅ Gradualmente ativar para % de usuários

**Rollback Plan**:
1. Se feature flag ativada: desativar imediatamente
2. Se já em produção: revert do commit específico
3. Tempo de rollback: ~5 minutos
4. Sinais para reverter (ver seção 7)

### 5.2 Ordem de Execução (10 Passos)

#### FASE 1: Preparação (1 dia)

**Passo 1: Criar testes de regressão E2E** [4h]
- Arquivos: `tests/e2e/chat-flow.test.ts`
- Testar fluxo completo atual (baseline)
- ✅ Deve passar antes de qualquer refatoração

**Passo 2: Documentar fluxo atual** [2h]
- Arquivo: `docs/chat-flow-diagram.md`
- Diagrama de sequência
- ✅ Aprovação do time

---

#### FASE 2: Services Base (2 dias)

**Passo 3: Criar MessageService** [6h]
- Arquivo: `server/services/MessageService.ts`
- Funções: save, get, validate
- Testes: `__tests__/MessageService.test.ts`
- Cobertura: 80%+
- ✅ CI verde

**Passo 4: Criar ConversationService** [6h]
- Arquivo: `server/services/ConversationService.ts`
- Funções: validate, handleFirstMessage
- Testes: `__tests__/ConversationService.test.ts`
- Cobertura: 80%+
- ✅ CI verde

**Passo 5: Criar PromptBuilder (ou estender ContextBuilder)** [4h]
- Arquivo: `server/services/PromptBuilder.ts`
- Funções: buildSystemPrompt, buildLLMMessages
- Testes: `__tests__/PromptBuilder.test.ts`
- Cobertura: 75%+
- ✅ CI verde

---

#### FASE 3: Refatoração sendMessage (1 dia)

**Passo 6: Refatorar sendMessage** [4h]
- Arquivo: `server/davidRouter.ts` (linhas 398-606)
- Usar services criados
- Manter assinatura idêntica
- ✅ Testes E2E ainda passam

**Passo 7: Testes de integração sendMessage** [4h]
- Arquivo: `tests/integration/sendMessage.test.ts`
- Testar com mocks de services
- Cobertura: 70%+
- ✅ CI verde

---

#### FASE 4: Refatoração sendMessageStream (1 dia)

**Passo 8: Refatorar sendMessageStream** [4h]
- Arquivo: `server/davidRouter.ts` (linhas 609-821)
- Usar mesmos services
- Manter generator pattern
- ✅ Testes E2E ainda passam

**Passo 9: Testes de integração sendMessageStream** [4h]
- Arquivo: `tests/integration/sendMessageStream.test.ts`
- Testar streaming com mocks
- Cobertura: 70%+
- ✅ CI verde

---

#### FASE 5: Deploy e Monitoramento (0.5 dia)

**Passo 10: Deploy gradual** [4h]
- Feature flag ativada para 10% → 50% → 100%
- Monitorar métricas (latency, errors, throughput)
- Rollback se necessário
- ✅ Métricas estáveis por 24h

---

### 5.3 Critérios de Sucesso

#### ✅ Critérios Técnicos

| Métrica | Antes | Meta | Como Medir |
|---------|-------|------|------------|
| **Cobertura de testes** | 0% | 70%+ | `npm run test:coverage` |
| **Linhas por função** | 210 avg | 50 max | Análise estática |
| **Complexidade ciclomática** | ~15 | 5 max | ESLint plugin |
| **Tempo de resposta (p95)** | baseline | ≤ baseline + 100ms | APM monitoring |
| **Taxa de erro** | baseline | ≤ baseline | Error tracking |

#### ✅ Critérios de Negócio

- ✅ Zero tickets de "chat não funciona" após deploy
- ✅ Latência percebida pelo usuário igual ou menor
- ✅ 100% das conversas salvas corretamente (audit logs)
- ✅ Feature parity: tudo que funcionava antes funciona depois

#### ✅ Critérios de Qualidade

- ✅ Code review aprovado por 2+ desenvolvedores
- ✅ Documentação atualizada (JSDoc + README)
- ✅ Nenhum warning de TypeScript
- ✅ ESLint score mantido ou melhorado

---

## 6. PLANO DE TESTES

### 6.1 Testes Unitários Necessários

#### MessageService (`__tests__/MessageService.test.ts`)

```typescript
describe('MessageService', () => {
  describe('saveUserMessage', () => {
    test('deve salvar mensagem com conversationId correto')
    test('deve validar content não vazio')
    test('deve fazer rollback se DB falhar')
  })

  describe('saveAssistantMessage', () => {
    test('deve salvar mensagem com thinking separado')
    test('deve tratar content muito longo (>100k chars)')
  })

  describe('getConversationHistory', () => {
    test('deve retornar últimas N mensagens')
    test('deve respeitar limit parameter')
    test('deve retornar array vazio se conversa não existir')
  })
})
```

#### ConversationService (`__tests__/ConversationService.test.ts`)

```typescript
describe('ConversationService', () => {
  describe('validateConversationAccess', () => {
    test('deve retornar conversa se user é dono')
    test('deve lançar erro se user não é dono')
    test('deve lançar erro se conversa não existe')
  })

  describe('handleFirstMessageActions', () => {
    test('deve gerar título automaticamente')
    test('deve incluir info de processo se houver')
    test('deve não bloquear se geração falhar')
  })
})
```

#### PromptBuilder (`__tests__/PromptBuilder.test.ts`)

```typescript
describe('PromptBuilder', () => {
  describe('buildSystemPrompt', () => {
    test('deve combinar todos os módulos core')
    test('deve incluir JEC context')
    test('deve concatenar stylePreferences')
  })

  describe('buildLLMMessages', () => {
    test('deve adicionar systemPrompt como primeira mensagem')
    test('deve incluir knowledgeBaseContext')
    test('deve limitar histórico a últimas 10 mensagens')
    test('deve filtrar mensagens com role inválida')
  })
})
```

**Total de testes unitários**: ~25-30 testes

### 6.2 Testes de Integração Necessários

#### Fluxo sendMessage (`tests/integration/sendMessage.test.ts`)

```typescript
describe('sendMessage Integration', () => {
  test('deve processar mensagem simples sem processo', async () => {
    // Arrange: criar conversa, usuário
    // Act: chamar sendMessage
    // Assert: mensagem salva, resposta retornada
  })

  test('deve incluir contexto de processo se houver', async () => {
    // Arrange: criar conversa com processo
    // Act: chamar sendMessage
    // Assert: systemPrompt inclui dados do processo
  })

  test('deve executar comando /analise se houver', async () => {
    // Arrange: criar prompt salvo
    // Act: enviar "/analise"
    // Assert: prompt executado, resposta correta
  })

  test('deve buscar RAG corretamente', async () => {
    // Arrange: adicionar docs à knowledge base
    // Act: fazer pergunta relacionada
    // Assert: resposta menciona docs relevantes
  })

  test('deve gerar título na primeira mensagem', async () => {
    // Arrange: conversa nova
    // Act: enviar primeira mensagem
    // Assert: título gerado em background
  })
})
```

#### Fluxo sendMessageStream (`tests/integration/sendMessageStream.test.ts`)

```typescript
describe('sendMessageStream Integration', () => {
  test('deve fazer stream de chunks corretamente', async () => {
    // Arrange: criar conversa
    // Act: subscribe ao stream
    // Assert: recebe chunks + done event
  })

  test('deve salvar mensagem completa ao final do stream', async () => {
    // Arrange: iniciar stream
    // Act: consumir todo o stream
    // Assert: mensagem completa salva no DB
  })

  test('deve tratar erro durante stream', async () => {
    // Arrange: mockar LLM para falhar
    // Act: iniciar stream
    // Assert: recebe error event, mensagem parcial não salva
  })
})
```

**Total de testes de integração**: ~15-20 testes

### 6.3 Testes Manuais/E2E

#### Cenários Críticos

1. **Conversa Normal**
   - ✅ Abrir chat, enviar mensagem, receber resposta
   - ✅ Enviar várias mensagens seguidas
   - ✅ Verificar histórico persiste

2. **Conversa com Processo**
   - ✅ Associar processo, enviar mensagem
   - ✅ Verificar contexto de processo na resposta
   - ✅ Upload de documento, verificar RAG funciona

3. **Comandos**
   - ✅ Enviar `/analise`, verificar execução
   - ✅ Comando inexistente deve ter fallback

4. **Streaming**
   - ✅ Resposta deve aparecer palavra por palavra
   - ✅ Stop generation deve funcionar
   - ✅ Thinking deve aparecer/sumir corretamente

5. **Edge Cases**
   - ✅ Mensagem muito longa (50k+ chars)
   - ✅ Enviar 10 mensagens rápido (stress test)
   - ✅ Fechar aba durante resposta (cleanup)

**Checklist de QA**: 15 cenários, ~2h de teste manual

---

## 7. PLANO DE ROLLBACK

### 7.1 Como Reverter

#### Opção 1: Feature Flag (Se Implementada)
```bash
# Produção
export USE_REFACTORED_SERVICES=false
pm2 restart all
# Tempo: ~1 minuto
```

#### Opção 2: Git Revert
```bash
# Identificar commits da refatoração
git log --oneline --grep="refactor: God functions"

# Reverter (assumindo último commit)
git revert HEAD --no-commit
git commit -m "revert: Rollback God functions refactoring"
git push origin main

# Deploy
./deploy.sh
# Tempo: ~5 minutos
```

#### Opção 3: Redeploy Versão Anterior
```bash
# Docker/K8s
kubectl rollout undo deployment/david-api
# Tempo: ~2 minutos
```

### 7.2 Sinais de Alerta (Quando Reverter)

🚨 **REVERTER IMEDIATAMENTE** se:

| Métrica | Threshold | Como Monitorar |
|---------|-----------|----------------|
| **Taxa de erro** | > 5% de requests | APM dashboard |
| **Latência p95** | > 3000ms (2x baseline) | APM dashboard |
| **Erros de DB** | > 10/min | Error logs |
| **Chat não carrega** | > 3 reports/10min | Support tickets |
| **Mensagens perdidas** | > 1 caso | Audit logs |

⚠️ **INVESTIGAR** se:

| Métrica | Threshold | Ação |
|---------|-----------|------|
| **Latência p95** | Baseline + 100-500ms | Profiling, otimizar |
| **Taxa de erro** | 1-5% | Logs, corrigir bug |
| **Memory leak** | Crescimento constante | Heap dump |

### 7.3 Tempo Estimado de Rollback

- **Com feature flag**: 1-2 minutos
- **Com git revert**: 5-10 minutos
- **Com redeploy anterior**: 2-5 minutos

**RTO (Recovery Time Objective)**: ≤ 10 minutos
**RPO (Recovery Point Objective)**: 0 (sem perda de dados)

---

## 8. RECOMENDAÇÃO FINAL

### 8.1 Fazer Agora ou Depois?

**🟡 FAZER DEPOIS (Não Urgente, Mas Importante)**

**Por quê NÃO fazer agora?**
1. ✅ Sistema está funcionando em produção
2. ⚠️ Cobertura de testes atual é 13% (risco alto)
3. ⚠️ Outras correções críticas têm prioridade maior:
   - Modelo LLM default inexistente (QUEBRA funcionalidade)
   - 64 ocorrências de `any` (type safety)
   - CORS permissivo (segurança)

**Por quê fazer em breve?**
1. 🔴 Manutenibilidade está comprometida (420 linhas)
2. 🔴 Impossível adicionar testes sem refatorar
3. 🔴 Bloqueador para aumentar cobertura de 13% → 70%
4. 🟡 Dificulta onboarding de novos devs

### 8.2 Pré-requisitos Necessários

Antes de iniciar refatoração, completar:

1. ✅ **Aumentar cobertura de testes E2E/integração para 50%+**
   - Criar testes do fluxo atual (baseline)
   - Garantir que refatoração não quebre

2. ✅ **Resolver problemas de alta prioridade**
   - Corrigir modelo LLM default
   - Configurar CORS restritivo
   - Adicionar ESLint rules

3. ✅ **Comunicação com equipe**
   - Alinhar sprint dedicado (1 semana)
   - Feature freeze temporário em davidRouter
   - Definir responsável por rollback

4. ✅ **Infraestrutura de observabilidade**
   - APM configurado (latência, erros)
   - Alertas configurados
   - Dashboard de chat metrics

### 8.3 Nível de Prioridade

**Prioridade: 3/5 (MÉDIA-ALTA)**

**Ranking de Problemas Críticos**:

| # | Problema | Prioridade | Urgência | Justificativa |
|---|----------|----------|----------|---------------|
| 1 | Modelo LLM default inexistente | 5/5 | ALTA | Quebra funcionalidade |
| 2 | Cobertura de testes 13% | 5/5 | ALTA | Risco de regressão |
| 3 | **God Functions (este)** | **3/5** | **MÉDIA** | **Manutenibilidade** |
| 4 | 64 ocorrências de `any` | 3/5 | MÉDIA | Type safety |
| 5 | CORS permissivo | 4/5 | ALTA | Segurança |

**Quando fazer**: Sprint 2-3 (após resolver #1, #2 e #5)

### 8.4 Justificativa

**✅ Benefícios > Riscos** (a longo prazo)

| Aspecto | Score | Comentário |
|---------|-------|------------|
| **Benefício técnico** | 9/10 | Testabilidade, manutenibilidade |
| **Risco de execução** | 6/10 | Médio, mitigável com testes |
| **Custo de time** | 5/10 | 3-5 dias, razoável |
| **Impacto no usuário** | 1/10 | Zero se feito corretamente |
| **Urgência** | 4/10 | Importante, mas não urgente |

**Conclusão**:
- ✅ Fazer, mas não imediatamente
- ✅ Priorizar pré-requisitos (testes, outros bugs)
- ✅ Executar em sprint dedicado com feature freeze
- ✅ Seguir estratégia incremental com rollback preparado

---

## 9. EXEMPLO DE CÓDIGO (Antes vs Depois)

### Antes (210 linhas compactadas)

```typescript
sendMessage: protectedProcedure
  .mutation(async ({ ctx, input }) => {
    // 1. Validação
    const conversation = await getConversationById(input.conversationId);
    if (!conversation || conversation.userId !== ctx.user.id) {
      throw new Error("Conversa não encontrada");
    }

    // 2. Salvar mensagem
    await createMessage({ conversationId, role: "user", content });

    // 3. Sistema de comandos (30 linhas)
    if (input.content.startsWith("/")) {
      // ...
    }

    // 4. Histórico
    const history = await getConversationMessages(input.conversationId);

    // 5. Título automático (30 linhas)
    if (isFirstMessage) {
      // ...
    }

    // 6. RAG (1 linha após refatoração anterior)
    const knowledgeBaseContext = await ragService.buildKnowledgeBaseContext(...);

    // 7. Contexto de processo (70 linhas)
    if (conversation.processId) {
      // ...
    }

    // 8. Montagem de prompt (25 linhas)
    const baseSystemPrompt = `...`;
    const llmMessages = [...];

    // 9. LLM
    const response = await invokeLLM({ messages: llmMessages });
    await createMessage({ role: "assistant", content: response });

    return { content: response };
  })
```

### Depois (~50 linhas)

```typescript
sendMessage: protectedProcedure
  .mutation(async ({ ctx, input }) => {
    // Services
    const conversationService = getConversationService();
    const messageService = getMessageService();
    const promptBuilder = getPromptBuilder();
    const llmService = getLLMService();

    // 1. Validar acesso
    const conversation = await conversationService.validateAccess(
      input.conversationId,
      ctx.user.id
    );

    // 2. Salvar mensagem do usuário
    await messageService.saveUserMessage(input.conversationId, input.content);

    // 3. Tentar executar comando (se houver)
    const commandResult = await conversationService.tryExecuteCommand(
      input.content,
      input.conversationId,
      ctx.user.id,
      conversation.processId
    );
    if (commandResult) {
      await messageService.saveAssistantMessage(input.conversationId, commandResult);
      return { content: commandResult };
    }

    // 4. Ações da primeira mensagem (título em background)
    await conversationService.handleFirstMessageActions(
      input.conversationId,
      input.content,
      conversation.processId
    );

    // 5. Buscar contextos (RAG, processo, casos similares)
    const contexts = await promptBuilder.buildContexts({
      userId: ctx.user.id,
      query: input.content,
      processId: conversation.processId,
    });

    // 6. Montar prompt e mensagens
    const llmMessages = await promptBuilder.buildLLMMessages({
      systemPromptOverride: input.systemPromptOverride,
      contexts,
      conversationId: input.conversationId,
    });

    // 7. Invocar LLM
    const response = await llmService.invoke(llmMessages);

    // 8. Salvar resposta
    await messageService.saveAssistantMessage(input.conversationId, response);

    return { content: response };
  })
```

**Redução**: 210 linhas → ~50 linhas (76% redução)
**Legibilidade**: +300%
**Testabilidade**: 0% → 70%+

---

## 10. CHECKLIST EXECUTIVO

Use este checklist ao decidir quando refatorar:

- [ ] **Pré-requisitos Técnicos**
  - [ ] Cobertura de testes E2E ≥ 50%
  - [ ] APM e alertas configurados
  - [ ] Feature flag implementada (opcional)
  - [ ] Problemas críticos resolvidos (#1, #2, #5)

- [ ] **Pré-requisitos de Time**
  - [ ] Sprint dedicado aprovado (5 dias)
  - [ ] 2+ desenvolvedores disponíveis para review
  - [ ] Feature freeze comunicado
  - [ ] Responsável por rollback definido

- [ ] **Durante Refatoração**
  - [ ] Seguir ordem incremental (10 passos)
  - [ ] Cobertura de testes ≥ 70% em cada service
  - [ ] CI verde em cada PR
  - [ ] Code review por 2+ pessoas

- [ ] **Antes do Deploy**
  - [ ] Testes E2E passando (baseline mantida)
  - [ ] Benchmark de performance ≤ baseline + 100ms
  - [ ] Documentação atualizada
  - [ ] Rollback plan validado

- [ ] **Após Deploy**
  - [ ] Monitorar métricas por 24h
  - [ ] Deploy gradual (10% → 50% → 100%)
  - [ ] Zero tickets críticos
  - [ ] Retrospectiva documentada

---

**Documento criado em**: 2026-01-11
**Próxima revisão**: Após resolver problemas #1, #2, #5
**Contato**: Time de Engenharia
