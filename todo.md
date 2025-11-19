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
