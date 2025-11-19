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
