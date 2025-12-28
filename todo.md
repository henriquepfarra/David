# TODO - DAVID (Assistente Jurídico IA)

> **Última atualização**: 27/12/2025

---

## ✅ Concluído

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

### Interface
- [x] Layout dashboard com sidebar
- [x] Menu de ferramentas no chat
- [x] Página Memória do DAVID
- [x] Página de Processos
- [x] Botão "Enviar Processo" (renomeado)

---

## 🔧 Em Andamento / Pendente Imediato

### Upload Melhorado (Fase Final)
- [x] File API retorna `fileUri` para sessão
- [ ] Armazenar `fileUri` por conversa para consultas múltiplas
- [ ] Deletar arquivo do Google ao sair do chat
- [ ] Alerta se processo já existe em outro chat

### UX do Chat
- [ ] Referência visual do processo anexado no chat
- [ ] Indicador de "processo ativo" mais claro

---

## 📋 Próximas Prioridades

### RAG - Busca Semântica na Base de Conhecimento
- [ ] Adicionar campo `embedding` em `knowledgeBase`
- [ ] Gerar embeddings para documentos existentes
- [ ] Função `searchSimilarDocuments(query, limit)`
- [ ] Injetar documentos relevantes no contexto do DAVID

### Rastreabilidade de Documentos
- [ ] Instrução de extração com número de eventos/páginas
- [ ] Formato: "(Evento X, fls. Y)"
- [ ] Diagnóstico de legibilidade do PDF

### Exportação
- [ ] Exportar minuta para PDF
- [ ] Exportar minuta para DOCX

---

## 🚀 Melhorias Futuras

### Interface
- [ ] Tema escuro/claro
- [ ] Sugestões contextuais durante chat
- [ ] Comando `/precedentes` para busca manual

### Memória do DAVID
- [ ] Interface com abas (Teses | Minutas | Temas)
- [ ] Seleção múltipla e ações em massa
- [ ] Dashboard de estatísticas de aprendizado

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
