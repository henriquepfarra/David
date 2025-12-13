# TODO - e-Proc Ghostwriter

## Funcionalidades Principais

### 1. Gestão de Processos
- [x] Schema do banco de dados para processos judiciais
- [x] Interface para cadastro manual de processos
- [x] Listagem de processos cadastrados
- [ ] Visualização detalhada de processo individual
- [ ] Edição de informações processuais
- [x] Exclusão de processos

### 2. Ghostwriter - Geração de Minutas com IA
- [x] Configuração de chave de API LLM pelo usuário
- [x] Interface para seleção de tipo de minuta (sentença, decisão, despacho)
- [x] Geração de minutas baseada em dados do processo
- [x] Histórico de minutas geradas
- [ ] Edição e salvamento de minutas
- [ ] Exportação de minutas (PDF, DOCX)

### 3. Módulo de Jurisprudência
- [x] Interface separada para consulta de jurisprudência
- [ ] Busca por palavras-chave
- [ ] Filtros por tribunal, data, tipo de decisão
- [x] Salvamento de jurisprudências favoritas
- [ ] Integração com geração de minutas

### 4. Autenticação e Autorização
- [x] Sistema de login com Manus OAuth
- [x] Controle de acesso por usuário
- [x] Perfil de usuário com configurações

### 5. Design e UX
- [x] Layout dashboard com sidebar
- [x] Design responsivo
- [ ] Tema escuro/claro
- [x] Feedback visual para ações do usuário

### 6. Testes
- [x] Testes unitários para rotas tRPC
- [x] Validação de schema do banco
- [ ] Testes de integração com LLM

## Bugs

- [x] Corrigir tags <a> aninhadas em componentes Link

- [x] Adicionar item Configurações ao menu de navegação lateral


## Novas Funcionalidades Avançadas

### 1. Configuração Dinâmica de API
- [x] Campo de API Key com salvamento seguro
- [x] Listagem automática de modelos disponíveis via API
- [x] Dropdown de seleção de modelo dinâmico
- [x] Lista estática de fallback para modelos

### 2. Leitura Híbrida de PDFs (CRÍTICO)
- [x] Componente de upload drag & drop para PDFs
- [x] Suporte a múltiplos arquivos
- [x] Pipeline inteligente de processamento:
  - [x] Tentativa 1: Extração de texto nativo (pdfjs-dist)
  - [x] Tentativa 2: OCR client-side (tesseract.js)
  - [x] Tentativa 3: Suporte multimodal (envio de imagens para LLM)
- [x] Sistema de chunking para documentos grandes
- [x] Preview do texto identificado
- [x] Indicador visual do método usado (OCR/Texto Nativo)

### 3. Base de Conhecimento
- [x] Upload de arquivos de referência (DOCX, TXT, PDF)
- [x] Extração e armazenamento de conteúdo
- [x] Injeção de contexto na geração de minutas
- [x] Gerenciamento de documentos de referência


## Configuração do "Cérebro" - David (Assessor JEC)

### System Prompt Especializado
- [x] Implementar system prompt completo do David
- [x] Configurar identidade e propósito (Assessor de Magistrado JEC)
- [x] Adicionar diretrizes de execução e base normativa

### Sistema de Conhecimento Híbrido
- [x] Base Estrutural (arquivos locais da base de conhecimento)
- [x] Base Dinâmica (consulta ao Google Drive)
- [x] Regra de prevalência (Drive > Arquivos Locais)
- [x] Sistema de rastreabilidade de provas

### Comandos Especiais
- [x] Comando /minutar [Veredito] - Redação final
- [x] Comando /consultar [tema] - Pesquisa interna
- [x] Comando /tese - Extração de aprendizado

### Diretrizes de Análise
- [x] Sistema anti-alucinação
- [x] Checagem de jurisprudências
- [x] Citação padronizada de provas
- [x] Estilo e linguagem (DNA do juiz)


## Interface de Configuração do David

