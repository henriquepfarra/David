# Relatório de Estabilidade e Segurança - 11/02/2026

## Resumo da Sessão

Nesta sessão, focamos em resolver problemas críticos de estabilidade e segurança identificados no documento `CORRECOES_PENDENTES.md`. As alterações visaram eliminar vazamentos de memória, prevenir travamentos por requisições externas e melhorar a defesa contra ataques XSS.

## Alterações Realizadas

### 1. Vazamento de Memória no Streaming (C2)
- **Status:** ✅ Concluído
- **Arquivo:** `server/_core/index.ts`
- **Problema:** Conexões de streaming (SSE) permaneciam ativas no servidor mesmo após o cliente desconectar, consumindo memória e descritores de arquivo.
- **Correção:** Implementada lógica para escutar o evento `close` da resposta HTTP (`res.on('close')`). Uma flag de controle interrompe imediatamente o loop de geração da LLM quando a desconexão é detectada.

### 2. Timeout em Requisições LLM (C3)
- **Status:** ✅ Concluído
- **Arquivo:** `server/_core/llm.ts`
- **Problema:** As chamadas para APIs de IA (OpenAI, Gemini, etc.) não possuíam timeout. Em casos de falha de rede ou travamento da API externa, a thread do Node.js poderia ficar bloqueada indefinidamente aguardando resposta.
- **Correção:** Utilizado `AbortController` em todas as chamadas `fetch` (`invokeLLM`, `invokeLLMStream`, `invokeLLMStreamWithThinking`).
  - **Timeout:** Definido em 30 segundos para estabelecimento da conexão.
  - **Comportamento:** Se a API não responder em 30s, a requisição é abortada e um erro específico é lançado, liberando os recursos do servidor.

### 3. Content Security Policy (CSP) (A1)
- **Status:** ✅ Concluído
- **Arquivo:** `server/_core/index.ts`
- **Problema:** A aplicação não enviava cabeçalhos CSP, deixando o frontend vulnerável a ataques de Cross-Site Scripting (XSS) e injeção de dados.
- **Correção:** Integrado o middleware `helmet` com uma configuração de CSP estrita porém compatível:
  - `defaultSrc`: `'self'`
  - `scriptSrc`: `'self'`, `'unsafe-inline'` (necessário para scripts de hidratação do React)
  - `connectSrc`: `'self'`, Google APIs (para Gemini nativo), Sentry
  - `imgSrc`: `'self'`, `data:`, `https:`

## Verificação e Testes

- **Streaming:** Validado que o servidor detecta desconexão do cliente e para o processamento.
- **LLM Timeout:** Validado que requisições demoradas são canceladas corretamente.
- **CSP:** Confirmada a presença do header `Content-Security-Policy` nas respostas do servidor.

## Próximos Passos Prioritários

1. **Rate Limiting (C1):** Ainda pendente. É a próxima prioridade crítica de segurança para prevenir abuso dos endpoints públicos.
2. **Circuit Breaker (A2):** Adicionar proteção extra para falhas recorrentes nas APIs de IA.
