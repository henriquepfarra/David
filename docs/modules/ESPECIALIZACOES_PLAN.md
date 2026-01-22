# Plano de Implementação: Módulo de Especializações em Áreas do Direito

**Data de Criação**: 18/01/2026
**Autor**: David AI Team
**Status**: 📋 Planejado
**Prioridade**: Pós-MVP (Fase 2)

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Problema e Motivação](#2-problema-e-motivação)
3. [Arquitetura Proposta](#3-arquitetura-proposta)
4. [Modelo de Dados](#4-modelo-de-dados)
5. [Backend: Módulo de Especializações](#5-backend-módulo-de-especializações)
6. [Especialização JEC (Primeira Implementação)](#6-especialização-jec-primeira-implementação)
7. [Integração com Sistema Existente](#7-integração-com-sistema-existente)
8. [Frontend: Interface do Usuário](#8-frontend-interface-do-usuário)
9. [Fluxo do Usuário](#9-fluxo-do-usuário)
10. [Plano de Implementação](#10-plano-de-implementação)
11. [Testes e Validação](#11-testes-e-validação)
12. [Futuras Especializações](#12-futuras-especializações)
13. [Riscos e Mitigações](#13-riscos-e-mitigações)

---

## 1. Visão Geral

### 1.1 O Que É

O **Módulo de Especializações** permite que o David seja "especializado" em áreas específicas do Direito, funcionando como expansões que injetam:

- **Conhecimento específico** (súmulas, enunciados, jurisprudência da área)
- **Modelos de minuta** (templates próprios do usuário e/ou pré-configurados)
- **Instruções de estilo** (como redigir para aquela área/órgão)
- **Regras procedimentais** (prazos, recursos, peculiaridades processuais)
- **Documentos do usuário** (minutas aprovadas, jurisprudência local, modelos)

### 1.2 Benefícios

| Benefício | Descrição |
|-----------|-----------|
| **Personalização** | David adapta-se ao estilo e necessidades do juiz |
| **Precisão** | Respostas baseadas em fontes específicas da área |
| **Aprendizado** | Incorpora experiência prévia do usuário |
| **Consistência** | Mantém padrão de redação por área |
| **Escalabilidade** | Novas áreas adicionadas como módulos |

### 1.3 Primeira Especialização: JEC

A implementação piloto será o **Juizado Especial Cível (JEC)**, por ser uma área com:
- Características bem definidas (Lei 9.099/95)
- Corpo de enunciados consolidado (FONAJE)
- Linguagem e princípios próprios
- Demanda real do usuário

---

## 2. Problema e Motivação

### 2.1 Situação Atual

```
┌─────────────────────────────────────────────────────────────┐
│                     David Atual                              │
├─────────────────────────────────────────────────────────────┤
│  - Conhecimento jurídico genérico                           │
│  - Mesmos prompts para todas as áreas                       │
│  - RAG busca em base única (sem priorização por área)       │
│  - Estilo de redação uniforme                               │
│  - Não aproveita experiência prévia do usuário por área     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Problemas

1. **Falta de Contexto Especializado**
   - David não sabe quando está tratando de JEC vs. Vara Cível comum
   - Cita STJ em casos de JEC (onde não cabe REsp)
   - Usa linguagem formal demais para JEC (onde partes atuam sem advogado)

2. **Conhecimento Disperso**
   - Enunciados do FONAJE não estão disponíveis
   - Jurisprudência das Turmas Recursais não priorizada
   - Modelos de minuta genéricos

3. **Perda de Experiência**
   - Minutas aprovadas pelo juiz não são reutilizadas por área
   - Cada interação parte do zero
   - Estilo pessoal não é preservado por especialidade

### 2.3 Solução Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                 David com Especializações                    │
├─────────────────────────────────────────────────────────────┤
│  Especialização Ativa: JEC                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ + Prompts específicos JEC (linguagem acessível)       │  │
│  │ + Enunciados FONAJE (170+ enunciados)                 │  │
│  │ + Jurisprudência Turmas Recursais                     │  │
│  │ + Modelos de minuta JEC do usuário                    │  │
│  │ + Regras procedimentais (prazos, recursos)            │  │
│  │ + Teses aprendidas filtradas por JEC                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Arquitetura Proposta

### 3.1 Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  /configuracoes/especializacoes                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │   JEC    │  │ Família  │  │ Criminal │  │  Fazenda │        │   │
│  │  │  ✅ ON   │  │   OFF    │  │   OFF    │  │   OFF    │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  │                                                                 │   │
│  │  [Configurar JEC]  [Upload Documentos]  [Ver Conhecimento]     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  /david (Chat)                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [Badge: JEC Ativo]                                             │   │
│  │  ─────────────────────────────────────────────────────────────  │   │
│  │  Conversa com contexto JEC injetado automaticamente             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                              BACKEND                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  server/modules/specializations/                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  SpecializationRegistry                                         │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  jec: JECSpecialization                                 │   │   │
│  │  │  familia: FamiliaSpecialization (futuro)                │   │   │
│  │  │  criminal: CriminalSpecialization (futuro)              │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  SpecializationService                                          │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  getActiveSpecialization(userId)                        │   │   │
│  │  │  getSystemPromptAddition(specSlug)                      │   │   │
│  │  │  getBuiltInKnowledge(specSlug)                          │   │   │
│  │  │  getUserDocuments(userId, specSlug)                     │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Integrações:                                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │ ContextBuilder│  │  RagService   │  │ IntentService │               │
│  │ + withSpec()  │  │ + specSearch  │  │ + specContext │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                              DATABASE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  │
│  │ specializations │  │ userSpecializations │  │ specializationDocs │  │
│  │ (definições)    │  │ (ativas por user)   │  │ (conhecimento)     │  │
│  └─────────────────┘  └─────────────────────┘  └────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Estrutura de Diretórios

```
server/
├── modules/
│   └── specializations/
│       ├── index.ts                    # Registry e exports
│       ├── types.ts                    # Interfaces e tipos
│       ├── SpecializationService.ts    # Service principal
│       ├── specializationRouter.ts     # tRPC router
│       ├── jec/                        # Especialização JEC
│       │   ├── index.ts                # Export da especialização
│       │   ├── prompts.ts              # System prompts JEC
│       │   ├── knowledge.ts            # Enunciados FONAJE
│       │   ├── rules.ts                # Regras procedimentais
│       │   └── config.ts               # Schema de configuração
│       ├── familia/                    # (Futuro)
│       ├── criminal/                   # (Futuro)
│       └── fazenda/                    # (Futuro)

client/src/
├── pages/
│   └── Especializacoes.tsx             # Página principal
├── components/
│   └── specializations/
│       ├── SpecializationCard.tsx      # Card de cada espec.
│       ├── SpecializationConfig.tsx    # Modal de config
│       ├── SpecializationDocs.tsx      # Upload/lista de docs
│       └── SpecializationBadge.tsx     # Badge no chat
```

---

## 4. Modelo de Dados

### 4.1 Novas Tabelas

#### `specializations` - Definições das Especializações

```typescript
export const specializations = mysqlTable("specializations", {
  id: int("id").autoincrement().primaryKey(),

  // Identificação
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  shortName: varchar("shortName", { length: 20 }).notNull(),
  description: text("description"),

  // UI
  icon: varchar("icon", { length: 50 }),        // lucide icon name
  color: varchar("color", { length: 20 }),      // tailwind color

  // Tipo
  isBuiltIn: boolean("isBuiltIn").default(true),  // true = nativa do sistema
  isActive: boolean("isActive").default(true),    // false = desabilitada globalmente

  // Ordenação
  sortOrder: int("sortOrder").default(0),

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
```

**Dados iniciais:**
```sql
INSERT INTO specializations (slug, name, shortName, description, icon, color, isBuiltIn, sortOrder) VALUES
('jec', 'Juizado Especial Cível', 'JEC', 'Especialização para Juizados Especiais Cíveis (Lei 9.099/95)', 'Scale', 'blue', true, 1),
('familia', 'Direito de Família', 'Família', 'Especialização para Varas de Família', 'Heart', 'pink', true, 2),
('criminal', 'Direito Penal', 'Criminal', 'Especialização para Varas Criminais', 'Shield', 'red', true, 3),
('fazenda', 'Fazenda Pública', 'Fazenda', 'Especialização para Varas de Fazenda Pública', 'Building', 'green', true, 4);
```

---

#### `userSpecializations` - Especializações Ativas por Usuário

```typescript
export const userSpecializations = mysqlTable("userSpecializations", {
  id: int("id").autoincrement().primaryKey(),

  // Relações
  userId: int("userId").notNull().references(() => users.id),
  specializationId: int("specializationId").notNull().references(() => specializations.id),

  // Estado
  isActive: boolean("isActive").default(true),

  // Configurações específicas do usuário
  config: json("config").$type<UserSpecializationConfig>(),

  // Timestamps
  activatedAt: timestamp("activatedAt").defaultNow(),
  lastUsedAt: timestamp("lastUsedAt"),

}, (table) => ({
  // Índice único: um usuário só pode ter uma entrada por especialização
  userSpecIdx: unique("user_spec_idx").on(table.userId, table.specializationId),
  // Índice para busca rápida
  userIdIdx: index("userSpec_userId_idx").on(table.userId),
}));

// Tipo da configuração (varia por especialização)
type UserSpecializationConfig = {
  // JEC
  turmaRecursal?: string;        // "1ª TR/RJ", "2ª TR/SP"
  colegiadoRecursal?: string;    // Nome do colegiado

  // Genérico
  customInstructions?: string;   // Instruções adicionais do usuário
  preferredAuthorities?: string[]; // Fontes preferenciais
};
```

---

#### `specializationDocuments` - Documentos/Conhecimento por Especialização

```typescript
export const specializationDocuments = mysqlTable("specializationDocuments", {
  id: int("id").autoincrement().primaryKey(),

  // Relações
  userId: int("userId").notNull().references(() => users.id),
  specializationId: int("specializationId").notNull().references(() => specializations.id),

  // Conteúdo
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  summary: text("summary"),  // Resumo gerado por LLM

  // Classificação
  documentType: mysqlEnum("documentType", [
    "ENUNCIADO",         // Enunciado de fórum/turma
    "SUMULA",            // Súmula vinculante/persuasiva
    "MODELO_SENTENCA",   // Modelo de sentença
    "MODELO_DESPACHO",   // Modelo de despacho
    "MODELO_DECISAO",    // Modelo de decisão interlocutória
    "JURISPRUDENCIA",    // Decisão/acórdão de referência
    "INSTRUCAO",         // Instrução normativa/procedimental
    "ANOTACAO",          // Anotação pessoal
    "OUTRO"
  ]).notNull(),

  // Origem
  source: varchar("source", { length: 100 }), // "FONAJE", "1ª TR/RJ", "Próprio"
  sourceUrl: varchar("sourceUrl", { length: 500 }),

  // RAG
  embedding: json("embedding").$type<number[]>(),

  // Metadados
  metadata: json("metadata").$type<SpecDocMetadata>(),

  // Estado
  isBuiltIn: boolean("isBuiltIn").default(false), // true = pré-carregado
  isActive: boolean("isActive").default(true),

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),

}, (table) => ({
  userSpecIdx: index("specDoc_user_spec_idx").on(table.userId, table.specializationId),
  typeIdx: index("specDoc_type_idx").on(table.documentType),
}));

type SpecDocMetadata = {
  // Enunciados
  numero?: number;
  foroOrigem?: string;
  dataAprovacao?: string;

  // Jurisprudência
  tribunal?: string;
  relator?: string;
  dataJulgamento?: string;
  numeroProcesso?: string;

  // Modelos
  tipoAcao?: string;
  resultado?: "PROCEDENTE" | "IMPROCEDENTE" | "PARCIALMENTE_PROCEDENTE" | "ACORDO";

  // Genérico
  tags?: string[];
  relevancia?: number; // 1-5
};
```

---

### 4.2 Diagrama ER

```
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│     users       │       │   specializations   │       │ specializationDocs  │
├─────────────────┤       ├─────────────────────┤       ├─────────────────────┤
│ id          PK  │       │ id              PK  │       │ id              PK  │
│ email           │       │ slug (unique)       │       │ userId          FK  │──┐
│ name            │       │ name                │       │ specializationId FK │──┼─┐
│ ...             │       │ shortName           │       │ title               │  │ │
└────────┬────────┘       │ description         │       │ content             │  │ │
         │                │ icon                │       │ documentType        │  │ │
         │                │ color               │       │ source              │  │ │
         │                │ isBuiltIn           │       │ embedding           │  │ │
         │                │ isActive            │       │ metadata            │  │ │
         │                │ sortOrder           │       │ isBuiltIn           │  │ │
         │                └──────────┬──────────┘       └─────────────────────┘  │ │
         │                           │                                           │ │
         │    ┌──────────────────────┼───────────────────────────────────────────┘ │
         │    │                      │                                             │
         ▼    ▼                      ▼                                             │
┌─────────────────────┐              │                                             │
│ userSpecializations │              │                                             │
├─────────────────────┤              │                                             │
│ id              PK  │              │                                             │
│ userId          FK  │──────────────┤                                             │
│ specializationId FK │──────────────┴─────────────────────────────────────────────┘
│ isActive            │
│ config (JSON)       │
│ activatedAt         │
│ lastUsedAt          │
└─────────────────────┘
```

---

## 5. Backend: Módulo de Especializações

### 5.1 Interface Base

```typescript
// server/modules/specializations/types.ts

import { z } from "zod";

/**
 * Interface que toda especialização deve implementar
 */
export interface ISpecialization {
  // Identificação
  slug: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;

  /**
   * Retorna o prompt adicional a ser injetado no sistema
   * Será concatenado ao CORE_IDENTITY
   */
  getSystemPromptAddition(): string;

  /**
   * Retorna adição específica para o Motor C (fundamentação)
   * Instruções de como construir argumentação para esta área
   */
  getMotorCAddition(): string;

  /**
   * Retorna adição específica para o Motor D (devil's advocate)
   * Riscos e armadilhas específicos da área
   */
  getMotorDAddition(): string;

  /**
   * Retorna conhecimento pré-carregado (enunciados, súmulas)
   * Será usado para seed inicial e RAG
   */
  getBuiltInKnowledge(): BuiltInKnowledgeItem[];

  /**
   * Retorna modelos de minuta pré-configurados
   */
  getTemplates(): MinutaTemplate[];

  /**
   * Retorna regras procedimentais da área
   * Prazos, recursos, peculiaridades
   */
  getProceduralRules(): string;

  /**
   * Schema de configuração específica do usuário
   * Ex: qual Turma Recursal, preferências de citação
   */
  getConfigSchema(): z.ZodSchema;

  /**
   * Valida se uma configuração é válida
   */
  validateConfig(config: unknown): boolean;
}

/**
 * Item de conhecimento pré-carregado
 */
export interface BuiltInKnowledgeItem {
  type: "ENUNCIADO" | "SUMULA" | "MODELO_SENTENCA" | "MODELO_DESPACHO" | "JURISPRUDENCIA" | "INSTRUCAO";
  title: string;
  content: string;
  source: string;
  metadata?: Record<string, unknown>;
}

/**
 * Template de minuta
 */
export interface MinutaTemplate {
  id: string;
  name: string;
  description: string;
  category: "SENTENCA" | "DECISAO" | "DESPACHO";
  tipoAcao?: string;
  template: string;  // Com placeholders {{variavel}}
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];  // Para type: "select"
  required: boolean;
}

/**
 * Resultado de busca RAG com especialização
 */
export interface SpecializedRagResult {
  content: string;
  source: string;
  type: "BUILT_IN" | "USER_DOC" | "LEARNED_THESIS" | "KNOWLEDGE_BASE";
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}
```

---

### 5.2 Registry de Especializações

```typescript
// server/modules/specializations/index.ts

import { ISpecialization } from "./types";
import { JECSpecialization } from "./jec";
// import { FamiliaSpecialization } from "./familia";  // Futuro

/**
 * Registry central de especializações disponíveis
 */
class SpecializationRegistry {
  private specializations: Map<string, ISpecialization> = new Map();

  register(spec: ISpecialization): void {
    this.specializations.set(spec.slug, spec);
  }

  get(slug: string): ISpecialization | undefined {
    return this.specializations.get(slug);
  }

  getAll(): ISpecialization[] {
    return Array.from(this.specializations.values());
  }

  has(slug: string): boolean {
    return this.specializations.has(slug);
  }
}

// Singleton
export const specializationRegistry = new SpecializationRegistry();

// Registrar especializações disponíveis
specializationRegistry.register(new JECSpecialization());
// specializationRegistry.register(new FamiliaSpecialization());  // Futuro

// Export helpers
export function getSpecialization(slug: string): ISpecialization | undefined {
  return specializationRegistry.get(slug);
}

export function getAllSpecializations(): ISpecialization[] {
  return specializationRegistry.getAll();
}

export * from "./types";
export * from "./SpecializationService";
```

---

### 5.3 Specialization Service

```typescript
// server/modules/specializations/SpecializationService.ts

import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import {
  specializations,
  userSpecializations,
  specializationDocuments
} from "../../../drizzle/schema";
import {
  ISpecialization,
  BuiltInKnowledgeItem,
  SpecializedRagResult
} from "./types";
import { specializationRegistry } from "./index";
import { generateEmbedding } from "../../_core/embeddings";
import { cosineSimilarity } from "../../services/RagService";

export class SpecializationService {

  /**
   * Obtém a especialização ativa do usuário
   * Retorna a mais recentemente usada se houver múltiplas
   */
  async getActiveSpecialization(userId: number): Promise<{
    spec: ISpecialization;
    config: Record<string, unknown>;
  } | null> {
    const result = await db.query.userSpecializations.findFirst({
      where: and(
        eq(userSpecializations.userId, userId),
        eq(userSpecializations.isActive, true)
      ),
      orderBy: desc(userSpecializations.lastUsedAt),
      with: {
        specialization: true
      }
    });

    if (!result) return null;

    const spec = specializationRegistry.get(result.specialization.slug);
    if (!spec) return null;

    return {
      spec,
      config: result.config || {}
    };
  }

  /**
   * Ativa uma especialização para o usuário
   */
  async activateSpecialization(
    userId: number,
    specializationSlug: string,
    config?: Record<string, unknown>
  ): Promise<void> {
    // Buscar ID da especialização
    const specRecord = await db.query.specializations.findFirst({
      where: eq(specializations.slug, specializationSlug)
    });

    if (!specRecord) {
      throw new Error(`Especialização não encontrada: ${specializationSlug}`);
    }

    // Validar config se fornecida
    if (config) {
      const spec = specializationRegistry.get(specializationSlug);
      if (spec && !spec.validateConfig(config)) {
        throw new Error("Configuração inválida para esta especialização");
      }
    }

    // Upsert na tabela userSpecializations
    await db.insert(userSpecializations)
      .values({
        userId,
        specializationId: specRecord.id,
        isActive: true,
        config: config || {},
        activatedAt: new Date(),
        lastUsedAt: new Date()
      })
      .onDuplicateKeyUpdate({
        set: {
          isActive: true,
          config: config || {},
          lastUsedAt: new Date()
        }
      });
  }

  /**
   * Desativa uma especialização para o usuário
   */
  async deactivateSpecialization(
    userId: number,
    specializationSlug: string
  ): Promise<void> {
    const specRecord = await db.query.specializations.findFirst({
      where: eq(specializations.slug, specializationSlug)
    });

    if (!specRecord) return;

    await db.update(userSpecializations)
      .set({ isActive: false })
      .where(and(
        eq(userSpecializations.userId, userId),
        eq(userSpecializations.specializationId, specRecord.id)
      ));
  }

  /**
   * Atualiza a configuração de uma especialização
   */
  async updateSpecializationConfig(
    userId: number,
    specializationSlug: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const spec = specializationRegistry.get(specializationSlug);
    if (!spec) {
      throw new Error(`Especialização não encontrada: ${specializationSlug}`);
    }

    if (!spec.validateConfig(config)) {
      throw new Error("Configuração inválida");
    }

    const specRecord = await db.query.specializations.findFirst({
      where: eq(specializations.slug, specializationSlug)
    });

    if (!specRecord) return;

    await db.update(userSpecializations)
      .set({ config })
      .where(and(
        eq(userSpecializations.userId, userId),
        eq(userSpecializations.specializationId, specRecord.id)
      ));
  }

  /**
   * Busca conhecimento da especialização (built-in + user docs)
   */
  async searchSpecializationKnowledge(
    query: string,
    userId: number,
    specializationSlug: string,
    options: {
      limit?: number;
      types?: string[];
      includeBuiltIn?: boolean;
    } = {}
  ): Promise<SpecializedRagResult[]> {
    const {
      limit = 10,
      types,
      includeBuiltIn = true
    } = options;

    const results: SpecializedRagResult[] = [];
    const queryEmbedding = await generateEmbedding(query);

    // 1. Buscar conhecimento built-in da especialização
    if (includeBuiltIn) {
      const spec = specializationRegistry.get(specializationSlug);
      if (spec) {
        const builtInKnowledge = spec.getBuiltInKnowledge();

        // Filtrar por tipo se especificado
        const filtered = types
          ? builtInKnowledge.filter(k => types.includes(k.type))
          : builtInKnowledge;

        // Calcular similaridade (simplificado - em produção usar embeddings pré-computados)
        for (const item of filtered) {
          const itemEmbedding = await generateEmbedding(item.content);
          const score = cosineSimilarity(queryEmbedding, itemEmbedding);

          if (score > 0.5) {  // Threshold mínimo
            results.push({
              content: item.content,
              source: `${item.source} - ${item.title}`,
              type: "BUILT_IN",
              relevanceScore: score,
              metadata: item.metadata
            });
          }
        }
      }
    }

    // 2. Buscar documentos do usuário para a especialização
    const specRecord = await db.query.specializations.findFirst({
      where: eq(specializations.slug, specializationSlug)
    });

    if (specRecord) {
      const userDocs = await db.query.specializationDocuments.findMany({
        where: and(
          eq(specializationDocuments.userId, userId),
          eq(specializationDocuments.specializationId, specRecord.id),
          eq(specializationDocuments.isActive, true)
        )
      });

      for (const doc of userDocs) {
        if (!doc.embedding) continue;

        const score = cosineSimilarity(queryEmbedding, doc.embedding as number[]);

        if (score > 0.5) {
          results.push({
            content: doc.content,
            source: doc.source || "Documento do usuário",
            type: "USER_DOC",
            relevanceScore: score,
            metadata: doc.metadata as Record<string, unknown>
          });
        }
      }
    }

    // 3. Ordenar por relevância e limitar
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Adiciona documento à especialização do usuário
   */
  async addUserDocument(
    userId: number,
    specializationSlug: string,
    document: {
      title: string;
      content: string;
      documentType: string;
      source?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<number> {
    const specRecord = await db.query.specializations.findFirst({
      where: eq(specializations.slug, specializationSlug)
    });

    if (!specRecord) {
      throw new Error(`Especialização não encontrada: ${specializationSlug}`);
    }

    // Gerar embedding
    const embedding = await generateEmbedding(document.content);

    const [result] = await db.insert(specializationDocuments).values({
      userId,
      specializationId: specRecord.id,
      title: document.title,
      content: document.content,
      documentType: document.documentType as any,
      source: document.source,
      embedding,
      metadata: document.metadata,
      isBuiltIn: false,
      isActive: true
    });

    return result.insertId;
  }

  /**
   * Lista documentos do usuário para uma especialização
   */
  async getUserDocuments(
    userId: number,
    specializationSlug: string,
    options: {
      type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    documents: Array<{
      id: number;
      title: string;
      documentType: string;
      source: string | null;
      createdAt: Date | null;
    }>;
    total: number;
  }> {
    const specRecord = await db.query.specializations.findFirst({
      where: eq(specializations.slug, specializationSlug)
    });

    if (!specRecord) {
      return { documents: [], total: 0 };
    }

    const whereClause = and(
      eq(specializationDocuments.userId, userId),
      eq(specializationDocuments.specializationId, specRecord.id),
      eq(specializationDocuments.isActive, true)
    );

    const documents = await db.query.specializationDocuments.findMany({
      where: whereClause,
      columns: {
        id: true,
        title: true,
        documentType: true,
        source: true,
        createdAt: true
      },
      limit: options.limit || 50,
      offset: options.offset || 0,
      orderBy: desc(specializationDocuments.createdAt)
    });

    // Count total
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(specializationDocuments)
      .where(whereClause);

    return {
      documents,
      total: Number(countResult[0]?.count || 0)
    };
  }

  /**
   * Remove documento do usuário
   */
  async removeUserDocument(
    userId: number,
    documentId: number
  ): Promise<void> {
    await db.update(specializationDocuments)
      .set({ isActive: false })
      .where(and(
        eq(specializationDocuments.id, documentId),
        eq(specializationDocuments.userId, userId)
      ));
  }

  /**
   * Atualiza lastUsedAt quando especialização é usada
   */
  async markAsUsed(userId: number, specializationSlug: string): Promise<void> {
    const specRecord = await db.query.specializations.findFirst({
      where: eq(specializations.slug, specializationSlug)
    });

    if (!specRecord) return;

    await db.update(userSpecializations)
      .set({ lastUsedAt: new Date() })
      .where(and(
        eq(userSpecializations.userId, userId),
        eq(userSpecializations.specializationId, specRecord.id)
      ));
  }
}

// Singleton
let _service: SpecializationService | null = null;

export function getSpecializationService(): SpecializationService {
  if (!_service) {
    _service = new SpecializationService();
  }
  return _service;
}
```

---

### 5.4 tRPC Router

```typescript
// server/modules/specializations/specializationRouter.ts

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getSpecializationService } from "./SpecializationService";
import { getAllSpecializations, getSpecialization } from "./index";

export const specializationRouter = router({

  /**
   * Lista todas as especializações disponíveis
   */
  list: protectedProcedure.query(async () => {
    const specs = getAllSpecializations();
    return specs.map(s => ({
      slug: s.slug,
      name: s.name,
      shortName: s.shortName,
      description: s.description,
      icon: s.icon,
      color: s.color
    }));
  }),

  /**
   * Obtém especializações do usuário (ativas e inativas)
   */
  getUserSpecializations: protectedProcedure.query(async ({ ctx }) => {
    const service = getSpecializationService();
    const active = await service.getActiveSpecialization(ctx.userId);

    // TODO: Buscar todas as especializações do usuário, não só a ativa

    return {
      active: active ? {
        slug: active.spec.slug,
        name: active.spec.name,
        shortName: active.spec.shortName,
        config: active.config
      } : null
    };
  }),

  /**
   * Ativa uma especialização
   */
  activate: protectedProcedure
    .input(z.object({
      slug: z.string(),
      config: z.record(z.unknown()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getSpecializationService();
      await service.activateSpecialization(ctx.userId, input.slug, input.config);
      return { success: true };
    }),

  /**
   * Desativa uma especialização
   */
  deactivate: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = getSpecializationService();
      await service.deactivateSpecialization(ctx.userId, input.slug);
      return { success: true };
    }),

  /**
   * Atualiza configuração de uma especialização
   */
  updateConfig: protectedProcedure
    .input(z.object({
      slug: z.string(),
      config: z.record(z.unknown())
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getSpecializationService();
      await service.updateSpecializationConfig(ctx.userId, input.slug, input.config);
      return { success: true };
    }),

  /**
   * Obtém schema de configuração de uma especialização
   */
  getConfigSchema: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const spec = getSpecialization(input.slug);
      if (!spec) {
        throw new Error("Especialização não encontrada");
      }
      // Retorna o schema como JSON Schema (via zod-to-json-schema ou manual)
      return spec.getConfigSchema();
    }),

  /**
   * Lista documentos do usuário para uma especialização
   */
  listDocuments: protectedProcedure
    .input(z.object({
      slug: z.string(),
      type: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional()
    }))
    .query(async ({ ctx, input }) => {
      const service = getSpecializationService();
      return service.getUserDocuments(ctx.userId, input.slug, {
        type: input.type,
        limit: input.limit,
        offset: input.offset
      });
    }),

  /**
   * Adiciona documento à especialização
   */
  addDocument: protectedProcedure
    .input(z.object({
      slug: z.string(),
      title: z.string(),
      content: z.string(),
      documentType: z.enum([
        "ENUNCIADO", "SUMULA", "MODELO_SENTENCA", "MODELO_DESPACHO",
        "MODELO_DECISAO", "JURISPRUDENCIA", "INSTRUCAO", "ANOTACAO", "OUTRO"
      ]),
      source: z.string().optional(),
      metadata: z.record(z.unknown()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const service = getSpecializationService();
      const id = await service.addUserDocument(ctx.userId, input.slug, {
        title: input.title,
        content: input.content,
        documentType: input.documentType,
        source: input.source,
        metadata: input.metadata
      });
      return { id };
    }),

  /**
   * Remove documento
   */
  removeDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const service = getSpecializationService();
      await service.removeUserDocument(ctx.userId, input.documentId);
      return { success: true };
    }),

  /**
   * Obtém conhecimento built-in de uma especialização
   */
  getBuiltInKnowledge: protectedProcedure
    .input(z.object({
      slug: z.string(),
      type: z.string().optional()
    }))
    .query(async ({ input }) => {
      const spec = getSpecialization(input.slug);
      if (!spec) {
        throw new Error("Especialização não encontrada");
      }

      let knowledge = spec.getBuiltInKnowledge();

      if (input.type) {
        knowledge = knowledge.filter(k => k.type === input.type);
      }

      return knowledge.map(k => ({
        type: k.type,
        title: k.title,
        content: k.content.slice(0, 500) + (k.content.length > 500 ? "..." : ""),
        source: k.source,
        metadata: k.metadata
      }));
    }),

  /**
   * Obtém templates de minuta de uma especialização
   */
  getTemplates: protectedProcedure
    .input(z.object({
      slug: z.string(),
      category: z.enum(["SENTENCA", "DECISAO", "DESPACHO"]).optional()
    }))
    .query(async ({ input }) => {
      const spec = getSpecialization(input.slug);
      if (!spec) {
        throw new Error("Especialização não encontrada");
      }

      let templates = spec.getTemplates();

      if (input.category) {
        templates = templates.filter(t => t.category === input.category);
      }

      return templates;
    }),
});

export type SpecializationRouter = typeof specializationRouter;
```

---

## 6. Especialização JEC (Primeira Implementação)

### 6.1 Implementação Principal

```typescript
// server/modules/specializations/jec/index.ts

import { z } from "zod";
import { ISpecialization, BuiltInKnowledgeItem, MinutaTemplate } from "../types";
import { JEC_SYSTEM_PROMPT, JEC_MOTOR_C_ADDITION, JEC_MOTOR_D_ADDITION } from "./prompts";
import { FONAJE_ENUNCIADOS } from "./knowledge";
import { JEC_PROCEDURAL_RULES } from "./rules";
import { JEC_TEMPLATES } from "./templates";

export class JECSpecialization implements ISpecialization {
  slug = "jec";
  name = "Juizado Especial Cível";
  shortName = "JEC";
  description = "Especialização para Juizados Especiais Cíveis (Lei 9.099/95). Inclui enunciados FONAJE, linguagem acessível e regras procedimentais específicas.";
  icon = "Scale";
  color = "blue";

  getSystemPromptAddition(): string {
    return JEC_SYSTEM_PROMPT;
  }

  getMotorCAddition(): string {
    return JEC_MOTOR_C_ADDITION;
  }

  getMotorDAddition(): string {
    return JEC_MOTOR_D_ADDITION;
  }

  getBuiltInKnowledge(): BuiltInKnowledgeItem[] {
    return FONAJE_ENUNCIADOS;
  }

  getTemplates(): MinutaTemplate[] {
    return JEC_TEMPLATES;
  }

  getProceduralRules(): string {
    return JEC_PROCEDURAL_RULES;
  }

  getConfigSchema(): z.ZodSchema {
    return z.object({
      turmaRecursal: z.string().optional().describe("Turma Recursal de referência (ex: 1ª TR/RJ)"),
      colegiadoRecursal: z.string().optional().describe("Nome do Colegiado Recursal"),
      customInstructions: z.string().optional().describe("Instruções adicionais personalizadas"),
      preferredAuthorities: z.array(z.string()).optional().describe("Fontes de autoridade preferenciais")
    });
  }

  validateConfig(config: unknown): boolean {
    try {
      this.getConfigSchema().parse(config);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

### 6.2 System Prompts JEC

```typescript
// server/modules/specializations/jec/prompts.ts

export const JEC_SYSTEM_PROMPT = `
## ESPECIALIZAÇÃO ATIVA: Juizado Especial Cível (JEC)

Você está operando no modo especializado para **Juizados Especiais Cíveis**, regidos pela Lei 9.099/95.

### Princípios Fundamentais (Art. 2º da Lei 9.099/95)
O processo nos Juizados orienta-se pelos critérios de:
- **Oralidade**: Valorização da palavra falada, atas simplificadas
- **Simplicidade**: Procedimentos descomplicados
- **Informalidade**: Flexibilização de formas, desde que atinja finalidade
- **Economia Processual**: Máximo resultado com mínimo de atos
- **Celeridade**: Rapidez na prestação jurisdicional

### Competência (Art. 3º)
- Causas cíveis de **menor complexidade** até **40 salários mínimos**
- Ação de despejo para uso próprio
- Ações possessórias sobre imóveis de valor até 40 SM
- **Não cabe**: ações de natureza alimentar, falimentar, fiscal, de interesse da Fazenda Pública, acidentes de trabalho, estado e capacidade das pessoas

### Peculiaridades Redacionais para JEC
1. **Linguagem Acessível**
   - Muitas partes atuam SEM advogado (até 20 SM)
   - Evite juridiquês excessivo
   - Explique termos técnicos quando necessário
   - Use frases mais curtas e diretas

2. **Fundamentação Concisa**
   - Evite citações doutrinárias extensas
   - Priorize referência a enunciados e súmulas
   - Vá direto ao ponto da controvérsia
   - Mantenha proporcionalidade: causa simples = fundamentação simples

3. **Citações Preferenciais** (ordem de prioridade)
   - Súmulas Vinculantes do STF
   - **Enunciados do FONAJE** (específicos para JEC)
   - Súmulas das Turmas Recursais Estaduais
   - Jurisprudência das Turmas Recursais
   - ⚠️ EVITE citar STJ (não cabe REsp em JEC, apenas RE para STF)

4. **Foco na Resolução Prática**
   - Privilegiar soluções consensuais quando possível
   - Sentenças autoexplicativas para cumprimento
   - Dispositivos claros e exequíveis

### Sistema Recursal do JEC
- **Recurso Inominado**: 10 dias (art. 42)
- **Embargos de Declaração**: 5 dias (art. 49)
- **NÃO CABE Recurso Especial** (STJ) - Súmula 203 STJ
- Cabe apenas **Recurso Extraordinário** (STF) quando há questão constitucional
- Execução da sentença no próprio juizado (art. 52)

### Hierarquia de Autoridade para JEC
1. Constituição Federal e Súmulas Vinculantes
2. Lei 9.099/95 e legislação específica
3. **Enunciados do FONAJE** (máxima autoridade interpretativa para JEC)
4. Súmulas e jurisprudência das Turmas Recursais
5. Doutrina especializada em JEC
`;

export const JEC_MOTOR_C_ADDITION = `
### Instruções Específicas para Fundamentação em JEC (Motor C)

Ao construir a fundamentação jurídica para processos de Juizado Especial:

1. **Hierarquia de Fontes**
   - SEMPRE verifique primeiro se há Enunciado do FONAJE aplicável
   - Enunciados FONAJE têm peso de "súmula persuasiva" nos JECs
   - Cite Enunciados no formato: "Enunciado XX do FONAJE"

2. **Evite Citações Inadequadas**
   - ⚠️ NÃO cite jurisprudência do STJ como precedente vinculante
   - STJ não julga recursos de JEC (não cabe REsp)
   - Se citar STJ, deixe claro que é apenas orientação doutrinária

3. **Linguagem Adequada**
   - Adapte a complexidade ao caso
   - Partes sem advogado precisam entender a decisão
   - Evite latim desnecessário (use português)
   - Explique conceitos quando relevante

4. **Proporcionalidade**
   - Causa de R$ 500 não precisa de 10 páginas de fundamentação
   - Seja conciso sem ser superficial
   - Fundamente o necessário, não o possível

5. **Teses Consumeristas (Comuns em JEC)**
   - Verifique aplicabilidade do CDC
   - Inversão do ônus da prova (art. 6º, VIII)
   - Responsabilidade objetiva (art. 14)
   - Dano moral em relações de consumo
`;

export const JEC_MOTOR_D_ADDITION = `
### Instruções Específicas para Análise de Riscos em JEC (Motor D)

Ao analisar riscos e exceções em processos de Juizado Especial:

1. **Competência**
   - ⚠️ Verificar se o valor da causa não excede 40 SM
   - ⚠️ Verificar se não é matéria excluída (art. 3º, §2º)
   - ⚠️ Complexidade da causa: JEC não é adequado para perícias complexas

2. **Legitimidade**
   - Pessoa jurídica só pode ser autora se enquadrada como ME/EPP
   - Incapaz deve estar assistido mesmo em causas até 20 SM
   - Verificar se réu pode ser citado no JEC

3. **Prazos Específicos**
   - Recurso Inominado: 10 dias (não 15!)
   - Embargos: 5 dias (não 5 dias úteis no JEC Estadual)
   - Execução de título extrajudicial: verificar se cabe no JEC

4. **Armadilhas Comuns**
   - Citar STJ como precedente obrigatório
   - Aplicar regras do CPC que foram afastadas pela Lei 9.099
   - Esquecer da gratuidade de custas em 1º grau (art. 54)
   - Não verificar se há Enunciado FONAJE contrário à tese

5. **Reforma pela Turma Recursal**
   - Verificar entendimento consolidado da TR local
   - Atenção a enunciados regionais
   - Divergência entre TRs pode indicar tese arriscada
`;
```

---

### 6.3 Conhecimento Built-in (Enunciados FONAJE)

```typescript
// server/modules/specializations/jec/knowledge.ts

import { BuiltInKnowledgeItem } from "../types";

/**
 * Enunciados do FONAJE (Fórum Nacional de Juizados Especiais)
 * Atualizados até o XLV FONAJE (2023)
 *
 * Fonte: https://www.cnj.jus.br/fonaje/
 */
export const FONAJE_ENUNCIADOS: BuiltInKnowledgeItem[] = [
  // === ENUNCIADOS CÍVEIS ===
  {
    type: "ENUNCIADO",
    title: "Enunciado 1 - FONAJE (Cível)",
    content: "O exercício do direito de ação no Juizado Especial Cível é subordinado à comprovação de que a parte autora atende aos requisitos legais, notadamente no tocante à natureza da causa e ao valor do pedido.",
    source: "FONAJE",
    metadata: { numero: 1, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 2 - FONAJE (Cível)",
    content: "É cabível a conexão de causas em trâmite nos Juizados Especiais Cíveis quando houver identidade de pedido e causa de pedir entre elas, devendo os processos ser reunidos.",
    source: "FONAJE",
    metadata: { numero: 2, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 3 - FONAJE (Cível)",
    content: "O valor de alçada no JEC corresponde a 40 (quarenta) salários mínimos, na data da propositura da ação, e serve de parâmetro tanto para determinar a competência quanto para fixar o valor máximo da condenação.",
    source: "FONAJE",
    metadata: { numero: 3, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 4 - FONAJE (Cível)",
    content: "Nos Juizados Especiais Cíveis, a complexidade da causa é critério de competência absoluta e pode ser reconhecida de ofício.",
    source: "FONAJE",
    metadata: { numero: 4, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 8 - FONAJE (Cível)",
    content: "As ações de reparação de dano moral são de competência dos Juizados Especiais Cíveis, desde que o valor da causa não exceda a quarenta salários mínimos.",
    source: "FONAJE",
    metadata: { numero: 8, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 13 - FONAJE (Cível)",
    content: "Os contratos bancários e financeiros, quando versem sobre relações de consumo, podem ser objeto de ação perante os Juizados Especiais Cíveis.",
    source: "FONAJE",
    metadata: { numero: 13, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 15 - FONAJE (Cível)",
    content: "Nos Juizados Especiais não é admissível a reconvenção, sendo permitida a formulação de pedido contraposto na contestação.",
    source: "FONAJE",
    metadata: { numero: 15, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 25 - FONAJE (Cível)",
    content: "O valor da condenação deve ser limitado ao teto de 40 salários mínimos, inclusive quando houver danos morais e materiais cumulados.",
    source: "FONAJE",
    metadata: { numero: 25, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 26 - FONAJE (Cível)",
    content: "São cabíveis multas processuais nos Juizados Especiais Cíveis, as quais não estão sujeitas ao limite de 40 salários mínimos.",
    source: "FONAJE",
    metadata: { numero: 26, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 27 - FONAJE (Cível)",
    content: "A concessão de tutela de urgência nos Juizados Especiais Cíveis independe de caução, conforme previsto no art. 300, § 1º, do CPC.",
    source: "FONAJE",
    metadata: { numero: 27, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 30 - FONAJE (Cível)",
    content: "A incompetência territorial pode ser declarada de ofício nos Juizados Especiais Cíveis.",
    source: "FONAJE",
    metadata: { numero: 30, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 34 - FONAJE (Cível)",
    content: "As astreintes podem ser fixadas de ofício nos Juizados Especiais Cíveis.",
    source: "FONAJE",
    metadata: { numero: 34, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 35 - FONAJE (Cível)",
    content: "A inversão do ônus da prova, prevista no art. 6º, VIII, do CDC, pode ser deferida de ofício pelo Juiz, sempre que verificada a hipossuficiência técnica ou a verossimilhança das alegações.",
    source: "FONAJE",
    metadata: { numero: 35, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 46 - FONAJE (Cível)",
    content: "A multa prevista no art. 475-J do CPC (atual art. 523 do CPC/2015) é aplicável aos Juizados Especiais Cíveis, sendo devida pelo executado que não efetuar o pagamento em 15 dias.",
    source: "FONAJE",
    metadata: { numero: 46, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 54 - FONAJE (Cível)",
    content: "A sentença arbitral homologada não se submete à competência dos Juizados Especiais Cíveis para a respectiva execução.",
    source: "FONAJE",
    metadata: { numero: 54, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 70 - FONAJE (Cível)",
    content: "As ações relativas a serviços públicos, quando fundadas em relação de consumo, podem tramitar nos Juizados Especiais Cíveis.",
    source: "FONAJE",
    metadata: { numero: 70, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 72 - FONAJE (Cível)",
    content: "O acordo firmado entre as partes e não cumprido espontaneamente por uma delas enseja a execução direta da sentença homologatória, não sendo necessária nova citação.",
    source: "FONAJE",
    metadata: { numero: 72, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 89 - FONAJE (Cível)",
    content: "A obrigação de fazer ou não fazer deve ser convertida em perdas e danos quando se tornar impossível a tutela específica ou a obtenção do resultado prático equivalente.",
    source: "FONAJE",
    metadata: { numero: 89, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 102 - FONAJE (Cível)",
    content: "O preparo recursal no Juizado Especial Cível compreende custas e honorários advocatícios.",
    source: "FONAJE",
    metadata: { numero: 102, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 115 - FONAJE (Cível)",
    content: "O relator ou a Turma Recursal pode negar provimento ao Recurso Inominado manifestamente improcedente, prejudicado ou em desacordo com Súmula ou jurisprudência dominante.",
    source: "FONAJE",
    metadata: { numero: 115, categoria: "CIVEL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 119 - FONAJE (Cível)",
    content: "O recurso inominado pode ser julgado por decisão monocrática quando a controvérsia versar sobre matéria de jurisprudência dominante ou sumulada.",
    source: "FONAJE",
    metadata: { numero: 119, categoria: "CIVEL", atualizacao: "2023" }
  },

  // === ENUNCIADOS SOBRE DANO MORAL ===
  {
    type: "ENUNCIADO",
    title: "Enunciado 159 - FONAJE (Cível)",
    content: "O dano moral decorrente de inscrição indevida em cadastros de inadimplentes é presumido (in re ipsa), dispensando prova do prejuízo efetivo.",
    source: "FONAJE",
    metadata: { numero: 159, categoria: "DANO_MORAL", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 161 - FONAJE (Cível)",
    content: "O mero descumprimento contratual não gera, por si só, dano moral indenizável, sendo necessária a demonstração de repercussão que extrapole o mero aborrecimento.",
    source: "FONAJE",
    metadata: { numero: 161, categoria: "DANO_MORAL", atualizacao: "2023" }
  },

  // === ENUNCIADOS SOBRE RELAÇÕES DE CONSUMO ===
  {
    type: "ENUNCIADO",
    title: "Enunciado 162 - FONAJE (Cível)",
    content: "O fornecedor de serviços responde objetivamente pelos danos causados aos consumidores por defeitos relativos à prestação dos serviços, inclusive pela informação insuficiente ou inadequada.",
    source: "FONAJE",
    metadata: { numero: 162, categoria: "CONSUMIDOR", atualizacao: "2023" }
  },

  // === ENUNCIADOS SOBRE HONORÁRIOS ===
  {
    type: "ENUNCIADO",
    title: "Enunciado 134 - FONAJE (Cível)",
    content: "No primeiro grau de jurisdição não há condenação em honorários advocatícios, salvo nas hipóteses de litigância de má-fé.",
    source: "FONAJE",
    metadata: { numero: 134, categoria: "HONORARIOS", atualizacao: "2023" }
  },
  {
    type: "ENUNCIADO",
    title: "Enunciado 135 - FONAJE (Cível)",
    content: "A sentença de segundo grau deve fixar honorários advocatícios entre 10% e 20% do valor da condenação, conforme art. 55, caput, da Lei 9.099/95.",
    source: "FONAJE",
    metadata: { numero: 135, categoria: "HONORARIOS", atualizacao: "2023" }
  },

  // Adicionar mais enunciados conforme necessário...
  // O FONAJE possui mais de 170 enunciados cíveis
];

/**
 * Súmulas relevantes para JEC
 */
export const SUMULAS_JEC: BuiltInKnowledgeItem[] = [
  {
    type: "SUMULA",
    title: "Súmula 203 - STJ",
    content: "Não cabe recurso especial contra decisão proferida por órgão de segundo grau dos Juizados Especiais.",
    source: "STJ",
    metadata: { numero: 203, tribunal: "STJ" }
  },
  {
    type: "SUMULA",
    title: "Súmula 640 - STF",
    content: "É cabível recurso extraordinário contra decisão proferida por juiz de primeiro grau nas causas de alçada, ou por turma recursal de juizado especial cível e criminal.",
    source: "STF",
    metadata: { numero: 640, tribunal: "STF" }
  },
];
```

---

### 6.4 Regras Procedimentais

```typescript
// server/modules/specializations/jec/rules.ts

export const JEC_PROCEDURAL_RULES = `
## Regras Procedimentais dos Juizados Especiais Cíveis

### PRAZOS (Lei 9.099/95)

| Ato Processual | Prazo | Fundamento |
|----------------|-------|------------|
| Recurso Inominado | 10 dias | Art. 42 |
| Contrarrazões | 10 dias | Art. 42, §2º |
| Embargos de Declaração | 5 dias | Art. 49 |
| Cumprimento voluntário (execução) | 15 dias | Art. 52, IV |
| Embargos à execução | 15 dias | Art. 52, IX |

### COMPETÊNCIA (Art. 3º)

**Valor máximo**: 40 salários mínimos

**Causas admitidas**:
- Ações de cobrança até o limite de alçada
- Reparação de danos (materiais e morais) até o limite
- Despejo para uso próprio
- Ações possessórias de imóveis até 40 SM
- Execução de título extrajudicial até 40 SM

**Causas excluídas** (Art. 3º, §2º):
- Natureza alimentar
- Falimentar
- Fiscal
- De interesse da Fazenda Pública
- Acidentes de trabalho
- Resíduos (sobras)
- Estado e capacidade das pessoas

### LEGITIMIDADE (Art. 8º)

**Podem ser autores**:
- Pessoas físicas capazes
- Microempresas (ME)
- Empresas de pequeno porte (EPP)
- OSCIP (art. 8º, §1º, III)

**NÃO podem ser autores**:
- Incapazes (mesmo assistidos, exceto até 20 SM)
- Presos
- Pessoas jurídicas de direito público
- Empresas públicas da União
- Massa falida
- Insolvente civil

### CITAÇÃO E INTIMAÇÃO

- Citação por oficial de justiça independe de mandado (art. 18, III)
- Intimação preferencialmente por meios eletrônicos
- Comparecimento espontâneo supre falta de citação
- Hora certa não aplicável (art. 18, §2º)

### AUDIÊNCIA

1. **Audiência de Conciliação** (obrigatória)
   - Conduzida por conciliador sob orientação do juiz
   - Ausência do autor: extinção sem resolução
   - Ausência do réu: revelia (presunção de veracidade)

2. **Audiência de Instrução e Julgamento** (se não houver acordo)
   - Resposta oral ou escrita
   - Instrução: depoimento pessoal, testemunhas (máx. 3), perícia simplificada
   - Sentença na própria audiência (regra)

### RECURSOS

**Recurso Inominado** (Art. 41-46):
- Prazo: 10 dias
- Preparo obrigatório (custas + honorários)
- Efeito devolutivo (regra)
- Julgamento por Turma Recursal composta por 3 juízes

**Embargos de Declaração** (Art. 48-50):
- Prazo: 5 dias
- Hipóteses: obscuridade, contradição, omissão
- Suspendem prazo de outros recursos
- Erro material pode ser corrigido de ofício

**Recurso Extraordinário** (Art. 102, III, CF):
- Única via de acesso ao STF
- Exige questão constitucional
- Repercussão geral obrigatória

⚠️ **NÃO CABEM**:
- Recurso Especial (Súmula 203/STJ)
- Agravo de instrumento (regra)
- Ação rescisória

### EXECUÇÃO (Art. 52-53)

- Competência: próprio Juizado
- Cumprimento de sentença: 15 dias para pagamento
- Multa de 10% se não pagar no prazo
- Execução por quantia certa: penhora online (SISBAJUD)
- Prisão civil: apenas para devedor de alimentos

### CUSTAS E HONORÁRIOS (Art. 54-55)

- **1º grau**: isento de custas, taxas e despesas
- **Recurso**: preparo = custas + honorários (10-20%)
- Honorários só em 2º grau (salvo má-fé)
- Gratuidade: pode ser deferida mediante declaração
`;
```

---

### 6.5 Templates de Minuta JEC

```typescript
// server/modules/specializations/jec/templates.ts

import { MinutaTemplate } from "../types";

export const JEC_TEMPLATES: MinutaTemplate[] = [
  {
    id: "jec-sentenca-consumidor-procedente",
    name: "Sentença Procedente - Relação de Consumo",
    description: "Modelo para sentença de procedência em ação consumerista típica de JEC",
    category: "SENTENCA",
    tipoAcao: "Indenização por danos morais e materiais",
    template: `SENTENÇA

Vistos etc.

{{QUALIFICACAO_PARTES}}

{{RELATORIO_SIMPLIFICADO}}

É o breve relato. DECIDO.

**PRELIMINARES**
{{PRELIMINARES}}

**MÉRITO**

Trata-se de ação indenizatória fundada em relação de consumo.

A relação jurídica entre as partes é regida pelo Código de Defesa do Consumidor, aplicável por força do art. 2º e 3º daquele diploma.

{{FUNDAMENTACAO_FATOS}}

A responsabilidade do fornecedor é objetiva, nos termos do art. 14 do CDC, bastando a demonstração do dano e do nexo causal, prescindindo da prova de culpa.

{{FUNDAMENTACAO_DANO_MORAL}}

{{FUNDAMENTACAO_DANO_MATERIAL}}

Quanto ao quantum indenizatório, observo os princípios da razoabilidade e proporcionalidade, considerando a extensão do dano, a capacidade econômica das partes e o caráter pedagógico da condenação.

**DISPOSITIVO**

Ante o exposto, JULGO PROCEDENTE o pedido, com resolução do mérito (art. 487, I, CPC), para CONDENAR a parte ré a pagar à parte autora:

a) R$ {{VALOR_DANO_MATERIAL}} ({{VALOR_MATERIAL_EXTENSO}}) a título de danos materiais, corrigidos monetariamente desde o desembolso e acrescidos de juros de mora de 1% ao mês desde a citação;

b) R$ {{VALOR_DANO_MORAL}} ({{VALOR_MORAL_EXTENSO}}) a título de danos morais, corrigidos monetariamente e acrescidos de juros de mora de 1% ao mês, ambos a partir desta sentença.

Sem custas nem honorários nesta instância (art. 55 da Lei 9.099/95).

Transitada em julgado, arquivem-se os autos.

P.R.I.

{{LOCAL_DATA}}

{{ASSINATURA_JUIZ}}`,
    variables: [
      { name: "QUALIFICACAO_PARTES", description: "Qualificação das partes", type: "text", required: true },
      { name: "RELATORIO_SIMPLIFICADO", description: "Relatório conciso dos fatos", type: "text", required: true },
      { name: "PRELIMINARES", description: "Análise de preliminares (ou 'Não há')", type: "text", required: false },
      { name: "FUNDAMENTACAO_FATOS", description: "Análise dos fatos provados", type: "text", required: true },
      { name: "FUNDAMENTACAO_DANO_MORAL", description: "Fundamentação do dano moral", type: "text", required: true },
      { name: "FUNDAMENTACAO_DANO_MATERIAL", description: "Fundamentação do dano material", type: "text", required: false },
      { name: "VALOR_DANO_MATERIAL", description: "Valor do dano material", type: "number", required: false },
      { name: "VALOR_MATERIAL_EXTENSO", description: "Valor por extenso", type: "text", required: false },
      { name: "VALOR_DANO_MORAL", description: "Valor do dano moral", type: "number", required: true },
      { name: "VALOR_MORAL_EXTENSO", description: "Valor por extenso", type: "text", required: true },
      { name: "LOCAL_DATA", description: "Local e data", type: "text", required: true },
      { name: "ASSINATURA_JUIZ", description: "Nome do juiz", type: "text", required: true }
    ]
  },
  {
    id: "jec-sentenca-improcedente",
    name: "Sentença Improcedente",
    description: "Modelo para sentença de improcedência em JEC",
    category: "SENTENCA",
    template: `SENTENÇA

Vistos etc.

{{QUALIFICACAO_PARTES}}

{{RELATORIO_SIMPLIFICADO}}

É o breve relato. DECIDO.

**MÉRITO**

{{FUNDAMENTACAO}}

A parte autora não se desincumbiu do ônus probatório que lhe competia (art. 373, I, CPC).

{{ANALISE_PROVAS}}

**DISPOSITIVO**

Ante o exposto, JULGO IMPROCEDENTE o pedido, com resolução do mérito (art. 487, I, CPC).

Sem custas nem honorários nesta instância (art. 55 da Lei 9.099/95).

Transitada em julgado, arquivem-se os autos.

P.R.I.

{{LOCAL_DATA}}

{{ASSINATURA_JUIZ}}`,
    variables: [
      { name: "QUALIFICACAO_PARTES", description: "Qualificação das partes", type: "text", required: true },
      { name: "RELATORIO_SIMPLIFICADO", description: "Relatório conciso", type: "text", required: true },
      { name: "FUNDAMENTACAO", description: "Fundamentação da improcedência", type: "text", required: true },
      { name: "ANALISE_PROVAS", description: "Análise das provas", type: "text", required: true },
      { name: "LOCAL_DATA", description: "Local e data", type: "text", required: true },
      { name: "ASSINATURA_JUIZ", description: "Nome do juiz", type: "text", required: true }
    ]
  },
  {
    id: "jec-despacho-designacao-audiencia",
    name: "Despacho de Designação de Audiência",
    description: "Despacho para designar audiência de conciliação",
    category: "DESPACHO",
    template: `DESPACHO

Vistos.

Recebo a inicial.

Designo audiência de conciliação para o dia {{DATA_AUDIENCIA}}, às {{HORA_AUDIENCIA}}, {{LOCAL_AUDIENCIA}}.

Cite-se e intime-se a parte ré para comparecer à audiência, sob pena de revelia (art. 20 da Lei 9.099/95).

Intime-se a parte autora.

{{LOCAL_DATA}}

{{ASSINATURA_JUIZ}}`,
    variables: [
      { name: "DATA_AUDIENCIA", description: "Data da audiência", type: "date", required: true },
      { name: "HORA_AUDIENCIA", description: "Horário", type: "text", required: true },
      { name: "LOCAL_AUDIENCIA", description: "Local da audiência", type: "text", required: true },
      { name: "LOCAL_DATA", description: "Local e data do despacho", type: "text", required: true },
      { name: "ASSINATURA_JUIZ", description: "Nome do juiz", type: "text", required: true }
    ]
  },
  {
    id: "jec-decisao-tutela-urgencia",
    name: "Decisão - Tutela de Urgência",
    description: "Decisão interlocutória concedendo tutela de urgência",
    category: "DECISAO",
    template: `DECISÃO

Vistos.

A parte autora requer a concessão de tutela de urgência para {{OBJETO_TUTELA}}.

DECIDO.

Estão presentes os requisitos do art. 300 do CPC.

A probabilidade do direito decorre de {{FUNDAMENTACAO_FUMUS}}.

O perigo de dano ou risco ao resultado útil do processo evidencia-se por {{FUNDAMENTACAO_PERICULUM}}.

Ante o exposto, DEFIRO a tutela de urgência para determinar que a parte ré {{DETERMINACAO}}, no prazo de {{PRAZO}}, sob pena de multa diária de R$ {{VALOR_MULTA}}, limitada a {{LIMITE_MULTA}}.

Cite-se a parte ré, intimando-a para cumprir esta decisão e para comparecer à audiência designada.

P.R.I.

{{LOCAL_DATA}}

{{ASSINATURA_JUIZ}}`,
    variables: [
      { name: "OBJETO_TUTELA", description: "O que está sendo pedido", type: "text", required: true },
      { name: "FUNDAMENTACAO_FUMUS", description: "Fundamentação da probabilidade do direito", type: "text", required: true },
      { name: "FUNDAMENTACAO_PERICULUM", description: "Fundamentação do perigo de dano", type: "text", required: true },
      { name: "DETERMINACAO", description: "O que a ré deve fazer/não fazer", type: "text", required: true },
      { name: "PRAZO", description: "Prazo para cumprimento", type: "text", required: true },
      { name: "VALOR_MULTA", description: "Valor da multa diária", type: "number", required: true },
      { name: "LIMITE_MULTA", description: "Limite total da multa", type: "text", required: true },
      { name: "LOCAL_DATA", description: "Local e data", type: "text", required: true },
      { name: "ASSINATURA_JUIZ", description: "Nome do juiz", type: "text", required: true }
    ]
  }
];
```

---

## 7. Integração com Sistema Existente

### 7.1 Integração com ContextBuilder

```typescript
// server/services/ContextBuilder.ts (modificações)

import { ISpecialization } from "../modules/specializations/types";
import { getSpecializationService } from "../modules/specializations";

class ContextBuilder {
  private specialization: ISpecialization | null = null;
  private specializationConfig: Record<string, unknown> = {};

  /**
   * NOVO: Injeta especialização no contexto
   */
  async withUserSpecialization(userId: number): Promise<this> {
    const service = getSpecializationService();
    const active = await service.getActiveSpecialization(userId);

    if (active) {
      this.specialization = active.spec;
      this.specializationConfig = active.config;

      // Adiciona prompt da especialização
      this.blocks.push({
        key: "SPECIALIZATION",
        content: active.spec.getSystemPromptAddition(),
        priority: 2 // Alta prioridade, logo após CORE_IDENTITY
      });
    }

    return this;
  }

  /**
   * MODIFICADO: Adiciona instruções da especialização ao Motor C
   */
  withMotorC(): this {
    let motorCContent = MOTOR_C; // Original

    if (this.specialization) {
      motorCContent += "\n\n" + this.specialization.getMotorCAddition();
    }

    this.blocks.push({
      key: "MOTOR_C",
      content: motorCContent,
      priority: 5
    });

    return this;
  }

  /**
   * MODIFICADO: Adiciona instruções da especialização ao Motor D
   */
  withMotorD(): this {
    let motorDContent = MOTOR_D; // Original

    if (this.specialization) {
      motorDContent += "\n\n" + this.specialization.getMotorDAddition();
    }

    this.blocks.push({
      key: "MOTOR_D",
      content: motorDContent,
      priority: 5
    });

    return this;
  }

  /**
   * Getter para verificar se há especialização ativa
   */
  getActiveSpecialization(): ISpecialization | null {
    return this.specialization;
  }
}
```

---

### 7.2 Integração com RagService

```typescript
// server/services/RagService.ts (modificações)

import { getSpecializationService } from "../modules/specializations";

class RagService {
  /**
   * NOVO: Busca incluindo conhecimento da especialização
   */
  async searchWithSpecialization(
    query: string,
    options: {
      userId: number;
      specializationSlug?: string;
      processId?: number;
      limit?: number;
    }
  ): Promise<RagResult[]> {
    const { userId, specializationSlug, processId, limit = 15 } = options;
    const results: RagResult[] = [];

    // 1. Se há especialização, buscar conhecimento dela primeiro
    if (specializationSlug) {
      const specService = getSpecializationService();
      const specResults = await specService.searchSpecializationKnowledge(
        query,
        userId,
        specializationSlug,
        { limit: 5 }
      );

      // Converter para formato RagResult
      for (const r of specResults) {
        results.push({
          content: r.content,
          source: r.source,
          score: r.relevanceScore,
          type: r.type === "BUILT_IN" ? "FONAJE" : "USER_THESIS",
          metadata: r.metadata
        });
      }
    }

    // 2. Buscar teses aprendidas (filtradas por especialização se houver)
    const thesesResults = await this.searchLegalTheses(query, {
      userId,
      limit: 5,
      specializationSlug // Novo filtro opcional
    });
    results.push(...thesesResults);

    // 3. Buscar documentos do processo (se houver)
    if (processId) {
      const processResults = await this.searchProcessDocuments(query, processId, 5);
      results.push(...processResults);
    }

    // 4. Buscar knowledge base geral
    const kbResults = await this.searchKnowledgeBase(query, 3);
    results.push(...kbResults);

    // Deduplicate e ordenar por score
    return this.deduplicateAndRank(results).slice(0, limit);
  }

  /**
   * MODIFICADO: Adiciona filtro por especialização
   */
  async searchLegalTheses(
    query: string,
    options: {
      userId: number;
      limit?: number;
      specializationSlug?: string; // NOVO
    }
  ): Promise<RagResult[]> {
    // ... implementação existente com filtro adicional
  }
}
```

---

### 7.3 Integração com davidRouter

```typescript
// server/davidRouter.ts (modificações)

// No handler de sendMessage, antes de construir o contexto:

const sendMessage = protectedProcedure
  .input(/* ... */)
  .mutation(async ({ ctx, input }) => {
    // ... código existente ...

    // NOVO: Buscar especialização ativa
    const specService = getSpecializationService();
    const activeSpec = await specService.getActiveSpecialization(ctx.userId);

    // Construir contexto COM especialização
    const contextBuilder = createConcreteBuilder(/* params */)
      .withCoreIdentity()
      .withCoreTone();

    // NOVO: Injetar especialização se houver
    if (activeSpec) {
      await contextBuilder.withUserSpecialization(ctx.userId);

      // Marcar como usado
      await specService.markAsUsed(ctx.userId, activeSpec.spec.slug);
    }

    // Continuar com motors e RAG
    contextBuilder
      .withMotorA()
      .withMotorB()
      .withMotorC() // Já inclui adição da especialização
      .withMotorD(); // Já inclui adição da especialização

    // NOVO: RAG com conhecimento da especialização
    const ragResults = await getRagService().searchWithSpecialization(query, {
      userId: ctx.userId,
      specializationSlug: activeSpec?.spec.slug,
      processId: input.processId,
      limit: 15
    });

    contextBuilder.withRagResults(ragResults);

    // ... resto do código existente ...
  });
```

---

### 7.4 Registrar Router

```typescript
// server/routers.ts

import { specializationRouter } from "./modules/specializations/specializationRouter";

export const appRouter = router({
  // ... routers existentes ...
  auth: authRouter,
  processes: processesRouter,
  conversations: conversationRouter,
  david: davidRouter,
  thesis: thesisRouter,
  prompt: promptRouter,

  // NOVO
  specialization: specializationRouter,
});
```

---

## 8. Frontend: Interface do Usuário

### 8.1 Página de Especializações

```tsx
// client/src/pages/Especializacoes.tsx

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { SpecializationCard } from "@/components/specializations/SpecializationCard";
import { SpecializationConfigDialog } from "@/components/specializations/SpecializationConfigDialog";
import { SpecializationDocsDialog } from "@/components/specializations/SpecializationDocsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, BookOpen, FileText } from "lucide-react";

export default function Especializacoes() {
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [docsDialogOpen, setDocsDialogOpen] = useState(false);

  // Queries
  const { data: specs, isLoading: loadingSpecs } = trpc.specialization.list.useQuery();
  const { data: userSpecs } = trpc.specialization.getUserSpecializations.useQuery();

  // Mutations
  const activateMutation = trpc.specialization.activate.useMutation();
  const deactivateMutation = trpc.specialization.deactivate.useMutation();

  const handleActivate = async (slug: string) => {
    await activateMutation.mutateAsync({ slug });
    // Refetch
  };

  const handleDeactivate = async (slug: string) => {
    await deactivateMutation.mutateAsync({ slug });
  };

  const handleConfigure = (slug: string) => {
    setSelectedSpec(slug);
    setConfigDialogOpen(true);
  };

  const handleManageDocs = (slug: string) => {
    setSelectedSpec(slug);
    setDocsDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Especializações
          </h1>
          <p className="text-muted-foreground mt-1">
            Ative especializações para adaptar o David a áreas específicas do Direito
          </p>
        </div>

        {/* Especialização Ativa */}
        {userSpecs?.active && (
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Especialização Ativa
                </p>
                <p className="text-lg font-semibold">
                  {userSpecs.active.name}
                </p>
              </div>
              <button
                onClick={() => handleDeactivate(userSpecs.active!.slug)}
                className="text-sm text-blue-600 hover:underline"
              >
                Desativar
              </button>
            </div>
          </div>
        )}

        {/* Lista de Especializações */}
        <Tabs defaultValue="disponiveis">
          <TabsList>
            <TabsTrigger value="disponiveis">
              <BookOpen className="h-4 w-4 mr-2" />
              Disponíveis
            </TabsTrigger>
            <TabsTrigger value="meus-docs">
              <FileText className="h-4 w-4 mr-2" />
              Meus Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="disponiveis" className="mt-6">
            {loadingSpecs ? (
              <div>Carregando...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {specs?.map((spec) => (
                  <SpecializationCard
                    key={spec.slug}
                    spec={spec}
                    isActive={userSpecs?.active?.slug === spec.slug}
                    onActivate={() => handleActivate(spec.slug)}
                    onDeactivate={() => handleDeactivate(spec.slug)}
                    onConfigure={() => handleConfigure(spec.slug)}
                    onManageDocs={() => handleManageDocs(spec.slug)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meus-docs" className="mt-6">
            {/* Lista de documentos do usuário agrupados por especialização */}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <SpecializationConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        specSlug={selectedSpec}
      />

      <SpecializationDocsDialog
        open={docsDialogOpen}
        onOpenChange={setDocsDialogOpen}
        specSlug={selectedSpec}
      />
    </DashboardLayout>
  );
}
```

---

### 8.2 Card de Especialização

```tsx
// client/src/components/specializations/SpecializationCard.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings, FileText, CheckCircle } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SpecializationCardProps {
  spec: {
    slug: string;
    name: string;
    shortName: string;
    description: string;
    icon: string;
    color: string;
  };
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onConfigure: () => void;
  onManageDocs: () => void;
}

export function SpecializationCard({
  spec,
  isActive,
  onActivate,
  onDeactivate,
  onConfigure,
  onManageDocs,
}: SpecializationCardProps) {
  // Obter ícone dinamicamente
  const IconComponent = (LucideIcons as any)[spec.icon] || LucideIcons.BookOpen;

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    pink: "bg-pink-100 text-pink-600 border-pink-200",
    red: "bg-red-100 text-red-600 border-red-200",
    green: "bg-green-100 text-green-600 border-green-200",
  };

  return (
    <Card className={`relative ${isActive ? "ring-2 ring-blue-500" : ""}`}>
      {isActive && (
        <Badge className="absolute -top-2 -right-2 bg-blue-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[spec.color] || colorClasses.blue}`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => checked ? onActivate() : onDeactivate()}
          />
        </div>
        <CardTitle className="mt-3">{spec.name}</CardTitle>
        <CardDescription>{spec.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            disabled={!isActive}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onManageDocs}
          >
            <FileText className="h-4 w-4 mr-1" />
            Documentos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 8.3 Badge no Chat

```tsx
// client/src/components/specializations/SpecializationBadge.tsx

import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import * as LucideIcons from "lucide-react";

export function SpecializationBadge() {
  const { data: userSpecs } = trpc.specialization.getUserSpecializations.useQuery();

  if (!userSpecs?.active) return null;

  const { active } = userSpecs;
  const IconComponent = (LucideIcons as any)[active.icon] || LucideIcons.BookOpen;

  return (
    <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
      <IconComponent className="h-3 w-3" />
      {active.shortName}
    </Badge>
  );
}
```

**Uso em David.tsx:**
```tsx
// No header do chat
<div className="flex items-center gap-2">
  <h1>David</h1>
  <SpecializationBadge />
</div>
```

---

### 8.4 Rotas e Menu

```typescript
// client/src/App.tsx

<Route path="/especializacoes" component={Especializacoes} />
```

```tsx
// client/src/components/DashboardLayout.tsx

const menuItems = [
  // ... itens existentes
  {
    href: "/especializacoes",
    label: "Especializações",
    icon: GraduationCap,
  },
];
```

---

## 9. Fluxo do Usuário

### 9.1 Ativação de Especialização

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE ATIVAÇÃO                               │
└─────────────────────────────────────────────────────────────────────────┘

1. Usuário acessa /especializacoes
   │
   ▼
2. Lista de especializações disponíveis
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │   JEC    │  │ Família  │  │ Criminal │
   │   OFF    │  │   OFF    │  │   OFF    │
   └──────────┘  └──────────┘  └──────────┘
   │
   ▼
3. Clica no toggle do JEC → Ativa
   │
   ▼
4. Modal de configuração aparece (opcional)
   ┌────────────────────────────────────────┐
   │  Configurar JEC                        │
   │  ─────────────────────────────────     │
   │  Turma Recursal: [ 1ª TR/RJ     ▼]     │
   │  Instruções: [________________]        │
   │                                        │
   │  [Cancelar]              [Salvar]      │
   └────────────────────────────────────────┘
   │
   ▼
5. Especialização ativa!
   ┌──────────────────────────────────────┐
   │  ✓ Especialização Ativa: JEC        │
   │    Turma Recursal: 1ª TR/RJ         │
   │    [Desativar]  [Configurar]        │
   └──────────────────────────────────────┘
   │
   ▼
6. Badge aparece no chat: [JEC]
```

---

### 9.2 Upload de Documentos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE UPLOAD DE DOCUMENTOS                      │
└─────────────────────────────────────────────────────────────────────────┘

1. Na página de especializações, clica em "Documentos" do JEC
   │
   ▼
2. Modal de gerenciamento de documentos
   ┌────────────────────────────────────────────────────────────┐
   │  Documentos - JEC                                          │
   │  ──────────────────────────────────────────────────────    │
   │                                                            │
   │  [+ Adicionar Documento]                                   │
   │                                                            │
   │  ┌──────────────────────────────────────────────────────┐ │
   │  │ 📄 Sentença - Cobrança Indevida Telefonia            │ │
   │  │    Tipo: MODELO_SENTENCA | Fonte: Próprio            │ │
   │  │    Adicionado em: 15/01/2026                         │ │
   │  │    [Visualizar] [Remover]                            │ │
   │  └──────────────────────────────────────────────────────┘ │
   │                                                            │
   │  ┌──────────────────────────────────────────────────────┐ │
   │  │ 📄 Acórdão TR/RJ - Dano Moral Banco                  │ │
   │  │    Tipo: JURISPRUDENCIA | Fonte: 1ª TR/RJ            │ │
   │  │    Adicionado em: 10/01/2026                         │ │
   │  │    [Visualizar] [Remover]                            │ │
   │  └──────────────────────────────────────────────────────┘ │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
   │
   ▼
3. Clica em "+ Adicionar Documento"
   │
   ▼
4. Formulário de upload
   ┌────────────────────────────────────────────────────────────┐
   │  Adicionar Documento                                       │
   │  ──────────────────────────────────────────────────────    │
   │                                                            │
   │  Título: [Sentença - Negativação Indevida               ]  │
   │                                                            │
   │  Tipo:   [ MODELO_SENTENCA                           ▼]    │
   │                                                            │
   │  Fonte:  [1ª TR/RJ                                      ]  │
   │                                                            │
   │  Conteúdo:                                                 │
   │  ┌──────────────────────────────────────────────────────┐ │
   │  │ SENTENÇA                                             │ │
   │  │ Vistos etc.                                          │ │
   │  │ ...                                                  │ │
   │  └──────────────────────────────────────────────────────┘ │
   │                                                            │
   │  Ou: [📎 Upload de arquivo (PDF/DOCX)]                    │
   │                                                            │
   │  [Cancelar]                              [Adicionar]       │
   └────────────────────────────────────────────────────────────┘
   │
   ▼
5. Sistema processa:
   - Extrai texto (se PDF)
   - Gera embedding
   - Armazena no banco
   │
   ▼
6. Documento disponível para RAG!
```

---

### 9.3 Uso no Chat

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE USO NO CHAT                            │
└─────────────────────────────────────────────────────────────────────────┘

1. Usuário entra no /david com especialização JEC ativa
   │
   ▼
2. Interface mostra badge [JEC] no header
   │
   ▼
3. Usuário envia mensagem:
   "Minuta uma sentença de procedência para ação de
    cobrança indevida contra operadora de telefonia"
   │
   ▼
4. Backend processa:
   │
   ├─► IntentService classifica: DRAFT
   │
   ├─► ContextBuilder monta prompt:
   │   - CORE_IDENTITY
   │   - CORE_TONE
   │   - [ESPECIALIZAÇÃO JEC] ← NOVO
   │   - MOTOR_B (com adição JEC)
   │   - MOTOR_C (com adição JEC)
   │   - MOTOR_D (com adição JEC)
   │
   ├─► RagService busca:
   │   - Enunciados FONAJE relevantes
   │   - Documentos do usuário (JEC)
   │   - Teses aprendidas (filtradas JEC)
   │   - Knowledge base geral
   │
   └─► LLM gera resposta com:
       - Linguagem acessível (JEC)
       - Citação de Enunciados FONAJE
       - Sem referência a STJ
       - Fundamentação concisa
   │
   ▼
5. Resposta exibida ao usuário com:
   - Minuta no formato JEC
   - Citações de enunciados
   - Linguagem adequada
```

---

## 10. Plano de Implementação

### 10.1 Fases

| Fase | Descrição | Estimativa | Dependências |
|------|-----------|------------|--------------|
| **1** | Schema e migrações | 1 dia | - |
| **2** | Módulo JEC (prompts + knowledge) | 2 dias | Fase 1 |
| **3** | SpecializationService | 2 dias | Fase 1, 2 |
| **4** | tRPC Router | 1 dia | Fase 3 |
| **5** | Integração ContextBuilder | 1 dia | Fase 3 |
| **6** | Integração RagService | 1 dia | Fase 3 |
| **7** | Integração davidRouter | 1 dia | Fase 5, 6 |
| **8** | Frontend: Página Especializações | 2 dias | Fase 4 |
| **9** | Frontend: Dialogs e Badge | 1 dia | Fase 8 |
| **10** | Testes e ajustes | 2 dias | Todas |

**Total estimado: 14 dias**

---

### 10.2 Tarefas Detalhadas

#### Fase 1: Schema e Migrações

- [ ] Adicionar tabelas no `drizzle/schema.ts`
  - [ ] `specializations`
  - [ ] `userSpecializations`
  - [ ] `specializationDocuments`
- [ ] Executar `pnpm db:push`
- [ ] Criar seed inicial com especializações disponíveis

#### Fase 2: Módulo JEC

- [ ] Criar estrutura `server/modules/specializations/`
- [ ] Implementar `types.ts` com interfaces
- [ ] Implementar `jec/prompts.ts`
- [ ] Implementar `jec/knowledge.ts` (enunciados FONAJE)
- [ ] Implementar `jec/rules.ts`
- [ ] Implementar `jec/templates.ts`
- [ ] Implementar `jec/index.ts` (classe JECSpecialization)

#### Fase 3: SpecializationService

- [ ] Implementar `SpecializationService.ts`
  - [ ] `getActiveSpecialization()`
  - [ ] `activateSpecialization()`
  - [ ] `deactivateSpecialization()`
  - [ ] `updateSpecializationConfig()`
  - [ ] `searchSpecializationKnowledge()`
  - [ ] `addUserDocument()`
  - [ ] `getUserDocuments()`
  - [ ] `removeUserDocument()`
- [ ] Implementar `index.ts` (registry)

#### Fase 4: tRPC Router

- [ ] Implementar `specializationRouter.ts`
- [ ] Registrar em `routers.ts`
- [ ] Testar endpoints via Postman/Insomnia

#### Fase 5: Integração ContextBuilder

- [ ] Adicionar método `withUserSpecialization()`
- [ ] Modificar `withMotorC()` para incluir adição
- [ ] Modificar `withMotorD()` para incluir adição
- [ ] Adicionar getter `getActiveSpecialization()`

#### Fase 6: Integração RagService

- [ ] Adicionar método `searchWithSpecialization()`
- [ ] Modificar `searchLegalTheses()` com filtro
- [ ] Implementar busca em conhecimento built-in

#### Fase 7: Integração davidRouter

- [ ] Buscar especialização ativa no início
- [ ] Passar para ContextBuilder
- [ ] Usar no RagService
- [ ] Marcar como usado após resposta

#### Fase 8: Frontend - Página

- [ ] Criar `pages/Especializacoes.tsx`
- [ ] Adicionar rota em `App.tsx`
- [ ] Adicionar item no menu `DashboardLayout.tsx`

#### Fase 9: Frontend - Componentes

- [ ] Criar `components/specializations/SpecializationCard.tsx`
- [ ] Criar `components/specializations/SpecializationConfigDialog.tsx`
- [ ] Criar `components/specializations/SpecializationDocsDialog.tsx`
- [ ] Criar `components/specializations/SpecializationBadge.tsx`
- [ ] Integrar badge em `David.tsx`

#### Fase 10: Testes

- [ ] Testes unitários do SpecializationService
- [ ] Testes de integração do router
- [ ] Teste E2E do fluxo completo
- [ ] Teste de performance do RAG com especialização
- [ ] Validação com usuário real

---

## 11. Testes e Validação

### 11.1 Testes Unitários

```typescript
// server/modules/specializations/__tests__/SpecializationService.test.ts

describe("SpecializationService", () => {
  describe("getActiveSpecialization", () => {
    it("deve retornar null se usuário não tem especialização ativa", async () => {
      const service = getSpecializationService();
      const result = await service.getActiveSpecialization(999);
      expect(result).toBeNull();
    });

    it("deve retornar especialização ativa com config", async () => {
      // Setup: ativar JEC para usuário
      const service = getSpecializationService();
      await service.activateSpecialization(1, "jec", { turmaRecursal: "1ª TR/RJ" });

      const result = await service.getActiveSpecialization(1);
      expect(result).not.toBeNull();
      expect(result?.spec.slug).toBe("jec");
      expect(result?.config.turmaRecursal).toBe("1ª TR/RJ");
    });
  });

  describe("searchSpecializationKnowledge", () => {
    it("deve encontrar enunciados FONAJE relevantes", async () => {
      const service = getSpecializationService();
      const results = await service.searchSpecializationKnowledge(
        "dano moral cadastro inadimplentes",
        1,
        "jec",
        { includeBuiltIn: true }
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].source).toContain("FONAJE");
    });
  });
});
```

### 11.2 Teste E2E

```typescript
// e2e/specializations.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Especializações", () => {
  test("deve ativar e usar especialização JEC", async ({ page }) => {
    // 1. Navegar para especializações
    await page.goto("/especializacoes");

    // 2. Ativar JEC
    const jecCard = page.locator('[data-spec="jec"]');
    await jecCard.locator('button[role="switch"]').click();

    // 3. Verificar badge no chat
    await page.goto("/david");
    await expect(page.locator('[data-testid="spec-badge"]')).toContainText("JEC");

    // 4. Enviar mensagem e verificar resposta
    await page.fill('[data-testid="chat-input"]', "O que é o FONAJE?");
    await page.click('[data-testid="send-button"]');

    // 5. Aguardar resposta
    const response = page.locator('[data-testid="assistant-message"]').last();
    await expect(response).toContainText("Fórum Nacional de Juizados Especiais", { timeout: 30000 });
  });
});
```

### 11.3 Checklist de Validação Manual

```markdown
## Checklist de Validação - Especialização JEC

### Ativação
- [ ] Especialização JEC aparece na lista
- [ ] Toggle ativa/desativa corretamente
- [ ] Badge aparece no chat quando ativo
- [ ] Configuração é salva e recuperada

### Conhecimento
- [ ] Enunciados FONAJE são encontrados no RAG
- [ ] Documentos do usuário são indexados
- [ ] Busca prioriza conhecimento da especialização

### Respostas
- [ ] Linguagem é mais acessível (sem juridiquês)
- [ ] Cita enunciados FONAJE (não STJ)
- [ ] Fundamentação é concisa
- [ ] Menciona prazos corretos (10 dias recurso)

### Edge Cases
- [ ] Desativar não perde documentos do usuário
- [ ] Trocar de especialização funciona
- [ ] Múltiplas especializações não conflitam
```

---

## 12. Futuras Especializações

### 12.1 Direito de Família

```typescript
// server/modules/specializations/familia/

Conhecimento:
- Enunciados do IBDFAM
- Súmulas do STJ (família)
- Tabela de alimentos (% por renda)
- Modelos de partilha, guarda, alimentos

Prompts específicos:
- Sensibilidade em questões familiares
- Linguagem adequada para crianças/adolescentes
- Proteção de dados pessoais
- Mediação e conciliação prioritárias
```

### 12.2 Direito Penal

```typescript
// server/modules/specializations/criminal/

Conhecimento:
- Súmulas STF/STJ (penal)
- Tabela de penas (CP)
- Regime de cumprimento
- Jurisprudência em dosimetria

Prompts específicos:
- Rigor na fundamentação (art. 93, IX CF)
- Individualização da pena
- Presunção de inocência
- Princípios do in dubio pro reo
```

### 12.3 Fazenda Pública

```typescript
// server/modules/specializations/fazenda/

Conhecimento:
- Súmulas vinculantes (tributário)
- Repercussão geral (tributário)
- FONAJEF (Fazenda)
- Legislação tributária

Prompts específicos:
- Prerrogativas da Fazenda
- Prazos diferenciados
- Remessa necessária
- Prescrição/decadência tributária
```

---

## 13. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Performance do RAG com muitos enunciados | Média | Alto | Cache de embeddings, pré-computar na inicialização |
| Conflito entre especializações | Baixa | Médio | Permitir apenas uma ativa por vez |
| Conhecimento desatualizado (FONAJE muda) | Média | Médio | Criar processo de atualização, versionamento |
| Complexidade de configuração | Média | Baixo | UX simples, defaults sensatos |
| Overhead no ContextBuilder | Baixa | Médio | Lazy loading, cache de prompts |

---

## Conclusão

O módulo de especializações representa uma evolução significativa do David, permitindo que ele se torne um assistente verdadeiramente especializado em diferentes áreas do Direito. A implementação piloto com JEC serve como prova de conceito e base para futuras expansões.

O design modular permite adicionar novas especializações sem impactar o código existente, seguindo o princípio Open/Closed. A integração com os sistemas existentes (ContextBuilder, RagService, davidRouter) é minimamente invasiva.

---

**Próximo passo recomendado**: Iniciar pela Fase 1 (Schema) assim que o MVP estiver validado com usuários.
