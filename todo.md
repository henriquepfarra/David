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
