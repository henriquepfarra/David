# TODO - DAVID (Assistente Jurídico IA)

> **Última atualização**: 27/01/2026

---

## ✅ Concluído

### Beta Readiness - Produção (Janeiro/2026)
- [x] **Segurança de API Keys**: Usuários usam suas próprias chaves para LLM
  - Removido fallback perigoso em `llm.ts`
  - `thesisExtractor.ts` requer apiKey como parâmetro
  - `extractFromPDF` requer chave do usuário
  - Features de UX (títulos, enhance) usam chave do sistema (baixo custo)
- [x] **Feature Flag**: `FEATURES.AUDIO_TRANSCRIPTION = false` para beta
- [x] **Monitoramento Sentry**: Integração frontend + backend
  - ErrorBoundary no React para erros não tratados
  - Captura de erros tRPC (exceto auth)
  - Captura de erros 5xx no backend
  - Remoção de dados sensíveis antes do envio
- [x] **Documentação**: `docs/reports/BETA_READINESS.md` com roadmap e guia de escalabilidade
- [x] **README.md**: Root consolidado com modelos Next-Gen (Gemini 3, GPT-5.2) e planos BYOK

### Estabilização MVP (Janeiro/2026)
- [x] **Loop of Death corrigido**: Hook `useConversationId` como fonte única de verdade
- [x] **LLM model default**: Fallback para `gemini-2.5-flash` quando não configurado
- [x] **Cleanup código morto**: David.tsx -38% linhas (2.924 → 1.820), -37% useState (46 → 29)
- [x] **Upload PDF estável**: Não trava mais, navegação funciona corretamente

### Manutenção e Refatoração (30/12/2025)
- [x] **Limpeza de UI**: Remoção de 21 componentes e libs não utilizados (Shadcn UI orphans)
- [x] **Limpeza de Backend**: Remoção de rotas obsoletas (`draftGenerator`) e scripts de debug
- [x] **Segurança de Tipos**: Refatoração do `server/db.ts` eliminando 100% dos `any` types
- [x] **Segurança de Acesso**: Proteção da rota `localLogin` (apenas DEV)

### Infraestrutura Core
- [x] Schema do banco de dados com Drizzle ORM
- [x] Autenticação com Google OAuth
- [x] Sistema de sessões e controle de acesso
- [x] Configurações de API por usuário

### DAVID - Chat Conversacional
- [x] Interface de chat estilo ChatGPT
- [x] Histórico de conversas (listar, criar, deletar)
- [x] Streaming de respostas (SSE)
- [x] Renomear conversas
- [x] Fixar/desafixar conversas (pin)
- [x] Seleção múltipla para deletar
- [x] Menu de contexto (botão direito)
- [x] Auto-título de conversas via LLM

### Upload e Leitura de PDFs
- [x] Drag & drop de arquivos
- [x] **Leitura visual via Google File API** (novo!)
- [x] Extração de metadados (número, partes, vara, assunto)
- [x] **Barra de progresso animada durante upload** (novo!)
- [x] **Upload não reinicia mais a conversa** (corrigido!)
- [x] Modelos Gemini atualizados com preços corretos
- [x] **Armazenamento de fileUri por conversa** (googleFileUri + googleFileName)
- [x] **Cleanup automático de arquivos** (ao sair do chat, deletar conversa, fechar navegador)
- [x] Alerta se processo já existe em outro chat

### Sistema de Aprendizado
- [x] Tabela `approved_drafts` para minutas aprovadas
- [x] Tabela `learned_theses` para teses extraídas
- [x] Botões "Aprovar" e "Editar e Aprovar" em minutas
- [x] Extração automática de teses ao aprovar
- [x] **Botões só aparecem em minutas reais** (corrigido!)

### Transcrição de Áudio
- [x] **Integração com OpenAI Whisper** (novo!)
- [x] Gravação de áudio no navegador
- [x] Transcrição em tempo real

### Configurações
- [x] Editor de System Prompt
- [x] Configuração de API Keys (Google, OpenAI, Anthropic)
- [x] Seleção de modelo LLM
- [x] **Configuração de modelo para leitura de PDFs** (novo!)
- [x] Base de conhecimento com upload
- [x] **Fix: Anthropic auth headers corrigidos** (x-api-key + anthropic-version)

### RAG e Busca Semântica (Janeiro/2026)
- [x] **Busca Híbrida**: TF-IDF (exata) + embeddings (semântica)
- [x] **Embeddings em 3 tabelas**: knowledgeBase, learnedTheses, processDocumentChunks
- [x] **RagService completo**: search, searchWithHierarchy, searchLegalTheses, searchWritingStyle
- [x] **Cache LRU** para performance
- [x] **Hierarquia de autoridade jurídica**: Vinculante > STF > STJ > FONAJE
- [x] **Busca dual de teses**: Argumentação (thesis) + Estilo (writing)