- [x] Adicionar campo de edição do System Prompt na página de Configurações
- [x] Salvar System Prompt customizado no banco de dados
- [x] Permitir reset para o System Prompt padrão
- [x] Adicionar upload de arquivos (PDF, DOCX, TXT) na Base de Conhecimento
- [x] Processar arquivos automaticamente e extrair texto


## Bugs Recentes

- [x] Corrigir erro de carregamento do PDF.js worker (CDN externo falhando)


## Extração Automática de Dados Processuais

- [x] Helper de extração de dados com IA (número, partes, vara, assunto, valor, data)
- [x] Rota tRPC para processar PDF e extrair dados
- [x] Interface de upload de PDF na página de Processos
- [x] Pré-preenchimento automático do formulário
- [x] Indicador visual de campos extraídos automaticamente
- [x] Validação e revisão manual antes de salvar


- [x] Corrigir erro de extração quando API key não está configurada (validação e mensagem clara)


## Sistema de Fallback LLM

- [x] Implementar lógica de fallback no ghostwriter (API externa → LLM nativa Manus)
- [x] Implementar lógica de fallback na extração de dados processuais (já usa LLM nativa)
- [x] Atualizar interface para indicar qual LLM está sendo usado
- [x] Adicionar badge/indicador visual do provider ativo


- [x] Corrigir extração de dados processuais para usar LLM nativa como fallback

