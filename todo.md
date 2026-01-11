# TODO - DAVID (Assistente Jurídico IA)

> **Última atualização**: 10/01/2026

---

## ✅ Concluído

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

## 🔧 Em Andamento / Pendente Imediato

**Nenhuma tarefa pendente imediata.** O sistema está estável.

---

## 📋 Próximas Prioridades

### Rastreabilidade de Documentos
- [ ] Instrução de extração com número de eventos/páginas
- [ ] Formato: "(Evento X, fls. Y)"
- [ ] Diagnóstico de legibilidade do PDF

### Exportação
- [ ] Exportar minuta para PDF
- [ ] Exportar minuta para DOCX

### Melhorias no Active Learning
- [ ] Interface para aprovação/rejeição de teses pendentes (PENDING_REVIEW)
- [ ] Dashboard de estatísticas de aprendizado
- [ ] Bulk actions (aprovar/rejeitar múltiplas teses)

---

## 🚀 Melhorias Futuras

### Interface
- [ ] Tema escuro/claro
- [ ] Sugestões contextuais durante chat
- [ ] Comando `/precedentes` para busca manual

### Thinking e Performance
- [ ] Otimização de cache de embeddings
- [ ] Monitoring de performance do RAG hybrid
- [ ] Thinking logs para debug de Intent classification

### Integração Avançada
- [ ] Armazenamento de PDFs em S3/R2
- [ ] Sincronização com Google Drive
- [ ] Webhook para atualizações de processo

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
DATABASE_URL      # MySQL/SQLite
JWT_SECRET        # Sessões
GOOGLE_CLIENT_ID  # OAuth
GOOGLE_CLIENT_SECRET
GEMINI_API_KEY    # Opcional (fallback)
OPENAI_API_KEY    # Whisper
```