### IntentService - Orquestração Cognitiva (Janeiro/2026)
- [x] **IntentService v7.1**: Router Semântico
- [x] Classificação heurística (padrões rápidos)
- [x] Classificação com LLM (Gemini Flash)
- [x] Ativação seletiva de motores (A: Detetive, B: Redação, C: Jurista, D: Auditor)
- [x] Escopo RAG dinâmico (NONE, JURISPRUDENCE, PRECEDENTS, FULL)
- [x] Filtros por tribunal (STJ, STF)

### Active Learning v2.0 (Janeiro/2026)
- [x] **ThesisLearningService v2.0**: Extração automática ao aprovar minuta
- [x] **Separação Tese vs Estilo**: legalThesis + writingStyleSample
- [x] **Embeddings duais**: thesisEmbedding + styleEmbedding
- [x] **Quality Gate**: Status workflow (PENDING_REVIEW, ACTIVE, REJECTED)
- [x] Integração com davidRouter (trigger assíncrono)
- [x] Busca semântica dual no RagService

### Intelligence - Memória Jurídica (Janeiro/2026)
- [x] **Frontend completo** em /pages/Intelligence/
- [x] Componente PendingTheses (revisão de teses pendentes)
- [x] Componente KnowledgeLibrary (biblioteca de conhecimento)
- [x] ThesisCard e StatsWidget
- [x] Item na sidebar com badge

### Interface
- [x] Layout dashboard com sidebar
- [x] Menu de ferramentas no chat
- [x] **Página Memória do DAVID / Intelligence**
- [x] Página de Processos
- [x] Botão "Enviar Processo" (renomeado)
- [x] Referência visual do processo anexado no chat
- [x] Indicador de "processo ativo" mais claro

---

## 🔧 Em Andamento (Semana 2: Features Jurídicas + Fixes Core)

### 2A. Sistema de Teses (Aprendizado Ativo) - Prioridade Alta
- [ ] **UI de revisão de teses pendentes** `PendingTheses.tsx` (Já existe backend)
- [ ] **Dialog de revisão** `ThesisReviewDialog.tsx` (Aprovar/Rejeitar/Editar)
- [ ] **Badge de pendentes** no sidebar `DashboardLayout.tsx`
- [ ] **Tab "Pendentes"** na página Memória `MemoriaDavid.tsx`

### 2B. Análise de Petições (Novo Intent)
- [ ] **IntentService com fileUri**: Classificar considerando upload visual (Fix #8)
- [ ] Intent `PETITION_ANALYSIS` no `IntentService.ts`
- [ ] Prompt estruturado para análise de peças
- [ ] Integração com `DavidRouter` (`/analisar` ou detecção)

### 2C. Melhorar Contexto e Resposta
- [ ] **Thinking vs Resposta**: Integridade check no System Prompt (Fix #2)
- [ ] **Rastreabilidade**: Prompt citando "pág. X" sempre que usar PDF (Fix #4)
- [ ] **DB Súmulas**: Validar separação System/User no RAG (Fix #1)
- [ ] Verificar integração `File API` no `ContextBuilder`

---

## 📋 Próximas Prioridades (Semana 3: UI Polish)

### UI/UX Profissional
- [ ] **Badge de arquivos**: Visualização melhorada no chat (Fix #5)
- [ ] **Comandos prontos**: Atalhos `/analisar`, `/resumir` (Fix #7)
- [ ] **API Keys**: Revisão da UX de chaves (Fix #3)
- [ ] **Módulos de Gabinete**: Investigar e definir (Fix #6)
- [ ] **Empty States**: Chat vazio, listas vazias, inbox zero
- [ ] **Loading States**: Skeletons consistentes
- [ ] **Feedback de Upload**: Barra de progresso visível

### Backlog Pós-MVP
- [ ] Exportação de minutas (PDF/DOCX)
- [ ] Interface avançada de Knowledge Base
- [ ] Refatoração profunda do `David.tsx`
- [ ] Aumentar cobertura de testes para 70%

---

## 🐛 Bugs Conhecidos

- [ ] Streaming pode parecer lento (depende do modelo e rede)
- [ ] Erro tRPC na página inicial (às vezes retorna HTML)

---

## 📝 Notas de Arquitetura

### APIs Utilizadas
| Serviço | Uso | Custo |
|---------|-----|-------|
| Google Gemini | LLM principal + File API | Por tokens |
| OpenAI Whisper | Transcrição de áudio | $0.006/min |
| OpenAI GPT-4 | LLM alternativo | Por tokens |
| Anthropic Claude | LLM alternativo | Por tokens |

### Variáveis de Ambiente
```env
# Core (obrigatórias)
DATABASE_URL      # MySQL (produção) ou SQLite (dev)
JWT_SECRET        # Sessões (mínimo 32 caracteres)

# OAuth (opcional)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# LLM - Sistema (para features de baixo custo)
GEMINI_API_KEY    # Geração de títulos, enhance prompt

# Monitoramento (recomendado para produção)
SENTRY_DSN        # Backend
VITE_SENTRY_DSN   # Frontend (prefixo VITE_ obrigatório)
```

### Documentação Relacionada
- [Beta Readiness](docs/reports/BETA_READINESS.md) - Segurança, monitoramento e escalabilidade
- [MVP Roadmap](docs/reports/MVP_ROADMAP.md) - Plano de funcionalidades
