# 🔧 Como Resolver Problemas de Variáveis de Ambiente nos Testes

## 📋 O Problema

Você está vendo este erro ao rodar testes:

```
⚠️  [Test Setup] Missing environment variables: DATABASE_URL, JWT_SECRET
   Alguns testes podem falhar. Certifique-se de ter um arquivo .env na raiz do projeto.
```

Isso significa que o arquivo `.env` não existe ou está incompleto.

---

## 🚂 Você usa Railway? Leia isto primeiro!

Se você já tem `.env` configurado com banco Railway (produção/desenvolvimento), **NÃO** use esse banco para testes!

### ⚠️ Por que não usar Railway para testes?

- Testes criam e deletam dados constantemente
- Pode causar lentidão (latência de rede)
- Pode interferir com dados reais
- Pode gerar custos desnecessários

### ✅ Solução Recomendada: `.env.test` com SQLite

Crie um arquivo `.env.test` na raiz do projeto com banco **local** para testes:

```bash
# .env.test (arquivo separado para testes)
DATABASE_URL="file:./test.db"
JWT_SECRET="test_secret_development_only"
GEMINI_API_KEY=""  # Deixe vazio para pular testes de LLM
NODE_ENV="test"
```

**Como funciona**:
1. Setup de testes tenta carregar `.env.test` primeiro
2. Se não existir, usa `.env` (seu Railway)
3. Se Railway detectado, mostra aviso mas permite rodar

**Comandos**:
```bash
# 1. Criar .env.test
cat > .env.test << 'EOF'
DATABASE_URL="file:./test.db"
JWT_SECRET="test_secret_dev"
GEMINI_API_KEY=""
NODE_ENV="test"
EOF

# 2. Rodar migrations no SQLite
npm run db:push

# 3. Rodar testes
npm test
```

### Alternativa: Banco Railway Separado para Testes

Se preferir não usar SQLite, crie um segundo banco Railway **apenas para testes**:

1. Criar novo banco no Railway (ex: "david-test")
2. Copiar DATABASE_URL do Railway
3. Criar `.env.test` com essa URL
4. Rodar `npm run db:push`

**Vantagem**: Testa com MySQL real (igual produção)
**Desvantagem**: Latência de rede, custos

---

## ✅ Solução Rápida para MySQL Local (3 Passos)

### **Passo 1: Criar arquivo `.env`**

```bash
# Na raiz do projeto (/home/user/David/)
cp .env.test.example .env
```

Se `.env` já existe, apenas adicione as variáveis que faltam.

### **Passo 2: Configurar variáveis obrigatórias**

Edite o arquivo `.env` e configure:

```bash
# OBRIGATÓRIO: Banco de dados de teste
# ⚠️  Use um banco SEPARADO para testes (não produção!)
DATABASE_URL="mysql://root@localhost:3306/david_test"

# OBRIGATÓRIO: Secret para JWT
# Pode ser qualquer string em testes
JWT_SECRET="test_secret_development_only"
```

### **Passo 3: Criar banco de teste**

```bash
# MySQL
mysql -u root -e "CREATE DATABASE IF NOT EXISTS david_test;"

# Rodar migrations
npm run db:push
```

---

## 🎯 Configuração Completa (Opcional)

### Variáveis Adicionais

```bash
# Google OAuth (opcional - apenas se testar login)
GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-secret"

# Gemini API (opcional - apenas para testes com LLM real)
# ⚠️  Testes com LLM real consomem créditos da API!
# Deixe vazio para pular esses testes
GEMINI_API_KEY=""

# OpenAI (opcional - apenas para testes de transcrição)
OPENAI_API_KEY=""

# Server
PORT=3001
NODE_ENV="test"
```

---

## ✓ Verificar se Funcionou

```bash
npm test
```

**Esperado**:
```
✅ [Test Setup] Environment loaded from .env
   DATABASE_URL: ✓ configured
   JWT_SECRET: ✓ configured
```

---

## 🔍 Como Funciona Internamente

### 1. **Setup File** (`server/__tests__/setup.ts`)