- [x] Corrigir parse JSON quando LLM retorna resposta em bloco markdown (```json)

- [x] Corrigir erro "Cannot read properties of undefined (reading 'includes')" na página Processos

- [x] Corrigir erro de tipo inválido no campo requests (converter array para string)

- [x] Corrigir erro 404 ao clicar em "Ver Detalhes" do processo (criar página de detalhes)
- [x] Corrigir extração automática que não está preenchendo os campos do formulário
- [x] Investigar por que dados extraídos ainda não preenchem campos (toast aparece mas campos vazios) - RESOLVIDO: Problema era mapeamento de campos PT vs camelCase

## CRÍTICO - Extração ainda não funciona com PDF real do usuário

- [x] Testar extração com PDF real fornecido pelo usuário (40055301620258260009_2b017720bc79dfdcf151566e902840b4.pdf)
- [x] Identificar causa raiz do problema (prompt genérico não eficaz para PDFs longos)
- [x] Implementar correção definitiva e validar com PDF real - RESOLVIDO: Prompt melhorado com instruções específicas para e-Proc TJSP


## Transformação do Ghostwriter em DAVID - Assistente Conversacional

### 1. Renomeação e Identidade
- [x] Renomear "Ghostwriter" para "DAVID" em toda a interface
- [x] Atualizar ícones e branding do assistente

### 2. Interface de Chat Conversacional
- [x] Remover formulário de configuração de geração
- [x] Criar interface de chat completa (estilo ChatGPT)
- [x] Implementar histórico de mensagens na conversa
- [x] Indicador de "digitando..." durante geração
- [ ] Adicionar sugestões contextuais durante o chat (futuro)
- [ ] Suporte a streaming de respostas (futuro)

### 3. Sistema de Conversas
- [x] Schema do banco: tabela de conversas (conversations)
- [x] Schema do banco: tabela de mensagens (messages)
- [x] Rota tRPC: criar nova conversa
- [x] Rota tRPC: listar conversas do usuário
- [x] Rota tRPC: enviar mensagem e receber resposta
- [x] Rota tRPC: deletar conversa
- [x] Sidebar com histórico de conversas

### 4. Painel "Sobre David" (Configurações)
- [x] Criar página de configurações do DAVID
- [x] Editor de System Prompt do DAVID
- [x] Botão para resetar para configuração padrão
- [ ] Salvar configurações personalizadas no banco (implementar persistência)
- [ ] Preview das configurações ativas (futuro)

### 5. Biblioteca de Prompts Especializados
- [x] Schema do banco: tabela de prompts salvos (saved_prompts)
- [x] Interface para criar/editar prompts especializados
- [x] Categorização de prompts (tutela, sentença, decisão, etc.)
- [x] Rota tRPC: salvar novo prompt
- [x] Rota tRPC: listar prompts do usuário
- [x] Rota tRPC: aplicar prompt em conversa
- [ ] Botão para usar prompt durante o chat (integrar UI)
- [ ] Importar prompt exemplo (análise de tutela de urgência)

### 6. Integração com Processos
- [x] Selecionar processo ativo durante conversa
- [x] Injetar dados do processo no contexto do chat
- [ ] Acesso rápido a documentos do processo (futuro)


## Melhorias do DAVID - Fase 2

- [x] Implementar persistência do system prompt customizado no banco (davidConfig)
- [x] Adicionar botão "Usar Prompt" na interface de chat para aplicar prompts salvos
- [x] Criar prompt pré-configurado de tutela de urgência como template inicial
- [x] Testar fluxo completo de aplicação de prompts


## Streaming de Respostas no Chat do DAVID

- [x] Implementar endpoint de streaming no backend usando Server-Sent Events (SSE)
- [x] Atualizar invokeLLM para suportar streaming de tokens (invokeLLMStream)
- [x] Modificar frontend para consumir stream via fetch + ReadableStream
- [x] Exibir texto em tempo real conforme é gerado
- [x] Adicionar botão "Parar Geração" para interromper resposta
- [x] Implementar lógica de cancelamento de stream (AbortController)
- [ ] Testar streaming end-to-end com conversa real


## Melhorias Críticas (Análise Gemini)

- [x] Alterar campos `text` para `longtext` em conteúdos grandes (drafts, messages, knowledgeBase)
- [x] Adicionar índices em `userId` em todas as tabelas para performance (8 índices criados)
- [x] Forçar `json_schema` no processExtractor para garantir JSON válido da IA


## Correção Urgente - Configurações

- [x] Corrigir salvamento de chave de API vazia (não salva quando usuário apaga a key para usar API nativa)


## 🧠 SISTEMA DE APRENDIZADO DO DAVID (PRIORIDADE MÁXIMA)

### Objetivo: DAVID aprende com minutas aprovadas e teses firmadas

### CAMADA 1: Salvamento de Minutas Aprovadas
- [x] Criar tabela `approved_drafts` no banco de dados
  - [x] Campos: id, userId, processId, conversationId, messageId, originalDraft, editedDraft, draftType, approvalStatus, createdAt
- [x] Adicionar botões de ação nas mensagens do DAVID no chat:
  - [x] Botão "✅ Aprovar Minuta" (salva como está)
  - [x] Botão "✏️ Editar e Aprovar" (abre modal de edição)
  - [ ] Botão "❌ Rejeitar" (marca como exemplo negativo - opcional)
- [x] Criar rotas tRPC para salvar minutas aprovadas
- [x] Interface de edição de minuta (modal com textarea)
- [ ] Página de "Minutas Aprovadas" para visualizar histórico

### CAMADA 2: Extração Automática de Teses
- [x] Criar tabela `learned_theses` no banco de dados
  - [x] Campos: id, userId, approvedDraftId, processId, thesis, legalFoundations, keywords, decisionPattern, createdAt
- [x] Implementar extrator automático de teses usando LLM
  - [x] Prompt especializado para extrair ratio decidendi
  - [x] Identificar fundamentos jurídicos (artigos, súmulas)
  - [x] Gerar palavras-chave para indexação
  - [x] Capturar padrão de redação
- [x] Trigger automático: ao aprovar minuta → extrair tese
- [x] Rota tRPC para listar teses aprendidas
- [ ] Interface para visualizar teses extraídas

### CAMADA 3: Memória Contextual e Busca de Precedentes
- [x] Implementar busca semântica de casos similares
  - [x] Comparar assunto/fatos do processo atual com histórico
  - [x] Ranquear por similaridade
- [x] Integrar memória no contexto do DAVID
  - [x] Ao iniciar conversa sobre processo, buscar casos similares
  - [x] Injetar teses relevantes no prompt do DAVID
  - [x] Sugestão automática: "Encontrei X decisões suas similares"
- [ ] Interface de sugestões de precedentes no chat
- [ ] Comando especial `/precedentes` para busca manual

### CAMADA 4: Feedback Loop e Melhoria Contínua
- [ ] Dashboard de aprendizado
  - [ ] Estatísticas: quantas minutas aprovadas, teses extraídas
  - [ ] Taxa de reuso de teses
  - [ ] Temas mais recorrentes
- [ ] Sistema de refinamento de teses
  - [ ] Editar tese extraída manualmente se necessário
  - [ ] Marcar teses como "obsoletas" se mudou entendimento

### Testes
- [x] Teste de salvamento de minuta aprovada
- [x] Teste de extração automática de tese
- [ ] Teste de busca de casos similares
- [ ] Teste de injeção de memória no contexto do DAVID


## Melhorias de UX - Chat do DAVID

- [x] Adicionar botão "Voltar" no cabeçalho do chat do DAVID
- [x] Corrigir seleção de processo no chat do DAVID (não atualiza visualmente e não associa à conversa)

## Gerenciamento de Conversas no DAVID

- [x] Implementar renomear conversa
  - [x] Criar rota tRPC para atualizar título
  - [x] Adicionar botão de edição no histórico
  - [x] Modal ou input inline para renomear
- [x] Melhorar interface de deletar conversa
  - [x] Adicionar botão de deletar no histórico
  - [x] Dialog de confirmação antes de deletar


## Auto-Título de Conversas

- [x] Criar helper para gerar título usando LLM baseado na primeira mensagem
- [x] Integrar geração automática no fluxo de envio de mensagem
- [x] Atualizar conversa com título gerado automaticamente
- [x] Teste de geração de título


## Página "Memória do DAVID"

- [x] Criar componente MemoriaDavid.tsx
- [x] Seção de estatísticas (total de teses, minutas aprovadas, temas mais recorrentes)
- [x] Listagem de teses aprendidas com filtros (tema, data, processo)
- [x] Listagem de minutas aprovadas com busca
- [x] Visualização detalhada de tese (modal)
- [x] Visualização detalhada de minuta (modal)
- [x] Opção de editar tese manualmente
- [x] Opção de marcar tese como obsoleta
- [x] Adicionar rota no App.tsx
- [x] Adicionar link no menu lateral


## Menu de Ferramentas no Chat do DAVID

- [x] Criar componente ToolsMenu com Popover
- [x] Adicionar botão de ferramentas ao lado do input de mensagem
- [x] Categoria "Processos":
  - [x] Selecionar processo ativo
  - [x] Ver dados do processo atual
  - [x] Upload de documentos do processo
- [x] Categoria "Prompts Especializados":
  - [x] Listar prompts salvos
  - [x] Aplicar prompt selecionado
  - [x] Criar novo prompt (redireciona para /prompts)
  - [x] Ir para página de prompts
- [x] Categoria "Memória do DAVID":
  - [x] Buscar precedentes similares (redireciona para /memoria)
  - [x] Ver teses aprendidas (redireciona para /memoria)
  - [x] Consultar minutas aprovadas (redireciona para /memoria)
  - [x] Ir para página Memória
- [x] Categoria "Base de Conhecimento":
  - [x] Upload de jurisprudência (redireciona para /base-conhecimento)
  - [x] Upload de modelo de minuta (redireciona para /base-conhecimento)
  - [x] Gerenciar documentos (redireciona para /base-conhecimento)
  - [x] Ver arquivos disponíveis (redireciona para /base-conhecimento)


## Refatoração da Base de Conhecimento (Separação de Contextos)

### Problema Identificado
- [x] Base de Conhecimento está misturando documentos de referência com documentos de processos
- [x] Necessário separar claramente os dois contextos

### Arquitetura Correta

**📚 Base de Conhecimento (Referência Global)**
- [ ] Minutas antigas de referência (modelos aprovados)
- [ ] Decisões históricas aprovadas
- [ ] Teses jurídicas consolidadas
- [ ] Jurisprudências relevantes
- [ ] Material de estudo e referência

**📂 Documentos do Processo (Específicos por Caso)**
- [ ] PDFs extraídos do e-Proc
- [ ] Documentos anexados ao processo
- [ ] Provas e petições
- [ ] Arquivos relacionados ao caso específico

### Tarefas de Implementação

#### 1. Schema do Banco de Dados
- [x] Criar tabela `process_documents` separada de `knowledge_base`
- [x] Adicionar campo `documentType` em knowledge_base (minuta, decisao, tese, jurisprudencia)
- [x] Migrar dados existentes se necessário

#### 2. Rotas tRPC
- [ ] Criar router `processDocuments` separado
- [ ] Manter router `knowledgeBase` apenas para referências globais
- [ ] Atualizar rotas de upload para diferenciar contextos

#### 3. Interface
- [x] Atualizar página Base de Conhecimento para focar em referências
- [ ] Criar seção de documentos na página de detalhes do Processo (futuro)
- [x] Atualizar Menu de Ferramentas do DAVID para refletir separação
- [x] Remover confusão entre "Upload de documentos" (processo) e "Upload de referências" (base)

#### 4. Carga Inicial
- [x] Receber minutas antigas do usuário
- [x] Processar e carregar na Base de Conhecimento
- [x] Categorizar por tipo (sentença, decisão, despacho, tutela)
- [x] Extrair metadados relevantes

#### 5. Integração com DAVID
- [ ] DAVID deve acessar Base de Conhecimento como referência global
- [ ] DAVID deve acessar Documentos do Processo apenas do processo ativo
- [ ] Atualizar system prompt para refletir essa separação


## Implementação RAG (Retrieval-Augmented Generation)

### Objetivo
Fazer o DAVID usar automaticamente documentos da Base de Conhecimento ao gerar decisões, fundamentando com enunciados, teses e minutas modelo relevantes.

### Arquitetura RAG

**Fluxo:**
1. Usuário pede uma decisão sobre "dano moral por negativação indevida"
2. Sistema gera embedding da consulta
3. Busca documentos similares na Base de Conhecimento (top 3-5)
4. Injeta documentos relevantes no contexto do DAVID
5. DAVID gera decisão fundamentada nos precedentes

### Tarefas de Implementação

#### 1. Schema e Embeddings
- [ ] Adicionar campo `embedding` (JSON) na tabela `knowledgeBase`
- [ ] Criar função `generateEmbedding()` usando API de embeddings
- [ ] Gerar embeddings para todos os documentos existentes

#### 2. Busca Semântica
- [ ] Criar função `searchSimilarDocuments(query, limit)` 
- [ ] Implementar cálculo de similaridade por cosseno
- [ ] Criar rota tRPC `knowledgeBase.search`

#### 3. Integração com DAVID
- [ ] Modificar fluxo de geração para buscar documentos relevantes
- [ ] Injetar documentos encontrados no system prompt
- [ ] Formatar contexto: "Fundamente-se nos seguintes documentos: [docs]"

#### 4. Otimizações
- [ ] Cachear embeddings para evitar recálculo
- [ ] Adicionar filtro por tipo de documento (enunciados, teses, minutas)
- [ ] Limitar tamanho do contexto injetado (max tokens)

#### 5. Testes
- [ ] Testar busca com query sobre "dano moral"
- [ ] Verificar se DAVID cita Enunciado FONAJE relevante
- [ ] Validar qualidade das decisões geradas


## Upload Real de Documentos do Processo

### Objetivo
Implementar upload funcional de documentos (PDFs, DOCX, imagens) vinculados a processos específicos, com armazenamento em S3 e extração de conteúdo para enriquecer o contexto do DAVID.

### Tarefas

#### 1. Schema e Backend
- [ ] Verificar se tabela `processDocuments` existe (já criada na refatoração anterior)
- [ ] Criar rotas tRPC para upload de documentos do processo
  - [ ] `uploadDocument` - Upload de arquivo com S3
  - [ ] `listDocuments` - Listar documentos de um processo
  - [ ] `deleteDocument` - Remover documento
- [ ] Implementar extração de texto de PDFs e DOCX
- [ ] Salvar metadados (nome, tipo, tamanho, URL S3, texto extraído)

#### 2. Interface
- [ ] Atualizar dialog de upload no ToolsMenu (David.tsx)
- [ ] Implementar componente de upload com drag & drop
- [ ] Adicionar preview de arquivos selecionados
- [ ] Mostrar progresso de upload
- [ ] Listar documentos já enviados do processo atual
- [ ] Permitir deletar documentos

#### 3. Integração com DAVID
- [ ] Injetar conteúdo dos documentos do processo no contexto do chat
- [ ] Adicionar seção "Documentos do Processo" no system prompt
- [ ] Permitir que DAVID cite documentos específicos quando relevante

#### 4. Testes
- [ ] Testar upload de PDF
- [ ] Testar upload de DOCX
- [ ] Testar extração de texto
- [ ] Testar listagem de documentos
- [ ] Testar deleção de documentos
- [ ] Testar integração com contexto do DAVID


## Refatoração da Memória do DAVID

### Objetivo
Reorganizar página Memória com abas separadas, seleção múltipla e ações em massa para melhor gerenciamento.

### Nova Estrutura
- [ ] Criar sistema de abas (Teses | Minutas Aprovadas | Temas)
- [ ] Remover dashboard de estatísticas (simplificar interface)
- [ ] Cada aba com sua própria listagem e filtros

### Aba "Teses Aprendidas"
- [ ] Listagem de teses com checkboxes de seleção
- [ ] Seleção múltipla (checkbox "Selecionar Todos")
- [ ] Ações em massa: Deletar selecionadas, Marcar como obsoletas
- [ ] Filtros: por tema, data, status (ativa/obsoleta)
- [ ] Busca por palavras-chave
- [ ] Visualização detalhada (modal)
- [ ] Edição inline ou modal

### Aba "Minutas Aprovadas"
- [ ] Listagem de minutas com checkboxes
- [ ] Seleção múltipla
- [ ] Ações em massa: Deletar selecionadas
- [ ] Filtros: por tipo de minuta, data, processo
- [ ] Busca por conteúdo
- [ ] Visualização detalhada (modal)
- [ ] Link para processo relacionado

### Aba "Temas"
- [ ] Agrupamento automático de teses por palavras-chave
- [ ] Contagem de teses por tema
- [ ] Clicar no tema → filtra teses relacionadas
- [ ] Visualização de nuvem de palavras ou lista
- [ ] Estatísticas: temas mais recorrentes

### Backend
- [ ] Rota tRPC para deletar múltiplas teses
- [ ] Rota tRPC para deletar múltiplas minutas
- [ ] Rota tRPC para marcar múltiplas teses como obsoletas
- [ ] Otimizar queries para performance


## Correção de Extração de PDF no Cadastro de Processo

### Problema
- [x] Erro "API não retornou resposta válida" ao extrair dados de PDF
- [x] Schema JSON com `strict: true` não aceita `type: ["string", "null"]`

### Tarefas
- [x] Investigar código de extração de PDF
- [x] Verificar chamada à API LLM
- [x] Corrigir tratamento de resposta (schema JSON)
- [x] Testar com PDF real

### Resultado
✅ **RESOLVIDO!** Extração funcionando perfeitamente. Todos os campos preenchidos automaticamente.

## Correção de Erros tRPC na Página Inicial

### Problema
- [ ] Erro "Unexpected token '<', "<!doctype "... is not valid JSON" na página inicial
- [ ] tRPC retornando HTML em vez de JSON (indica erro 404/500 no backend)

### Tarefas
- [ ] Verificar logs do servidor para identificar rotas falhando
- [ ] Corrigir rotas problemáticas
- [ ] Testar página inicial sem erros


## Refatoração da Página de Configurações

### Objetivo
Criar interface com abas separadas (System Prompt, API Keys, Base de Conhecimento) e permitir edição completa de todos os documentos da base.

### Tarefas

#### 1. Schema do Banco
- [ ] Adicionar campo `source` em knowledgeBase ('sistema' | 'usuario')
- [ ] Migrar documentos existentes marcando como 'sistema'

#### 2. Interface com Abas
- [ ] Criar componente de abas na página Configurações
- [ ] Aba "System Prompt" - Editor de instruções do DAVID
- [ ] Aba "API Keys" - Configuração de chaves de API  
- [ ] Aba "Base de Conhecimento" - Gerenciar documentos

#### 3. Funcionalidades da Base de Conhecimento
- [ ] Listar documentos com badge "Sistema" ou "Usuário"
- [ ] Upload de novos documentos
- [ ] Editar conteúdo de documento existente (modal com textarea)
- [ ] Substituir arquivo (upload novo arquivo mantendo metadados)
- [ ] Deletar documento (com confirmação)

#### 4. Rotas tRPC
- [ ] Rota para atualizar conteúdo de documento
- [ ] Rota para substituir arquivo de documento
- [ ] Rota para deletar documento da base

## Refatoração da Página de Configurações

- [x] Criar interface com 3 abas separadas (System Prompt, API Keys, Base de Conhecimento)
- [x] Implementar aba System Prompt com editor de instruções
- [x] Implementar aba Base de Conhecimento com visualização de documentos
- [x] Adicionar botões de ação por documento (visualizar, editar, deletar)
- [x] Criar dialog de edição de documentos com textarea
- [x] Criar dialog de confirmação de deleção
- [x] Implementar rotas tRPC: knowledgeBase.update e knowledgeBase.delete
- [x] Implementar funções no db.ts: updateKnowledgeBase e deleteKnowledgeBase
- [x] Adicionar validação de segurança (userId) nas operações de edição/deleção

## Correções Urgentes - Página de Configurações

- [x] Restaurar interface completa de API Keys (campos para Google/OpenAI/Anthropic + seleção de modelo)
- [x] Verificar se System Prompt padrão do DAVID está sendo carregado corretamente - CONFIRMADO: Prompt padrão está intacto e funcionando
- [ ] Corrigir exibição de badges "Sistema" vs "Usuário" na Base de Conhecimento - AGUARDANDO DECISÃO DO USUÁRIO

## Melhorias de Interface - Configurações

- [x] Adicionar cores aos badges de documentos (vermelho para "Sistema", verde para "Usuário")
- [x] Permitir edição do System Prompt padrão do DAVID (carregar prompt padrão no textarea)
- [x] Salvar System Prompt editado no banco de dados
- [x] Atualizar documentos originais no banco para source = "sistema"

## Correção de UX - Menu Lateral

- [x] Garantir que o menu lateral NÃO feche ao clicar em itens de navegação (DAVID, Memória devem manter sidebar aberta)
- [x] Envolver páginas DAVID e Memória do DAVID com DashboardLayout para manter sidebar principal visível

## Melhorias de Interface - DAVID

- [x] Adicionar campo `isPinned` na tabela de conversas (schema + migration)
- [x] Criar rota tRPC para fixar/desafixar conversa
- [x] Implementar menu de contexto (botão direito) nas conversas com opções:
  - [x] Fixar/Desafixar
  - [x] Renomear
  - [x] Excluir
- [x] Implementar modo de seleção múltipla:
  - [x] Botão para ativar/desativar modo de seleção
  - [x] Checkboxes nas conversas
  - [x] Botão "Deletar Selecionadas"
- [x] Ordenar conversas: fixadas primeiro, depois por data
- [x] Escrever testes automatizados para novas funcionalidades (5 testes, 100% passando)


## Limpeza de Interface - Remover Funcionalidades Não Implementadas

- [x] Remover item "Minutas" do menu lateral (DashboardLayout)
- [x] Remover item "Jurisprudência" do menu lateral (DashboardLayout)
- [x] Remover card "Minutas Salvas" da tela inicial
- [x] Remover card "Jurisprudência" da tela inicial
- [x] Adicionar card "Base de Conhecimento" na tela inicial
- [x] Ajustar grid para 3 colunas (md:grid-cols-2 lg:grid-cols-3)
