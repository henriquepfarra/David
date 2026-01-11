# Tests - DAVID

Testes automatizados para garantir qualidade e prevenir regressões.

## 📁 Estrutura

```
server/__tests__/
├── e2e/                    # Testes End-to-End (fluxos completos)
│   ├── chat-flow.test.ts   # Fluxo de chat (sendMessage)
│   └── streaming-flow.test.ts # Fluxo de streaming SSE
├── helpers/                # Utilitários para testes
│   └── testSetup.ts        # Setup de usuários/conversas de teste
└── README.md              # Este arquivo
```

## 🚀 Executar Testes

### Todos os testes
```bash
npm test
# ou
pnpm test
```

### Modo watch (desenvolvimento)
```bash
npm test -- --watch
# ou
pnpm test --watch
```

### Apenas testes E2E
```bash
npm test -- server/__tests__/e2e
```

### Com coverage
```bash
npm test -- --coverage
```

## ⚙️ Configuração

Os testes usam:
- **Vitest**: Framework de testes
- **Banco de dados real**: Testes E2E usam o banco configurado em `.env`
- **Cleanup automático**: Dados de teste são removidos após cada suite

### Pré-requisitos

**⚠️ IMPORTANTE**: Configure o arquivo `.env` antes de rodar testes!

**Guia completo**: 📚 [TESTING_ENV_SETUP.md](../../docs/TESTING_ENV_SETUP.md)

**Configuração rápida**:

1. **Criar `.env` na raiz do projeto**
   ```bash
   cp .env.test.example .env
   ```

2. **Configurar variáveis obrigatórias**
   ```bash
   DATABASE_URL="mysql://root@localhost:3306/david_test"
   JWT_SECRET="test_secret_dev"
   ```

3. **Criar banco e rodar migrations**
   ```bash
   mysql -u root -e "CREATE DATABASE david_test;"
   npm run db:push
   ```

Se encontrar erro de env vars, consulte: [docs/TESTING_ENV_SETUP.md](../../docs/TESTING_ENV_SETUP.md)

## 📝 Escrevendo Novos Testes

### Teste E2E básico

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestUser, cleanupTestData, createMockContext } from "../helpers/testSetup";
import { davidRouter } from "../../davidRouter";

describe("Meu Teste", () => {
  let testUser;
  let mockContext;

  beforeAll(async () => {
    testUser = await createTestUser();
    mockContext = createMockContext(testUser);
  });

  afterAll(async () => {
    await cleanupTestData(testUser.id);
  });

  it("should work", async () => {
    const caller = davidRouter.createCaller(mockContext);
    const result = await caller.minhaFuncao({ param: "valor" });
    expect(result).toBeDefined();
  });
});
```

### Helpers Disponíveis

- `createTestUser()` - Cria usuário no banco
- `createTestConversation(userId, title?)` - Cria conversa
- `cleanupTestData(userId)` - Remove todos os dados do usuário
- `createMockContext(user)` - Cria contexto tRPC mockado
- `sleep(ms)` - Espera N milissegundos

## 🎯 Cobertura de Testes Atual

**Meta**: 70%+

Para ver cobertura atual:
```bash
npm test -- --coverage
```

## ⚠️ Notas Importantes

### Testes que Chamam LLM

Alguns testes fazem chamadas reais para a API do Gemini:
- ✅ Garantem funcionamento end-to-end
- ⚠️ Consomem créditos da API
- ⚠️ Podem ser lentos (5-30s)
- ⚠️ Requerem `GEMINI_API_KEY` no `.env`

Para pular testes de LLM durante desenvolvimento:
```bash
npm test -- --grep -e "should send a message"
```

### Testes de Streaming

Testes de streaming (`streaming-flow.test.ts`) estão **skip** por padrão porque:
- Requerem servidor HTTP rodando
- Requerem autenticação completa (cookies)
- São complexos de setup

Para habilitá-los:
1. Remover `.skip` dos testes
2. Implementar test server com autenticação
3. Adicionar helper para criar sessão autenticada

## 🐛 Troubleshooting

### "Database not available"
- Verificar `DATABASE_URL` no `.env`
- Verificar se MySQL está rodando
- Rodar `npm run db:push`

### "API Key required"
- Alguns testes precisam de `GEMINI_API_KEY`
- Criar em: https://aistudio.google.com/app/apikey

### Testes timeout
- Aumentar timeout no teste: `it("test", async () => {}, { timeout: 60000 })`
- Verificar se LLM está respondendo

### Cleanup não funciona
- Foreign keys podem bloquear DELETE
- Verificar ordem de cleanup em `testSetup.ts`

## 📚 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
