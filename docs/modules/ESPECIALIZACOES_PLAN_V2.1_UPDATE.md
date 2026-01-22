# Plano V2.1 - Atualização para Abordagem Híbrida

**Mudança Principal:** Enunciados FONAJE no banco via seed + busca RAG (ao invés de hardcoded no prompt)

## Principais Mudanças

### 1. Prompt do Módulo (Leve)
- **Antes**: ~2500 tokens (inc

luindo todos os enunciados)
- **Depois**: ~800 tokens (só instruções)
- Contém apenas: identidade, estilo, hierarquia, regras procedimentais

### 2. Knowledge Base (Banco de Dados)
- Enunciados FONAJE inseridos via script de seed (uma vez)
- Tabela: `knowledgeBase` (já existe, reusa infraestrutura)
- Embeddings: pré-computados no seed
- Busca: RAG dinâmico (só retorna relevantes)

### 3. Fluxo de Execução

```
1. Prompt JEC (~800 tokens) - instruções fixas
2. RAG busca enunciados relevantes (~400 tokens) - dinâmico
3. Contexto final = 1 + 2 = ~1200 tokens (ao invés de 2500)
```

## Script de Seed

```typescript
// server/scripts/seedFONAJE.ts

import { generateEmbedding } from '../_core/embeddings';
import { db } from '../db';
import { knowledgeBase } from '../../drizzle/schema';

const FONAJE_ENUNCIADOS = [
  { numero: 1, content: "..." },
  { numero: 2, content: "..." },
  // ... 170 enunciados
];

async function seedFONAJE() {
  for (const enunciado of FONAJE_ENUNCIADOS) {
    const embedding = await generateEmbedding(enunciado.content);
    
    await db.insert(knowledgeBase).values({
      title: `Enunciado ${enunciado.numero} - FONAJE`,
      content: enunciado.content,
      documentType: 'enunciado',
      source: 'FONAJE',
      category: 'JEC',
      embedding, // ✅ Gerado uma vez
      metadata: { numero: enunciado.numero }
    });
  }
}
```

## Integração com davidRouter

```typescript
// Já funciona! RagService busca automaticamente

const systemPrompt = getModulePrompt('jec'); // 800 tokens

const knowledge = await getRagService().buildKnowledgeBaseContext(
  userId,
  userMessage // RAG busca enunciados relevantes
);

const finalPrompt = systemPrompt + '\n\n' + knowledge; // ~1200 tokens
```

## Vantagens

✅ **Reusa infra existente** - mesma tabela e RAG que súmulas  
✅ **Economia de tokens** - 1200 vs 2500 (52% menos)  
✅ **Busca só relevantes** - não injeta todos os enunciados  
✅ **Escalável** - pode ter 1000+ enunciados sem problema  
✅ **Manutenção simples** - rodar seed quando atualizar FONAJE

## Tarefas de Implementação

- [ ] Criar `server/scripts/seedFONAJE.ts` com todos os enunciados
- [ ] Modificar prompts dos módulos para serem leves (só instruções)
- [ ] Rodar seed: `pnpm tsx server/scripts/seedFONAJE.ts`
- [ ] Testar que RAG encontra enunciados corretamente
- [ ] Verificar economia de tokens no log