Este arquivo carrega o `.env` **ANTES** de qualquer teste rodar:

```typescript
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env") });
```

### 2. **vitest.config.ts**

```typescript
test: {
  setupFiles: ["./server/__tests__/setup.ts"], // ← Roda ANTES de tudo
  // ...
}
```

### 3. **Ordem de Execução**

```
1. Vitest inicia
2. ↓ Carrega setupFiles
3. ↓ setup.ts carrega .env
4. ↓ process.env.DATABASE_URL está disponível
5. ↓ Testes rodam normalmente
```

---

## 🐛 Troubleshooting

### Problema: "DATABASE_URL: ✗ missing" mesmo após criar .env

**Causa**: Arquivo `.env` não está na raiz do projeto

**Solução**:
```bash
# Verificar localização
pwd  # Deve ser /home/user/David

# Criar .env no local correto
cat > .env << 'EOF'
DATABASE_URL="mysql://root@localhost:3306/david_test"
JWT_SECRET="test_secret_dev"
EOF
```

### Problema: Testes falam que banco não existe

**Causa**: Banco `david_test` não foi criado

**Solução**:
```bash
# Criar banco
mysql -u root -e "CREATE DATABASE david_test;"

# Rodar migrations
npm run db:push
```

### Problema: ".env already exists"

**Solução**: Não sobrescrever! Apenas adicionar variáveis que faltam:

```bash
# Ver o que falta
cat .env

# Adicionar manualmente ou:
echo 'DATABASE_URL="mysql://root@localhost:3306/david_test"' >> .env
echo 'JWT_SECRET="test_secret_dev"' >> .env
```

### Problema: Testes com LLM falham

**Causa**: `GEMINI_API_KEY` não configurado ou inválido

**Solução**:

**Opção A**: Pular testes de LLM
```bash
# Deixar vazio no .env
GEMINI_API_KEY=""

# Testes que chamam LLM serão pulados automaticamente
```

**Opção B**: Configurar API key
```bash
# Obter em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="AIzaSy..."

# ⚠️  Atenção: consome créditos da API!
```

---

## 📦 Estrutura Final

```
/home/user/David/
├── .env                           # ← SEU ARQUIVO (não commitado)
├── .env.example                   # Template de exemplo
├── .env.test.example              # Template para testes
├── vitest.config.ts               # Configuração do Vitest
└── server/
    └── __tests__/
        └── setup.ts               # Setup que carrega .env
```

---

## ⚠️ Segurança

### ❌ NÃO Committar .env

O `.env` está no `.gitignore`. **NUNCA** commite credenciais!

```bash
# Verificar se está ignorado
git status  # .env não deve aparecer
```

### ✅ Use Banco Separado

**NUNCA** rode testes no banco de produção!

```
❌ DATABASE_URL="mysql://prod-server/david"        # NÃO!
✅ DATABASE_URL="mysql://localhost/david_test"     # SIM!
```

### ✅ Secrets de Teste

Use secrets **diferentes** para testes:

```bash
# Desenvolvimento
JWT_SECRET="test_secret_development_only"

# Produção (em outro arquivo)
JWT_SECRET="ZxY9...random-256-bits..."  # Gerado com `openssl rand -hex 32`
```

---

## 🚀 Próximos Passos

Após configurar `.env`:

1. ✅ Rodar testes: `npm test`
2. ✅ Verificar cobertura: `npm test -- --coverage`
3. ✅ Modo watch: `npm test -- --watch`

**Documentação adicional**:
- [Testes README](../server/__tests__/README.md)
- [.env.test.example](../.env.test.example)

---

## 📞 Ajuda

Se ainda tiver problemas, verifique:

1. ✅ Arquivo `.env` existe na raiz
2. ✅ Tem permissão de leitura (`chmod 644 .env`)
3. ✅ Banco de dados está rodando
4. ✅ Variáveis não têm espaços extras

**Comando debug**:
```bash
# Ver se .env está sendo lido
cat .env

# Testar conexão com banco
mysql -u root -e "USE david_test; SHOW TABLES;"
```
