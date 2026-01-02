# Análise Detalhada: Schema vs Plano Seed

## Objetivo
Comparar o schema atual da `knowledgeBase` com o plano proposto pelo Gemini e identificar ajustes necessários.

---

## Schema Atual da `knowledgeBase`

```typescript
// Localização: drizzle/schema.ts (linhas 133-152)
export const knowledgeBase = mysqlTable("knowledgeBase", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: longtext("content").notNull(),
  fileType: varchar("fileType", { length: 50 }),
  documentType: mysqlEnum("documentType", [
    "minuta_modelo", "decisao_referencia", "tese", 
    "enunciado", "jurisprudencia", "outro"
  ]).notNull().default("outro"),
  source: mysqlEnum("source", ["sistema", "usuario"]).notNull().default("usuario"),
  category: varchar("category", { length: 100 }),
  tags: text("tags"),
  embedding: json("embedding"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

---

## Comparação: Plano Gemini vs Schema Atual

| Campo no Plano | Existe no Schema? | Mapeamento |
|----------------|-------------------|------------|
| `id` (SUMULA_STJ_54) | ❌ Não existe | **PRECISA ADICIONAR** |
| `titulo` | ✅ Sim | `title` |
| `conteudo` | ✅ Sim | `content` |
| `tipo` | ✅ Sim | `documentType` |
| `tags` | ✅ Sim | `tags` |
| `isSystem` | ✅ Parcial | Usar `source = 'sistema'` |
| `embedding` | ✅ Sim | `embedding` |

---

## Ajustes Necessários

### 1. ⚠️ Campo `systemId` (CRÍTICO)

**Problema:** O plano usa `id: "SUMULA_STJ_54"` como identificador único para controle de upsert, mas o schema só tem `id` auto-increment numérico.

**Solução A:** Adicionar campo `systemId varchar(100)` único para documentos de sistema.

```typescript
// Adicionar ao schema:
systemId: varchar("systemId", { length: 100 }).unique(), // Ex: "SUMULA_STJ_54"
```

**Solução B:** Usar `title` como chave única para documentos de sistema.
- Problema: Título pode mudar, "Súmula 54 STJ" vs "Súmula STJ 54"

**Recomendação:** Solução A (adicionar `systemId`)

---

### 2. ✅ userId para Sistema

**Problema:** O plano usa `userId: 1` hardcoded.

**Solução:** Criar um usuário "SYSTEM" com ID fixo ou usar `userId` nullable para sistema.

**Recomendação:** Manter `userId: 1` mas garantir que esse usuário (admin) nunca seja deletado. Alternativa: criar usuário ID 0 ("SYSTEM").

---

### 3. ✅ documentType suficiente

**Status:** O enum `documentType` já suporta:
- `enunciado` → Enunciados FONAJE/FOJESP
- `jurisprudencia` → Súmulas (pode renomear para `sumula` se preferir)
- `tese` → Temas Repetitivos

**Recomendação:** Adicionar `sumula` e `tema_repetitivo` ao enum para clareza.

```typescript
documentType: mysqlEnum("documentType", [
  "minuta_modelo", "decisao_referencia", "tese", 
  "enunciado", "jurisprudencia", "outro",
  "sumula", "tema_repetitivo" // ADICIONAR
]).notNull().default("outro"),
```

---

### 4. ✅ generateEmbedding disponível

**Status:** Função existe em `server/_core/embeddings.ts`

**Verificado:** Aceita `(text: string, apiKey?: string)` e retorna `Promise<number[]>`

**Ajuste necessário:** O script de seed precisa de uma API key. Opções:
- Usar variável de ambiente `SEED_API_KEY`
- Usar a API key do usuário admin do banco

---

### 5. ✅ source já distingue sistema/usuário

**Status:** Campo `source` com enum `["sistema", "usuario"]` já existe.

**Implementação na UI:** Badge "Sistema" quando `source = 'sistema'`, sem botão deletar.

---

## Alterações no Schema (Migration)

```sql
-- Migration: add_systemId_and_extra_documentTypes

-- 1. Adicionar campo systemId
ALTER TABLE knowledgeBase ADD COLUMN systemId VARCHAR(100) UNIQUE;

-- 2. Adicionar novos tipos de documento (se MySQL suportar ALTER ENUM)
-- Nota: MySQL não suporta ALTER ENUM diretamente, precisa de workaround
```

---

## Resumo de Tarefas

| # | Tarefa | Prioridade | Complexidade |
|---|--------|------------|--------------|
| 1 | Adicionar campo `systemId` ao schema | Alta | Baixa |
| 2 | Adicionar `sumula`, `tema_repetitivo` ao enum | Média | Média |
| 3 | Criar pasta `server/data/` | Alta | Baixa |
| 4 | Criar script `seed-knowledge.ts` | Alta | Média |
| 5 | Ajustar UI para ocultar delete em `source=sistema` | Média | Baixa |
| 6 | Adicionar comando `pnpm run seed:knowledge` | Alta | Baixa |

---

## Recomendação Final

O plano do Gemini é **sólido** e **compatível** com o schema atual. Os únicos ajustes necessários são:

1. **Obrigatório:** Adicionar campo `systemId` para controle de upsert
2. **Opcional:** Expandir enum `documentType` com `sumula` e `tema_repetitivo`
3. **Já funciona:** `source`, `tags`, `embedding`

**Posso prosseguir com a implementação após sua aprovação.**
