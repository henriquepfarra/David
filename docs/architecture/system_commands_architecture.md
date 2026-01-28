# Arquitetura de Comandos do Sistema (Slash Commands)

> **Versão:** 1.4
> **Data:** 2025-01-22
> **Status:** ✅ Aprovado para Codificação
> **Revisão:** Decisões finais do Gerente de Desenvolvimento

## 1. Visão Geral

### 1.1 O Problema

O David precisa de comandos especiais (`/analise1`, `/minutar`, `/tese`, etc.) que executam fluxos complexos e multi-etapas. Esses comandos são diferentes dos "Prompts Salvos" do usuário porque:

| Aspecto | Prompts Salvos (usuário) | Comandos do Sistema |
|---------|--------------------------|---------------------|
| Quem cria | Usuário | Desenvolvedor |
| Onde armazena | Banco de dados | Código |
| Complexidade | Texto simples | Fluxos multi-etapa |
| Editável | Sim | Não |
| Lógica condicional | Não | Sim |
| Múltiplas chamadas LLM | Não | Sim |

### 1.2 A Solução

Criar uma **camada de comandos do sistema** que:

1. **Intercepta** comandos `/xxx` antes do fluxo normal
2. **Orquestra** múltiplas etapas com motores específicos
3. **Respeita** o módulo ativo (JEC, Família, etc.)
4. **Retorna** resultados estruturados ao usuário

---

## 2. Classificação dos Comandos

### 2.1 Comandos Simples vs. Orquestrados

| Comando | Tipo | Descrição | Motores |
|---------|------|-----------|---------|
| `/consultar [tema]` | Simples | Busca na base de conhecimento | B |
| `/tese` | Simples | Extrai aprendizado da conversa | C |
| `/analise1` | Orquestrado | Triagem inicial (6 etapas) | A → C → C → B → C+D → C |
| `/analise2` | Orquestrado | Saneamento processual (6 etapas) | A → A → C → B → C → C |
| `/minutar [veredito]` | Orquestrado | Redação final (3 etapas) | B → C → C |

### 2.2 Por que a distinção importa?

**Comandos Simples:** Uma única chamada ao LLM com prompt específico.

**Comandos Orquestrados:** Múltiplas chamadas sequenciais, onde:
- Cada etapa usa motor(es) específico(s)
- O output de uma etapa alimenta a próxima
- Há checkpoints condicionais (se falhou → para)
- O usuário vê progresso em tempo real

---

## 3. Arquitetura Proposta

### 3.1 Estrutura de Pastas

```
server/
├── commands/
│   ├── index.ts                    # Registro central + dispatcher
│   ├── types.ts                    # Tipos TypeScript
│   │
│   ├── handlers/                   # Handlers por comando
│   │   ├── consultar.handler.ts    # Simples
│   │   ├── tese.handler.ts         # Simples
│   │   ├── analise1.handler.ts     # Orquestrado
│   │   ├── analise2.handler.ts     # Orquestrado
│   │   └── minutar.handler.ts      # Orquestrado
│   │
│   ├── prompts/                    # Prompts por etapa
│   │   ├── analise1/
│   │   │   ├── etapa1-auditoria.ts
│   │   │   ├── etapa2-saneamento.ts
│   │   │   ├── etapa3-admissibilidade.ts
│   │   │   ├── etapa4-confronto.ts
│   │   │   ├── etapa5-tutela.ts
│   │   │   └── etapa6-veredito.ts
│   │   ├── analise2/
│   │   │   └── ...
│   │   └── minutar/
│   │       └── ...
│   │
│   └── steps/                      # Etapas reutilizáveis
│       ├── auditoria-fatica.ts     # Usado em analise1 e analise2
│       ├── confronto-acervo.ts     # Usado em analise1 e analise2
│       └── checkout-qualidade.ts   # Usado em minutar
```

### 3.2 Registro de Comandos

```typescript
// server/commands/index.ts

import { analise1Handler } from './handlers/analise1.handler'
import { analise2Handler } from './handlers/analise2.handler'
import { minutarHandler } from './handlers/minutar.handler'
import { consultarHandler } from './handlers/consultar.handler'
import { teseHandler } from './handlers/tese.handler'

export const SYSTEM_COMMANDS: Record<string, CommandDefinition> = {
  '/analise1': {
    slug: 'analise1',
    name: 'Triagem Inicial',
    description: 'Análise completa de petição inicial com auditoria fática',
    type: 'orchestrated',
    modules: ['jec'],  // Só disponível no JEC
    requiresProcess: true,
    handler: analise1Handler,
  },

  '/analise2': {
    slug: 'analise2',
    name: 'Saneamento Processual',
    description: 'Análise de andamento e pendências processuais',
    type: 'orchestrated',
    modules: ['jec'],
    requiresProcess: true,
    handler: analise2Handler,
  },

  '/minutar': {
    slug: 'minutar',
    name: 'Minutar Decisão',
    description: 'Gera minuta de decisão/sentença/despacho',
    type: 'orchestrated',
    modules: ['jec', 'familia', 'fazenda', 'criminal'],
    requiresProcess: true,
    requiresArgument: true,  // /minutar [veredito]
    handler: minutarHandler,
  },

  '/consultar': {
    slug: 'consultar',
    name: 'Consultar Base',
    description: 'Busca teses e diretrizes na base de conhecimento',
    type: 'simple',
    modules: ['*'],  // Todos os módulos
    requiresProcess: false,
    requiresArgument: true,  // /consultar [tema]
    handler: consultarHandler,
  },

  '/tese': {
    slug: 'tese',
    name: 'Extrair Tese',
    description: 'Extrai aprendizado institucional da conversa',
    type: 'simple',
    modules: ['*'],
    requiresProcess: false,
    handler: teseHandler,
  },
}

// Função para buscar comandos disponíveis por módulo
export function getAvailableCommands(moduleSlug: string): CommandDefinition[] {
  return Object.values(SYSTEM_COMMANDS).filter(cmd =>
    cmd.modules.includes('*') || cmd.modules.includes(moduleSlug)
  )
}
```

### 3.3 Tipos TypeScript

```typescript
// server/commands/types.ts

export type CommandType = 'simple' | 'orchestrated'

export type ModuleSlug = 'jec' | 'familia' | 'fazenda' | 'criminal' | 'default'

export interface CommandDefinition {
  slug: string
  name: string
  description: string
  type: CommandType
  modules: (ModuleSlug | '*')[]
  requiresProcess: boolean
  requiresArgument?: boolean
  handler: CommandHandler
}

export interface CommandContext {
  userId: string
  conversationId: string
  processId?: string
  moduleSlug: ModuleSlug
  argument?: string  // Para /minutar [veredito] ou /consultar [tema]
  history: Message[]
}

export interface StepResult {
  stepName: string
  motorUsed: MotorType[]
  output: string
  analysis?: Record<string, unknown>  // Dados estruturados extraídos
  shouldContinue: boolean
  blockReason?: string  // Se shouldContinue = false
}

export interface CommandResult {
  success: boolean
  veredito?: string
  steps: StepResult[]
  finalOutput: string
  suggestion?: string
  modelSuggested?: number  // Número do modelo sugerido
}

export type CommandHandler = (ctx: CommandContext) => AsyncGenerator<CommandEvent>

export type CommandEvent =
  | { type: 'step_start'; step: string; description: string }
  | { type: 'step_progress'; step: string; chunk: string }
  | { type: 'step_complete'; step: string; result: StepResult }
  | { type: 'command_complete'; result: CommandResult }
  | { type: 'command_error'; error: string }
```

---

## 4. Implementação dos Handlers

### 4.1 Handler Simples: `/consultar`

```typescript
// server/commands/handlers/consultar.handler.ts

import { MOTOR_B_PROMPT } from '@/prompts/engines'
import { CommandContext, CommandHandler } from '../types'

export const consultarHandler: CommandHandler = async function* (ctx) {
  const { argument: tema, userId } = ctx

  if (!tema) {
    yield { type: 'command_error', error: 'Uso: /consultar [tema]' }
    return
  }

  yield {
    type: 'step_start',
    step: 'consulta',
    description: `Buscando "${tema}" na base de conhecimento...`
  }

  // Única chamada ao LLM com Motor B
  const response = await invokeLLM({
    systemPrompt: MOTOR_B_PROMPT,
    userPrompt: `
      Varre a Base de Conhecimento (Teses e Diretrizes + Decisões 2025)
      em busca de match semântico e jurídico sobre: "${tema}"

      Regras:
      - Não invente. Apenas relate o que encontrar.
      - Se encontrar: "Sobre [tema], encontrei a Tese [TM-XX] que diz..."
      - Se não encontrar: "O Motor B não encontrou diretrizes específicas na base atual."
    `,
    userId,
    ragScope: 'USER',  // Busca na base do usuário
  })

  yield {
    type: 'step_complete',
    step: 'consulta',
    result: {
      stepName: 'Consulta à Base',
      motorUsed: ['B'],
      output: response,
      shouldContinue: true,
    }
  }

  yield {
    type: 'command_complete',
    result: {
      success: true,
      steps: [/* ... */],
      finalOutput: response,
    }
  }
}
```

### 4.2 Handler Orquestrado: `/analise1`

```typescript
// server/commands/handlers/analise1.handler.ts

import { CommandContext, CommandHandler, StepResult } from '../types'
import {
  ETAPA1_AUDITORIA_PROMPT,
  ETAPA2_SANEAMENTO_PROMPT,
  ETAPA3_ADMISSIBILIDADE_PROMPT,
  ETAPA4_CONFRONTO_PROMPT,
  ETAPA5_TUTELA_PROMPT,
  ETAPA6_VEREDITO_PROMPT,
} from '../prompts/analise1'

export const analise1Handler: CommandHandler = async function* (ctx) {
  const { processId, userId, moduleSlug } = ctx
  const steps: StepResult[] = []

  // Validação inicial
  if (!processId) {
    yield { type: 'command_error', error: 'Este comando requer um processo vinculado.' }
    return
  }

  if (moduleSlug !== 'jec') {
    yield { type: 'command_error', error: 'Comando /analise1 disponível apenas no módulo JEC.' }
    return
  }

  // ═══════════════════════════════════════════════════════════
  // ETAPA 1: AUDITORIA FÁTICA (Motor A - Detetive)
  // ═══════════════════════════════════════════════════════════
  yield {
    type: 'step_start',
    step: 'etapa1',
    description: '📝 Etapa 1: Auditoria Fática (Modo Detetive)'
  }

  const etapa1 = await executeStep({
    motors: ['A'],
    systemPrompt: ETAPA1_AUDITORIA_PROMPT,
    processId,
    userId,
    ragScope: 'OFF',  // Só documentos do processo
  })

  steps.push(etapa1)
  yield { type: 'step_complete', step: 'etapa1', result: etapa1 }

  // ═══════════════════════════════════════════════════════════
  // ETAPA 2: SANEAMENTO FORMAL (Motor C - Jurista, Modo Legalidade)
  // ═══════════════════════════════════════════════════════════
  yield {
    type: 'step_start',
    step: 'etapa2',
    description: '🛡️ Etapa 2: Saneamento Formal (Gatekeeper)'
  }

  const etapa2 = await executeStep({
    motors: ['C'],
    systemPrompt: ETAPA2_SANEAMENTO_PROMPT,
    context: etapa1.output,  // Contexto da etapa anterior
    processId,
    userId,
  })

  steps.push(etapa2)
  yield { type: 'step_complete', step: 'etapa2', result: etapa2 }

  // CHECKPOINT: Se tem vício formal, PARA aqui
  if (etapa2.analysis?.hasVicio) {
    yield {
      type: 'command_complete',
      result: {
        success: true,
        veredito: 'EXTINÇÃO_OU_EMENDA',
        steps,
        finalOutput: etapa2.output,
        suggestion: etapa2.analysis.suggestion as string,
      }
    }
    return
  }

  // ═══════════════════════════════════════════════════════════
  // ETAPA 3: ADMISSIBILIDADE MATERIAL (Motor C - Filtro de Densidade)
  // ═══════════════════════════════════════════════════════════
  yield {
    type: 'step_start',
    step: 'etapa3',
    description: '🔍 Etapa 3: Admissibilidade Material (Filtro de Complexidade)'
  }

  const etapa3 = await executeStep({
    motors: ['C'],
    systemPrompt: ETAPA3_ADMISSIBILIDADE_PROMPT,
    context: [etapa1.output, etapa2.output].join('\n\n'),
    processId,
    userId,
  })

  steps.push(etapa3)
  yield { type: 'step_complete', step: 'etapa3', result: etapa3 }

  // CHECKPOINT: Se incompatível com rito sumaríssimo
  if (etapa3.analysis?.incompatible) {
    yield {
      type: 'command_complete',
      result: {
        success: true,
        veredito: 'EXTINÇÃO_INCOMPETÊNCIA',
        steps,
        finalOutput: etapa3.output,
        suggestion: 'Sugerir extinção por incompetência (Enunciado 54 FONAJE)',
      }
    }
    return
  }

  // ═══════════════════════════════════════════════════════════
  // ETAPA 4: CONFRONTO COM ACERVO (Motor B - Guardião)
  // ═══════════════════════════════════════════════════════════
  yield {
    type: 'step_start',
    step: 'etapa4',
    description: '🗄️ Etapa 4: Confronto com Acervo (Busca de Teses)'
  }

  const etapa4 = await executeStep({
    motors: ['B'],
    systemPrompt: ETAPA4_CONFRONTO_PROMPT,
    context: etapa1.output,  // Fatos da Etapa 1
    processId,
    userId,
    ragScope: 'USER',  // Busca teses do usuário
  })

  steps.push(etapa4)
  yield { type: 'step_complete', step: 'etapa4', result: etapa4 }

  // ═══════════════════════════════════════════════════════════
  // ETAPA 5: ANÁLISE DE TUTELA (Motor C + D)
  // ═══════════════════════════════════════════════════════════
  yield {
    type: 'step_start',
    step: 'etapa5',
    description: '⚡ Etapa 5: Análise de Tutela de Urgência'
  }

  const etapa5 = await executeStep({
    motors: ['C', 'D'],  // Jurista + Advogado do Diabo
    systemPrompt: ETAPA5_TUTELA_PROMPT,
    context: [etapa1.output, etapa4.output].join('\n\n'),
    processId,
    userId,
  })

  steps.push(etapa5)
  yield { type: 'step_complete', step: 'etapa5', result: etapa5 }

  // ═══════════════════════════════════════════════════════════
  // ETAPA 6: VEREDITO FINAL (Motor C)
  // ═══════════════════════════════════════════════════════════
  yield {
    type: 'step_start',
    step: 'etapa6',
    description: '🎯 Etapa 6: Veredito Técnico'
  }

  const etapa6 = await executeStep({
    motors: ['C'],
    systemPrompt: ETAPA6_VEREDITO_PROMPT,
    context: steps.map(s => s.output).join('\n\n---\n\n'),
    processId,
    userId,
  })

  steps.push(etapa6)
  yield { type: 'step_complete', step: 'etapa6', result: etapa6 }

  // ═══════════════════════════════════════════════════════════
  // RESULTADO FINAL
  // ═══════════════════════════════════════════════════════════
  yield {
    type: 'command_complete',
    result: {
      success: true,
      veredito: etapa6.analysis?.veredito as string,
      steps,
      finalOutput: formatFinalOutput(steps),
      suggestion: etapa6.analysis?.suggestion as string,
      modelSuggested: etapa6.analysis?.modelNumber as number,
    }
  }
}

// Helper para formatar output consolidado
function formatFinalOutput(steps: StepResult[]): string {
  return steps.map(s => `## ${s.stepName}\n\n${s.output}`).join('\n\n---\n\n')
}
```

### 4.3 Função `executeStep` (Core)

```typescript
// server/commands/steps/executor.ts

import { getMotorPrompt } from '@/prompts/engines'
import { MotorType, StepResult } from '../types'

interface ExecuteStepParams {
  motors: MotorType[]
  systemPrompt: string
  context?: string
  processId: string
  userId: string
  ragScope?: 'OFF' | 'USER' | 'ALL'
}

export async function executeStep(params: ExecuteStepParams): Promise<StepResult> {
  const { motors, systemPrompt, context, processId, userId, ragScope = 'OFF' } = params

  // Monta o system prompt com os motores ativos
  const motorPrompts = motors.map(m => getMotorPrompt(m)).join('\n\n')

  const fullSystemPrompt = `
${motorPrompts}

---

${systemPrompt}
  `.trim()

  // Carrega contexto do processo se necessário
  const processContext = await loadProcessContext(processId)

  // Executa RAG se configurado
  let ragContext = ''
  if (ragScope !== 'OFF') {
    ragContext = await performRAG(userId, context || '', ragScope)
  }

  // Monta a mensagem do usuário
  const userMessage = `
${context ? `## Contexto das Etapas Anteriores\n\n${context}\n\n---\n\n` : ''}
${ragContext ? `## Contexto da Base de Conhecimento\n\n${ragContext}\n\n---\n\n` : ''}
## Documentos do Processo

${processContext}
  `.trim()

  // Chama o LLM
  const response = await invokeLLM({
    systemPrompt: fullSystemPrompt,
    userMessage,
    // ... configs
  })

  // Extrai análise estruturada da resposta (se houver marcadores)
  const analysis = extractAnalysis(response)

  return {
    stepName: extractStepName(systemPrompt),
    motorUsed: motors,
    output: response,
    analysis,
    shouldContinue: !analysis?.shouldBlock,
    blockReason: analysis?.blockReason,
  }
}
```

---

## 5. Integração com o Router

### 5.1 Interceptação de Comandos

```typescript
// server/davidRouter.ts (modificação)

import { SYSTEM_COMMANDS, getAvailableCommands } from './commands'
import { dispatchCommand } from './commands/dispatcher'

// No sendMessageStream...
sendMessageStream: publicProcedure
  .input(/* ... */)
  .subscription(async function* ({ input, ctx }) {
    const { message, conversationId } = input

    // 1. Detecta se é comando do sistema
    const commandMatch = message.match(/^\/(\w+)(?:\s+(.*))?$/)

    if (commandMatch) {
      const [, commandSlug, argument] = commandMatch
      const commandKey = `/${commandSlug}`
      const commandDef = SYSTEM_COMMANDS[commandKey]

      if (commandDef) {
        // 2. Valida se comando está disponível no módulo atual
        const moduleSlug = await getConversationModule(conversationId)

        if (!commandDef.modules.includes('*') && !commandDef.modules.includes(moduleSlug)) {
          yield {
            type: 'error',
            error: `Comando ${commandKey} não disponível no módulo ${moduleSlug}`
          }
          return
        }

        // 3. Monta contexto do comando
        const commandCtx: CommandContext = {
          userId: ctx.user.id,
          conversationId,
          processId: await getLinkedProcess(conversationId),
          moduleSlug,
          argument,
          history: await getConversationHistory(conversationId),
        }

        // 4. Executa o handler e faz streaming dos eventos
        for await (const event of commandDef.handler(commandCtx)) {
          yield event
        }

        return
      }
    }

    // 5. Fluxo normal (não é comando do sistema)
    // ... código existente
  })
```

### 5.2 Endpoint para Listar Comandos Disponíveis

```typescript
// server/commandsRouter.ts

export const commandsRouter = router({
  // Lista comandos disponíveis no módulo atual
  listAvailable: protectedProcedure
    .input(z.object({ moduleSlug: z.string() }))
    .query(({ input }) => {
      return getAvailableCommands(input.moduleSlug).map(cmd => ({
        trigger: `/${cmd.slug}`,
        name: cmd.name,
        description: cmd.description,
        requiresArgument: cmd.requiresArgument,
      }))
    }),
})
```

---

## 6. Frontend: Slash Command Menu

### 6.1 Componente do Menu

```typescript
// client/src/components/chat/SlashCommandMenu.tsx

interface SlashCommandMenuProps {
  isOpen: boolean
  onSelect: (command: string) => void
  onClose: () => void
  filter: string
  moduleSlug: string
}

export function SlashCommandMenu({ isOpen, onSelect, onClose, filter, moduleSlug }: SlashCommandMenuProps) {
  const { data: commands } = trpc.commands.listAvailable.useQuery({ moduleSlug })

  const filteredCommands = useMemo(() => {
    if (!commands) return []
    if (!filter) return commands
    return commands.filter(cmd =>
      cmd.trigger.toLowerCase().includes(filter.toLowerCase()) ||
      cmd.name.toLowerCase().includes(filter.toLowerCase())
    )
  }, [commands, filter])

  if (!isOpen || filteredCommands.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-gray-800
                    rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
                    overflow-hidden z-50">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500">Comandos Disponíveis</span>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.trigger}
            onClick={() => onSelect(cmd.trigger)}
            className={cn(
              "w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700",
              "flex items-center gap-3 transition-colors",
              index === 0 && "bg-gray-50 dark:bg-gray-750"  // Primeiro item destacado
            )}
          >
            <span className="text-blue-500 font-mono text-sm">{cmd.trigger}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{cmd.name}</div>
              <div className="text-xs text-gray-500 truncate">{cmd.description}</div>
            </div>
            {cmd.requiresArgument && (
              <span className="text-xs text-gray-400">[arg]</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### 6.2 Integração no ChatInput

```typescript
// client/src/components/chat/ChatInput.tsx (modificação)

export function ChatInput({ onSend, moduleSlug }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)

    // Detecta se está digitando comando
    if (value.startsWith('/')) {
      setShowSlashMenu(true)
      setSlashFilter(value.slice(1))  // Remove o "/"
    } else {
      setShowSlashMenu(false)
      setSlashFilter('')
    }
  }

  const handleCommandSelect = (command: string) => {
    // Se comando requer argumento, adiciona espaço para digitar
    setMessage(command + ' ')
    setShowSlashMenu(false)
  }

  return (
    <div className="relative">
      <SlashCommandMenu
        isOpen={showSlashMenu}
        onSelect={handleCommandSelect}
        onClose={() => setShowSlashMenu(false)}
        filter={slashFilter}
        moduleSlug={moduleSlug}
      />

      <textarea
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem ou / para comandos..."
        // ...
      />
    </div>
  )
}
```

### 6.3 Exibição de Progresso das Etapas

```typescript
// client/src/components/chat/CommandProgress.tsx

interface CommandProgressProps {
  events: CommandEvent[]
}

export function CommandProgress({ events }: CommandProgressProps) {
  const currentStep = events.filter(e => e.type === 'step_start').slice(-1)[0]
  const completedSteps = events.filter(e => e.type === 'step_complete')

  return (
    <div className="space-y-3">
      {/* Steps completados */}
      {completedSteps.map((event, i) => (
        <div key={i} className="flex items-center gap-2 text-green-600">
          <CheckCircleIcon className="w-5 h-5" />
          <span>{event.step}</span>
        </div>
      ))}

      {/* Step atual */}
      {currentStep && currentStep.type === 'step_start' && (
        <div className="flex items-center gap-2 text-blue-600 animate-pulse">
          <Loader2Icon className="w-5 h-5 animate-spin" />
          <span>{currentStep.description}</span>
        </div>
      )}
    </div>
  )
}
```

---

## 7. Plano de Implementação

### Fase 1: Infraestrutura Base

| Task | Descrição | Prioridade |
|------|-----------|------------|
| 1.1 | Criar estrutura de pastas `server/commands/` | Alta |
| 1.2 | Definir tipos em `types.ts` | Alta |
| 1.3 | Criar registro em `index.ts` | Alta |
| 1.4 | Implementar `executeStep` básico | Alta |

### Fase 2: Comando MVP (`/consultar`)

| Task | Descrição | Prioridade |
|------|-----------|------------|
| 2.1 | Implementar `consultar.handler.ts` | Alta |
| 2.2 | Integrar interceptação no `davidRouter.ts` | Alta |
| 2.3 | Testar fluxo completo | Alta |

### Fase 3: Frontend

| Task | Descrição | Prioridade |
|------|-----------|------------|
| 3.1 | Criar `SlashCommandMenu.tsx` | Média |
| 3.2 | Integrar no `ChatInput.tsx` | Média |
| 3.3 | Criar `CommandProgress.tsx` | Média |
| 3.4 | Criar endpoint `commands.listAvailable` | Média |

### Fase 4: Comandos Orquestrados

| Task | Descrição | Prioridade |
|------|-----------|------------|
| 4.1 | Criar prompts de cada etapa do `/analise1` | Alta |
| 4.2 | Implementar `analise1.handler.ts` | Alta |
| 4.3 | Testar fluxo completo com checkpoints | Alta |
| 4.4 | Implementar `/analise2` | Média |
| 4.5 | Implementar `/minutar` | Média |
| 4.6 | Implementar `/tese` | Baixa |

### Fase 5: Polish

| Task | Descrição | Prioridade |
|------|-----------|------------|
| 5.1 | Tratamento de erros em cada etapa | Média |
| 5.2 | Retry automático em falhas transientes | Baixa |
| 5.3 | Cache de resultados de etapas | Baixa |
| 5.4 | Logs estruturados para debugging | Média |

---

## 8. Considerações de Design

### 8.1 Por que AsyncGenerator?

Usamos `AsyncGenerator` nos handlers para:

1. **Streaming real**: Cada `yield` é enviado imediatamente ao frontend
2. **Progresso visível**: Usuário vê cada etapa acontecendo
3. **Cancelamento**: Se o usuário cancelar, o generator para
4. **Memória**: Não acumula todo o resultado antes de enviar

### 8.2 Por que separar Handlers de Prompts?

```
handlers/analise1.handler.ts   → Lógica (fluxo, checkpoints, decisões)
prompts/analise1/etapa1.ts     → Conteúdo (instruções para o LLM)
```

Isso permite:
- Mudar o prompt sem mudar a lógica
- Testar prompts isoladamente
- Reutilizar prompts entre comandos
- Versionamento independente

### 8.3 Compatibilidade com Módulos

O design permite que:
- `/analise1` no JEC use prompts diferentes de `/analise1` no Fazenda (futuro)
- Comandos sejam habilitados/desabilitados por módulo
- Cada módulo tenha seus próprios comandos exclusivos

---

## 9. Pontos Críticos de Implementação

> ⚠️ **Seção adicionada após revisão do Gerente de Desenvolvimento**

### 9.1 Protocolo de Comunicação (Event Schema)

O frontend precisa distinguir entre diferentes tipos de eventos. Definimos um contrato rígido:

```typescript
// server/commands/types.ts (refinamento)

/**
 * Eventos emitidos pelo handler durante execução.
 * O frontend usa o `type` para decidir como renderizar.
 */
export type CommandEvent =
  // ═══════════════════════════════════════════════════════════
  // EVENTOS DE ETAPA (Step Events)
  // ═══════════════════════════════════════════════════════════
  | {
      type: 'step_start'
      step: string           // ID único da etapa (ex: 'etapa1')
      name: string           // Nome legível (ex: 'Auditoria Fática')
      description: string    // Descrição completa
      totalSteps?: number    // Total de etapas (para progress bar)
      currentStep?: number   // Etapa atual (1-indexed)
    }
  | {
      type: 'step_log'
      step: string
      message: string        // Log técnico (colapsável no frontend)
      level: 'info' | 'warn' | 'debug'
    }
  | {
      type: 'step_complete'
      step: string
      result: StepResult
      durationMs: number     // Tempo de execução
    }
  | {
      type: 'step_error'
      step: string
      error: string
      recoverable: boolean   // Se pode tentar continuar
    }

  // ═══════════════════════════════════════════════════════════
  // EVENTOS DE CONTEÚDO (Content Streaming)
  // ═══════════════════════════════════════════════════════════
  | {
      type: 'content_delta'
      step: string
      delta: string          // Chunk de texto sendo gerado
    }
  | {
      type: 'content_complete'
      step: string
      content: string        // Texto completo da etapa
    }

  // ═══════════════════════════════════════════════════════════
  // EVENTOS DE COMANDO (Command Lifecycle)
  // ═══════════════════════════════════════════════════════════
  | {
      type: 'command_start'
      command: string        // '/analise1'
      totalSteps: number
    }
  | {
      type: 'command_complete'
      result: CommandResult
      totalDurationMs: number
    }
  | {
      type: 'command_error'
      error: string
      failedAtStep?: string
    }
  | {
      type: 'command_cancelled'
      cancelledAtStep: string
      partialResult?: Partial<CommandResult>
    }
```

**Exemplo de fluxo de eventos do `/analise1`:**

```
command_start        → { command: '/analise1', totalSteps: 6 }
step_start           → { step: 'etapa1', name: 'Auditoria Fática', currentStep: 1 }
content_delta        → { step: 'etapa1', delta: 'Analisando os fatos...' }
content_delta        → { step: 'etapa1', delta: ' Encontrei divergência...' }
content_complete     → { step: 'etapa1', content: '...' }
step_complete        → { step: 'etapa1', result: {...}, durationMs: 4500 }
step_start           → { step: 'etapa2', name: 'Saneamento', currentStep: 2 }
...
command_complete     → { result: {...}, totalDurationMs: 28000 }
```

### 9.2 Gerenciamento de Context Window

Comandos orquestrados fazem múltiplas chamadas ao LLM. Sem cuidado, o contexto acumula e estoura o limite de tokens.

#### O Problema

```
Etapa 1: PDF (50k tokens) + Prompt (2k) = 52k tokens
Etapa 2: PDF (50k) + Output Etapa 1 (5k) + Prompt (2k) = 57k tokens
Etapa 3: PDF (50k) + Output 1+2 (10k) + Prompt (2k) = 62k tokens
...
Etapa 6: ESTOURO! 💥
```

#### A Solução: Compressão Inteligente

```typescript
// server/commands/steps/context-manager.ts

interface ContextBudget {
  maxTokens: number           // Limite do modelo (ex: 128k)
  reservedForResponse: number // Reservar para resposta (ex: 8k)
  reservedForPrompt: number   // Reservar para prompt da etapa (ex: 4k)
  available: number           // Disponível para contexto
}

interface CompressedContext {
  processContext: string      // Documentos do processo (comprimido se necessário)
  previousSteps: string       // Resumo das etapas anteriores
  tokenCount: number
}

export class ContextManager {
  private budget: ContextBudget

  constructor(modelMaxTokens: number = 128000) {
    this.budget = {
      maxTokens: modelMaxTokens,
      reservedForResponse: 8000,
      reservedForPrompt: 4000,
      available: modelMaxTokens - 8000 - 4000  // ~116k
    }
  }

  /**
   * Prepara contexto para uma etapa, garantindo que cabe no budget.
   */
  async prepareContext(params: {
    processId: string
    previousSteps: StepResult[]
    currentStepNeeds: 'full_process' | 'summary_only' | 'facts_only'
  }): Promise<CompressedContext> {
    const { processId, previousSteps, currentStepNeeds } = params

    // 1. Carrega e comprime contexto do processo conforme necessidade
    let processContext: string

    switch (currentStepNeeds) {
      case 'full_process':
        // Etapa 1 precisa do PDF completo
        processContext = await this.loadFullProcess(processId)
        break
      case 'facts_only':
        // Etapas 2-5 só precisam dos fatos já extraídos
        processContext = this.extractFacts(previousSteps[0])
        break
      case 'summary_only':
        // Etapa final só precisa de resumo
        processContext = ''
        break
    }

    // 2. Comprime etapas anteriores em resumo executivo
    const previousStepsSummary = this.summarizeSteps(previousSteps)

    // 3. Verifica se cabe no budget
    const totalTokens = this.countTokens(processContext + previousStepsSummary)

    if (totalTokens > this.budget.available) {
      // Comprime mais agressivamente
      processContext = await this.aggressiveCompress(processContext)
    }

    return {
      processContext,
      previousSteps: previousStepsSummary,
      tokenCount: this.countTokens(processContext + previousStepsSummary)
    }
  }

  /**
   * Gera resumo executivo das etapas anteriores.
   * Evita acumular texto completo.
   */
  private summarizeSteps(steps: StepResult[]): string {
    if (steps.length === 0) return ''

    return steps.map(step => {
      // Extrai apenas conclusões, não texto completo
      const conclusion = step.analysis?.conclusion ||
        this.extractConclusion(step.output)

      return `### ${step.stepName}\n${conclusion}`
    }).join('\n\n')
  }

  /**
   * Extrai apenas os fatos da Etapa 1 (Auditoria).
   * Usado nas etapas seguintes que não precisam do PDF raw.
   */
  private extractFacts(auditoriaStep: StepResult): string {
    // O output da Etapa 1 já é estruturado
    // Extraímos apenas a seção de fatos
    return auditoriaStep.analysis?.facts as string || auditoriaStep.output
  }
}
```

#### Estratégia por Etapa

| Etapa | Precisa do PDF? | Contexto das Anteriores |
|-------|-----------------|-------------------------|
| 1 - Auditoria | ✅ Completo | Nenhum |
| 2 - Saneamento | ❌ Só fatos extraídos | Resumo Etapa 1 |
| 3 - Admissibilidade | ❌ Só fatos | Resumo Etapas 1-2 |
| 4 - Confronto | ❌ Só fatos | Resumo Etapas 1-3 |
| 5 - Tutela | ❌ Só fatos | Resumo Etapas 1-4 |
| 6 - Veredito | ❌ Nada | Resumo Executivo de Todas |

### 9.3 Cancelamento (AbortController)

Comandos longos precisam suportar cancelamento gracioso.

#### Interface do Handler com AbortSignal

```typescript
// server/commands/types.ts (refinamento)

export interface CommandContext {
  userId: string
  conversationId: string
  processId?: string
  moduleSlug: ModuleSlug
  argument?: string
  history: Message[]

  // 🆕 Suporte a cancelamento
  signal: AbortSignal
}

export type CommandHandler = (
  ctx: CommandContext
) => AsyncGenerator<CommandEvent, void, unknown>
```

#### Implementação no Handler

```typescript
// server/commands/handlers/analise1.handler.ts

export const analise1Handler: CommandHandler = async function* (ctx) {
  const { signal } = ctx

  // Verifica cancelamento antes de cada etapa
  function checkCancellation() {
    if (signal.aborted) {
      throw new CommandCancelledError('Comando cancelado pelo usuário')
    }
  }

  try {
    // ETAPA 1
    checkCancellation()
    yield { type: 'step_start', step: 'etapa1', ... }

    const etapa1 = await executeStep({
      ...params,
      signal,  // Passa o signal para a chamada LLM
    })

    yield { type: 'step_complete', step: 'etapa1', result: etapa1 }

    // ETAPA 2
    checkCancellation()  // Verifica antes de começar
    yield { type: 'step_start', step: 'etapa2', ... }

    // ... continua

  } catch (error) {
    if (error instanceof CommandCancelledError) {
      yield {
        type: 'command_cancelled',
        cancelledAtStep: currentStep,
        partialResult: {
          steps: completedSteps,
          // Permite ao usuário ver o que já foi feito
        }
      }
      return
    }
    throw error
  }
}
```

#### Integração com LLM Service

```typescript
// server/commands/steps/executor.ts

export async function executeStep(params: ExecuteStepParams): Promise<StepResult> {
  const { signal, ...rest } = params

  // Passa o signal para o cliente LLM
  const response = await llmService.invoke({
    ...rest,
    abortSignal: signal,  // OpenAI/Anthropic SDKs suportam isso
  })

  return {
    ...response,
    // ...
  }
}
```

#### Frontend: Botão de Cancelar

```typescript
// client/src/components/chat/CommandProgress.tsx

export function CommandProgress({ events, onCancel }: CommandProgressProps) {
  const isRunning = events.some(e => e.type === 'command_start') &&
    !events.some(e => e.type === 'command_complete' || e.type === 'command_cancelled')

  return (
    <div className="space-y-3">
      {/* Progress UI */}

      {isRunning && (
        <button
          onClick={onCancel}
          className="text-sm text-red-500 hover:text-red-700"
        >
          ⏹️ Cancelar análise
        </button>
      )}
    </div>
  )
}
```

#### No Router

```typescript
// server/davidRouter.ts

sendMessageStream: publicProcedure
  .input(/* ... */)
  .subscription(async function* ({ input, ctx, signal }) {  // tRPC passa o signal

    const commandCtx: CommandContext = {
      ...otherCtx,
      signal,  // Propaga para o handler
    }

    for await (const event of commandDef.handler(commandCtx)) {
      yield event
    }
  })
```

### 9.4 Estado do Frontend (useReducer)

> ⚠️ **Aviso do Gerente:** Não tentem gerenciar o stream com múltiplos `useState` soltos. Vai criar race conditions e inconsistências visuais.

#### O Problema

```typescript
// ❌ ERRADO - Race conditions, estado inconsistente
const [isLoading, setIsLoading] = useState(false)
const [currentStep, setCurrentStep] = useState('')
const [steps, setSteps] = useState([])
const [output, setOutput] = useState('')
const [error, setError] = useState(null)

// Múltiplos useEffect tentando sincronizar = espaguete
```

#### A Solução: useReducer + Máquina de Estados

```typescript
// client/src/hooks/useCommandExecution.ts

// ═══════════════════════════════════════════════════════════
// TIPOS DE ESTADO
// ═══════════════════════════════════════════════════════════

type CommandStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'error'

type StepState = {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  output?: string
  durationMs?: number
}

interface CommandState {
  status: CommandStatus
  command: string | null
  steps: StepState[]
  currentStepIndex: number
  partialOutput: string      // Texto sendo gerado (streaming)
  finalOutput: string        // Texto completo ao finalizar
  error: string | null
  totalDurationMs: number
}

const initialState: CommandState = {
  status: 'idle',
  command: null,
  steps: [],
  currentStepIndex: -1,
  partialOutput: '',
  finalOutput: '',
  error: null,
  totalDurationMs: 0,
}

// ═══════════════════════════════════════════════════════════
// REDUCER - Processa eventos do servidor
// ═══════════════════════════════════════════════════════════

function commandReducer(state: CommandState, event: CommandEvent): CommandState {
  switch (event.type) {
    // ─────────────────────────────────────────────────────────
    // LIFECYCLE DO COMANDO
    // ─────────────────────────────────────────────────────────
    case 'command_start':
      return {
        ...initialState,
        status: 'running',
        command: event.command,
        steps: Array(event.totalSteps).fill(null).map((_, i) => ({
          id: `step_${i}`,
          name: '',
          description: '',
          status: 'pending',
        })),
      }

    case 'command_complete':
      return {
        ...state,
        status: 'completed',
        finalOutput: state.partialOutput,
        partialOutput: '',
        totalDurationMs: event.totalDurationMs,
      }

    case 'command_error':
      return {
        ...state,
        status: 'error',
        error: event.error,
      }

    case 'command_cancelled':
      return {
        ...state,
        status: 'cancelled',
        finalOutput: state.partialOutput,  // Preserva o que já foi gerado
      }

    // ─────────────────────────────────────────────────────────
    // LIFECYCLE DA ETAPA
    // ─────────────────────────────────────────────────────────
    case 'step_start': {
      const stepIndex = event.currentStep ? event.currentStep - 1 : state.currentStepIndex + 1
      const newSteps = [...state.steps]
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        id: event.step,
        name: event.name,
        description: event.description,
        status: 'running',
      }
      return {
        ...state,
        steps: newSteps,
        currentStepIndex: stepIndex,
        partialOutput: '',  // Limpa para nova etapa
      }
    }

    case 'step_complete': {
      const newSteps = [...state.steps]
      const stepIndex = newSteps.findIndex(s => s.id === event.step)
      if (stepIndex !== -1) {
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          status: 'completed',
          output: event.result.output,
          durationMs: event.durationMs,
        }
      }
      return {
        ...state,
        steps: newSteps,
      }
    }

    case 'step_error': {
      const newSteps = [...state.steps]
      const stepIndex = newSteps.findIndex(s => s.id === event.step)
      if (stepIndex !== -1) {
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          status: 'error',
        }
      }
      return {
        ...state,
        steps: newSteps,
        error: event.error,
        // Se não é recuperável, marca comando como erro também
        status: event.recoverable ? state.status : 'error',
      }
    }

    // ─────────────────────────────────────────────────────────
    // STREAMING DE CONTEÚDO
    // ─────────────────────────────────────────────────────────
    case 'content_delta':
      return {
        ...state,
        partialOutput: state.partialOutput + event.delta,
      }

    case 'content_complete':
      return {
        ...state,
        partialOutput: event.content,
      }

    // ─────────────────────────────────────────────────────────
    // LOGS (opcional, para debug)
    // ─────────────────────────────────────────────────────────
    case 'step_log':
      // Pode armazenar logs se quiser mostrar em modo debug
      return state

    default:
      return state
  }
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useCommandExecution() {
  const [state, dispatch] = useReducer(commandReducer, initialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const executeCommand = useCallback(async (command: string, conversationId: string) => {
    // Cria novo AbortController para este comando
    abortControllerRef.current = new AbortController()

    try {
      // Subscreve ao stream do tRPC
      const subscription = trpc.david.sendMessageStream.subscribe(
        { message: command, conversationId },
        {
          signal: abortControllerRef.current.signal,
          onData: (event: CommandEvent) => {
            dispatch(event)  // Cada evento atualiza o estado atomicamente
          },
          onError: (error) => {
            dispatch({ type: 'command_error', error: error.message })
          },
        }
      )

      return subscription
    } catch (error) {
      dispatch({ type: 'command_error', error: String(error) })
    }
  }, [])

  const cancelCommand = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'command_complete', result: {} as any, totalDurationMs: 0 })
  }, [])

  return {
    state,
    executeCommand,
    cancelCommand,
    reset,
    // Helpers derivados
    isRunning: state.status === 'running',
    isCompleted: state.status === 'completed',
    hasError: state.status === 'error',
    currentStep: state.steps[state.currentStepIndex],
    completedSteps: state.steps.filter(s => s.status === 'completed'),
  }
}
```

#### Uso no Componente

```typescript
// client/src/components/chat/CommandExecution.tsx

export function CommandExecution({ command, conversationId }: Props) {
  const {
    state,
    executeCommand,
    cancelCommand,
    isRunning,
    currentStep,
    completedSteps,
  } = useCommandExecution()

  useEffect(() => {
    executeCommand(command, conversationId)
  }, [command, conversationId])

  return (
    <div className="space-y-4">
      {/* Progress Steps */}
      <div className="space-y-2">
        {state.steps.map((step, i) => (
          <StepIndicator
            key={step.id}
            name={step.name}
            status={step.status}
            isActive={i === state.currentStepIndex}
          />
        ))}
      </div>

      {/* Output sendo gerado */}
      {state.partialOutput && (
        <div className="prose">
          <Markdown>{state.partialOutput}</Markdown>
        </div>
      )}

      {/* Botão de cancelar */}
      {isRunning && (
        <button onClick={cancelCommand} className="text-red-500">
          Cancelar
        </button>
      )}

      {/* Erro */}
      {state.error && (
        <Alert variant="error">{state.error}</Alert>
      )}
    </div>
  )
}
```

#### Por que isso funciona

1. **Estado atômico:** Cada `dispatch(event)` atualiza tudo de uma vez
2. **Transições válidas:** O reducer garante que não existe estado impossível
3. **Testável:** `commandReducer` é função pura, fácil de testar com eventos mock
4. **Sem race conditions:** React garante que dispatches são processados em ordem
5. **Fácil de debuggar:** Pode logar cada evento/estado no reducer

### 9.5 Resiliência e Observabilidade

> ⚠️ **Seção adicionada após revisão da equipe de desenvolvimento**

#### 9.5.1 Ordem de Precedência na Interceptação (CommandResolver)

Quando uma mensagem começa com `/`, precisamos definir quem processa primeiro.

> 💡 **Design Decision:** Usamos uma **interface abstrata** para facilitar testes unitários.

```typescript
// server/commands/types.ts

/**
 * Interface para resolver qual handler processa a mensagem.
 * Permite injeção de mocks em testes.
 */
export interface ICommandResolver {
  resolve(input: string, ctx: MessageContext): Promise<ExecutionPlan>
}

export type ExecutionPlan =
  | { type: 'system_command'; handler: CommandHandler; argument?: string }
  | { type: 'saved_prompt'; prompt: SavedPrompt }
  | { type: 'chat' }
```

```typescript
// server/commands/CommandResolver.ts

import { ICommandResolver, ExecutionPlan } from './types'
import { SYSTEM_COMMANDS } from './index'
import { findSavedPromptBySlug } from '@/services/prompts'

export class CommandResolver implements ICommandResolver {
  async resolve(input: string, ctx: MessageContext): Promise<ExecutionPlan> {
    // 1️⃣ PRIMEIRO: Comandos do Sistema (hardcoded)
    if (input.startsWith('/')) {
      const commandMatch = input.match(/^\/(\w+)(?:\s+(.*))?$/)
      if (commandMatch) {
        const [, slug, argument] = commandMatch
        const systemCommand = SYSTEM_COMMANDS[`/${slug}`]

        if (systemCommand) {
          // Valida se comando é permitido no módulo atual
          if (!systemCommand.modules.includes('*') && 
              !systemCommand.modules.includes(ctx.moduleSlug)) {
            throw new Error(`Comando /${slug} não disponível no módulo ${ctx.moduleSlug}`)
          }

          return {
            type: 'system_command',
            handler: systemCommand.handler,
            argument,
          }
        }
      }
    }

    // 2️⃣ SEGUNDO: Prompts Salvos do Usuário
    if (input.startsWith('/')) {
      const savedPrompt = await findSavedPromptBySlug(ctx.userId, input)
      if (savedPrompt) {
        return {
          type: 'saved_prompt',
          prompt: savedPrompt,
        }
      }
    }

    // 3️⃣ TERCEIRO: Fluxo normal de chat
    return { type: 'chat' }
  }
}

// Singleton para uso em produção
export const commandResolver = new CommandResolver()
```

```typescript
// server/commands/__tests__/CommandResolver.test.ts

// Mock para testes unitários
class MockCommandResolver implements ICommandResolver {
  private mockPlan: ExecutionPlan = { type: 'chat' }

  setMockPlan(plan: ExecutionPlan) {
    this.mockPlan = plan
  }

  async resolve(): Promise<ExecutionPlan> {
    return this.mockPlan
  }
}

// Uso em testes do davidRouter
const mockResolver = new MockCommandResolver()
mockResolver.setMockPlan({ type: 'system_command', handler: mockHandler })
```

**Regra de Precedência:** Sistema > Usuário > Chat

#### 9.5.2 Retry Policy por Etapa

```typescript
// server/commands/steps/retry.ts

interface RetryPolicy {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  retryableErrors: Set<string>
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: new Set([
    'rate_limit_exceeded',
    'timeout',
    'service_unavailable',
    'internal_error',
  ]),
}

export async function executeStepWithRetry(
  params: ExecuteStepParams,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Promise<StepResult> {
  let lastError: Error | null = null
  let attempt = 0

  while (attempt < policy.maxAttempts) {
    try {
      return await executeStep(params)
    } catch (error) {
      lastError = error as Error
      const errorCode = extractErrorCode(error)

      // Não faz retry se erro não é retryable
      if (!policy.retryableErrors.has(errorCode)) {
        throw error
      }

      attempt++

      // Exponential backoff com jitter
      const delay = Math.min(
        policy.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        policy.maxDelayMs
      )

      // Emite evento de retry para o frontend saber
      params.onRetry?.({
        attempt,
        maxAttempts: policy.maxAttempts,
        delayMs: delay,
        error: errorCode,
      })

      await sleep(delay)
    }
  }

  throw new MaxRetriesExceededError(
    `Step failed after ${policy.maxAttempts} attempts`,
    lastError
  )
}
```

#### 9.5.3 Rate Limiting por Usuário

```typescript
// server/commands/rate-limiter.ts

interface UserCommandLock {
  userId: string
  commandSlug: string
  startedAt: Date
  expiresAt: Date
}

class CommandRateLimiter {
  private locks: Map<string, UserCommandLock> = new Map()

  /**
   * Tenta adquirir lock para comando orquestrado.
   * Apenas 1 comando orquestrado por usuário por vez.
   */
  async acquireLock(userId: string, commandSlug: string): Promise<boolean> {
    const lockKey = `${userId}:orchestrated`

    // Limpa locks expirados
    this.cleanExpiredLocks()

    // Verifica se já tem um comando orquestrado rodando
    const existingLock = this.locks.get(lockKey)
    if (existingLock) {
      return false  // Usuário já tem comando em execução
    }

    // Cria novo lock (expira em 5 minutos como safety)
    this.locks.set(lockKey, {
      userId,
      commandSlug,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })

    return true
  }

  releaseLock(userId: string): void {
    this.locks.delete(`${userId}:orchestrated`)
  }

  private cleanExpiredLocks(): void {
    const now = new Date()
    for (const [key, lock] of this.locks) {
      if (lock.expiresAt < now) {
        this.locks.delete(key)
      }
    }
  }
}

export const rateLimiter = new CommandRateLimiter()
```

> ⚠️ **Limitação:** Este lock em memória funciona apenas para **single-instance**. Em ambiente com múltiplas instâncias (Kubernetes, PM2 cluster), o lock não é compartilhado entre workers.
>
> **Solução para escala horizontal (Fase 2):**
> ```typescript
> // Migrar para Redis
> import Redis from 'ioredis'
> const redis = new Redis(process.env.REDIS_URL)
> 
> async acquireLock(userId: string): Promise<boolean> {
>   const key = `cmd:lock:${userId}`
>   const result = await redis.set(key, '1', 'EX', 300, 'NX')
>   return result === 'OK'
> }
> ```
>
> Para o MVP single-instance, a implementação em memória é suficiente.

**Uso no Handler:**

```typescript
export const analise1Handler: CommandHandler = async function* (ctx) {
  // Tenta adquirir lock
  const acquired = await rateLimiter.acquireLock(ctx.userId, 'analise1')

  if (!acquired) {
    yield {
      type: 'command_error',
      error: 'Você já tem uma análise em andamento. Aguarde a conclusão.',
    }
    return
  }

  try {
    // ... executa etapas
  } finally {
    rateLimiter.releaseLock(ctx.userId)
  }
}
```

#### 9.5.4 Observabilidade (Logging e Métricas)

```typescript
// server/commands/observability.ts

interface CommandTrace {
  traceId: string
  userId: string
  command: string
  startedAt: Date
  steps: StepTrace[]
  totalTokensUsed: number
  status: 'running' | 'completed' | 'failed' | 'cancelled'
}

interface StepTrace {
  stepId: string
  name: string
  startedAt: Date
  completedAt?: Date
  durationMs?: number
  tokensUsed: number
  retryCount: number
  error?: string
}

class CommandTracer {
  private traces: Map<string, CommandTrace> = new Map()

  startTrace(userId: string, command: string): string {
    const traceId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const trace: CommandTrace = {
      traceId,
      userId,
      command,
      startedAt: new Date(),
      steps: [],
      totalTokensUsed: 0,
      status: 'running',
    }

    this.traces.set(traceId, trace)

    // Log estruturado
    logger.info('command.started', {
      traceId,
      userId,
      command,
    })

    return traceId
  }

  startStep(traceId: string, stepId: string, name: string): void {
    const trace = this.traces.get(traceId)
    if (!trace) return

    trace.steps.push({
      stepId,
      name,
      startedAt: new Date(),
      tokensUsed: 0,
      retryCount: 0,
    })

    logger.info('command.step.started', {
      traceId,
      stepId,
      name,
    })
  }

  completeStep(
    traceId: string,
    stepId: string,
    tokensUsed: number,
    retryCount: number = 0
  ): void {
    const trace = this.traces.get(traceId)
    if (!trace) return

    const step = trace.steps.find(s => s.stepId === stepId)
    if (!step) return

    step.completedAt = new Date()
    step.durationMs = step.completedAt.getTime() - step.startedAt.getTime()
    step.tokensUsed = tokensUsed
    step.retryCount = retryCount
    trace.totalTokensUsed += tokensUsed

    logger.info('command.step.completed', {
      traceId,
      stepId,
      durationMs: step.durationMs,
      tokensUsed,
      retryCount,
    })

    // Alerta se etapa demorou mais de 30s
    if (step.durationMs > 30000) {
      logger.warn('command.step.slow', {
        traceId,
        stepId,
        durationMs: step.durationMs,
      })
    }
  }

  completeTrace(traceId: string, status: 'completed' | 'failed' | 'cancelled'): void {
    const trace = this.traces.get(traceId)
    if (!trace) return

    trace.status = status
    const totalDurationMs = Date.now() - trace.startedAt.getTime()

    logger.info('command.completed', {
      traceId,
      status,
      totalDurationMs,
      totalTokensUsed: trace.totalTokensUsed,
      stepsCompleted: trace.steps.filter(s => s.completedAt).length,
      totalSteps: trace.steps.length,
    })

    // Persiste trace para análise posterior (opcional)
    this.persistTrace(trace)
  }

  private async persistTrace(trace: CommandTrace): Promise<void> {
    // Salvar no banco para dashboards de uso
    // await db.insert(commandTraces).values(trace)
  }
}

export const tracer = new CommandTracer()
```

**Integração no Handler:**

```typescript
export const analise1Handler: CommandHandler = async function* (ctx) {
  const traceId = tracer.startTrace(ctx.userId, '/analise1')

  try {
    // ETAPA 1
    tracer.startStep(traceId, 'etapa1', 'Auditoria Fática')
    const etapa1 = await executeStepWithRetry({ ... })
    tracer.completeStep(traceId, 'etapa1', etapa1.tokensUsed)

    // ... outras etapas

    tracer.completeTrace(traceId, 'completed')
  } catch (error) {
    tracer.completeTrace(traceId, 'failed')
    throw error
  }
}
```

#### 9.5.5 Persistência de Progresso (Roadmap)

> 📋 **Nota:** Não é necessário para o MVP, mas está no roadmap para v2.

```typescript
// Estrutura futura para retomada de comandos

interface CommandExecution {
  id: string
  userId: string
  conversationId: string
  command: string
  status: 'running' | 'paused' | 'completed' | 'failed'
  currentStep: number
  stepResults: StepResult[]  // Resultados já computados
  createdAt: Date
  updatedAt: Date
}

// Permite retomar comando interrompido
// /analise1 --resume <execution_id>
```

---

## 10. Estratégia de Testes

> ⚠️ **Seção adicionada após revisão da equipe de desenvolvimento**

### 10.1 Testes Unitários

#### Reducer de Eventos (Frontend)

```typescript
// client/src/hooks/__tests__/commandReducer.test.ts

describe('commandReducer', () => {
  it('should initialize state on command_start', () => {
    const state = commandReducer(initialState, {
      type: 'command_start',
      command: '/analise1',
      totalSteps: 6,
    })

    expect(state.status).toBe('running')
    expect(state.steps).toHaveLength(6)
    expect(state.steps.every(s => s.status === 'pending')).toBe(true)
  })

  it('should update step status on step_start', () => {
    const runningState = { ...initialState, status: 'running', steps: [...] }
    const state = commandReducer(runningState, {
      type: 'step_start',
      step: 'etapa1',
      name: 'Auditoria',
      description: '...',
      currentStep: 1,
    })

    expect(state.steps[0].status).toBe('running')
    expect(state.currentStepIndex).toBe(0)
  })

  it('should accumulate content on content_delta', () => {
    const state1 = commandReducer(runningState, {
      type: 'content_delta',
      step: 'etapa1',
      delta: 'Hello ',
    })
    const state2 = commandReducer(state1, {
      type: 'content_delta',
      step: 'etapa1',
      delta: 'World',
    })

    expect(state2.partialOutput).toBe('Hello World')
  })

  it('should handle cancellation gracefully', () => {
    const state = commandReducer(runningState, {
      type: 'command_cancelled',
      cancelledAtStep: 'etapa3',
    })

    expect(state.status).toBe('cancelled')
    expect(state.finalOutput).toBe(runningState.partialOutput)
  })
})
```

#### Handler de Comando (Backend)

```typescript
// server/commands/handlers/__tests__/analise1.test.ts

describe('analise1Handler', () => {
  const mockLLM = createMockLLM()
  const mockContext = createMockContext({ moduleSlug: 'jec', processId: '123' })

  beforeEach(() => {
    mockLLM.reset()
  })

  it('should reject if module is not JEC', async () => {
    const ctx = { ...mockContext, moduleSlug: 'familia' }
    const events = await collectEvents(analise1Handler(ctx))

    expect(events).toContainEqual({
      type: 'command_error',
      error: expect.stringContaining('JEC'),
    })
  })

  it('should stop at etapa2 if vício is detected', async () => {
    mockLLM.mockResponseForStep('etapa2', {
      output: 'Vício detectado',
      analysis: { hasVicio: true, suggestion: 'Emenda' },
    })

    const events = await collectEvents(analise1Handler(mockContext))

    expect(events.filter(e => e.type === 'step_complete')).toHaveLength(2)
    expect(events).toContainEqual({
      type: 'command_complete',
      result: expect.objectContaining({ veredito: 'EXTINÇÃO_OU_EMENDA' }),
    })
  })

  it('should complete all 6 steps when no blocking issues', async () => {
    mockLLM.mockAllStepsSuccess()

    const events = await collectEvents(analise1Handler(mockContext))

    expect(events.filter(e => e.type === 'step_complete')).toHaveLength(6)
    expect(events).toContainEqual({
      type: 'command_complete',
      result: expect.objectContaining({ success: true }),
    })
  })
})
```

### 10.2 Testes de Integração

```typescript
// server/commands/__tests__/integration/command-flow.test.ts

describe('Command Flow Integration', () => {
  it('should intercept system commands before saved prompts', async () => {
    // Setup: usuário tem prompt salvo chamado "/analise1"
    await createSavedPrompt(userId, { title: 'analise1', content: '...' })

    // Act: envia mensagem "/analise1"
    const result = await dispatchMessage('/analise1', context)

    // Assert: sistema intercepta, não o prompt salvo
    expect(result.type).toBe('system_command')
  })

  it('should respect rate limiting for orchestrated commands', async () => {
    // Primeira execução: sucesso
    const result1 = await rateLimiter.acquireLock(userId, 'analise1')
    expect(result1).toBe(true)

    // Segunda execução simultânea: bloqueado
    const result2 = await rateLimiter.acquireLock(userId, 'analise2')
    expect(result2).toBe(false)

    // Após liberar: sucesso
    rateLimiter.releaseLock(userId)
    const result3 = await rateLimiter.acquireLock(userId, 'analise2')
    expect(result3).toBe(true)
  })

  it('should retry on transient errors', async () => {
    let attempts = 0
    mockLLM.mockImplementation(() => {
      attempts++
      if (attempts < 3) throw new RateLimitError()
      return { output: 'Success' }
    })

    const result = await executeStepWithRetry(params)

    expect(attempts).toBe(3)
    expect(result.output).toBe('Success')
  })
})
```

### 10.3 Testes E2E

```typescript
// e2e/commands/analise1.spec.ts

describe('/analise1 E2E', () => {
  it('should show progress UI and final result', async () => {
    // Setup
    await loginAs(testUser)
    await uploadProcess(testPDF)
    await selectModule('jec')

    // Act
    await page.type('[data-testid="chat-input"]', '/analise1')
    await page.click('[data-testid="send-button"]')

    // Assert: Progress UI aparece
    await expect(page.locator('[data-testid="command-progress"]')).toBeVisible()

    // Assert: Etapas vão completando
    await expect(page.locator('[data-testid="step-etapa1"]')).toHaveAttribute(
      'data-status',
      'completed',
      { timeout: 30000 }
    )

    // Assert: Resultado final aparece
    await expect(page.locator('[data-testid="command-result"]')).toBeVisible({
      timeout: 120000,
    })
  })

  it('should handle cancellation', async () => {
    await page.type('[data-testid="chat-input"]', '/analise1')
    await page.click('[data-testid="send-button"]')

    // Espera começar
    await expect(page.locator('[data-testid="step-etapa1"]')).toHaveAttribute(
      'data-status',
      'running'
    )

    // Cancela
    await page.click('[data-testid="cancel-button"]')

    // Assert: Status cancelado
    await expect(page.locator('[data-testid="command-status"]')).toHaveText(
      'Análise cancelada'
    )
  })
})
```

---

## 11. Decisões de Scope (MVP vs. Fase 2)

> ⚠️ **Seção adicionada após revisão final do Gerente de Desenvolvimento**

### 11.1 Resumo das Decisões

| Funcionalidade | MVP? | Justificativa |
|----------------|------|---------------|
| Persistência de Progresso | 🛑 NÃO | Complexidade alta, bugs de sincronização. Se fechar aba, perde comando. |
| Tratamento de Erro e Retries | ✅ SIM | Wrapper simples `withRetry`. Crítico para estabilidade. |
| Rate Limiting (Mutex) | ✅ SIM | Lock em memória por userId. Evita spam de comandos caros. |
| Observabilidade | ⚠️ PARCIAL | Console.log estruturado. Sem Grafana/Datadog. |
| Testes | ✅ SIM | Unitários com mocks. Um teste E2E "Happy Path". |

### 11.2 CommandResolver (Versão MVP)

> 📋 **Nota:** A Seção 9.5.1 define o **padrão arquitetural** com a interface `ICommandResolver` para testabilidade. Esta seção mostra a **implementação simplificada para o MVP** que será codificada primeiro.
>
> A interface abstrata (`ICommandResolver`) pode ser adicionada posteriormente se necessário para testes mais sofisticados.

O `CommandResolver` centraliza a lógica de precedência de rotas, removendo `if/else` espalhados.

```typescript
// server/commands/resolver.ts

import type { CommandDefinition, ModuleSlug } from './types'
import { SYSTEM_COMMANDS } from './index'
import { findSavedPromptBySlug } from '../services/savedPrompts'

export type ExecutionPlan =
  | { type: 'SYSTEM_COMMAND'; definition: CommandDefinition; argument?: string }
  | { type: 'SAVED_PROMPT'; content: string }
  | { type: 'CHAT' }

interface ResolveContext {
  userId: string
  activeModule: ModuleSlug
}

export class CommandResolver {
  /**
   * Resolve o input do usuário para um plano de execução.
   * Ordem de precedência: Sistema > Prompts Salvos > Chat
   */
  async resolve(input: string, ctx: ResolveContext): Promise<ExecutionPlan> {
    // 1️⃣ PRIORIDADE MÁXIMA: Comandos de Sistema
    if (input.startsWith('/')) {
      const match = input.match(/^\/(\w+)(?:\s+(.*))?$/)
      if (match) {
        const [, slug, argument] = match
        const systemCmd = SYSTEM_COMMANDS[`/${slug}`]

        if (systemCmd) {
          // Valida se módulo é suportado
          if (!systemCmd.modules.includes(ctx.activeModule)) {
            throw new CommandModuleError(
              `Comando /${slug} não disponível no módulo ${ctx.activeModule}`
            )
          }
          return { type: 'SYSTEM_COMMAND', definition: systemCmd, argument }
        }
      }
    }

    // 2️⃣ PRIORIDADE MÉDIA: Prompts Salvos do Usuário
    if (input.startsWith('/')) {
      const savedPrompt = await findSavedPromptBySlug(ctx.userId, input.slice(1))
      if (savedPrompt) {
        return { type: 'SAVED_PROMPT', content: savedPrompt.content }
      }
    }

    // 3️⃣ FALLBACK: Chat Normal
    return { type: 'CHAT' }
  }
}

export const commandResolver = new CommandResolver()
```

### 11.3 InMemoryLock Simplificado

```typescript
// server/commands/lock.ts

/**
 * Lock simples em memória para comandos orquestrados.
 * Impede múltiplos comandos caros simultâneos por usuário.
 */
class CommandLock {
  private locks = new Map<string, { command: string; startedAt: Date }>()

  acquire(userId: string, command: string): boolean {
    const existing = this.locks.get(userId)

    // Se existe lock e não expirou (5 min safety), rejeita
    if (existing) {
      const elapsed = Date.now() - existing.startedAt.getTime()
      if (elapsed < 5 * 60 * 1000) {
        return false
      }
      // Lock expirado, limpa
      this.locks.delete(userId)
    }

    this.locks.set(userId, { command, startedAt: new Date() })
    return true
  }

  release(userId: string): void {
    this.locks.delete(userId)
  }

  getActive(userId: string): string | null {
    return this.locks.get(userId)?.command ?? null
  }
}

export const commandLock = new CommandLock()
```

**Uso no Handler:**

```typescript
export const analise1Handler: CommandHandler = async function* (ctx) {
  if (!commandLock.acquire(ctx.userId, '/analise1')) {
    yield {
      type: 'command_error',
      error: 'Você já tem uma análise em andamento. Aguarde a conclusão.',
    }
    return
  }

  try {
    // ... executa etapas
    yield { type: 'command_complete', ... }
  } finally {
    commandLock.release(ctx.userId)
  }
}
```

### 11.4 withRetry Simplificado

```typescript
// server/commands/utils/retry.ts

/**
 * Wrapper simples de retry com exponential backoff.
 * Cobre 90% dos casos de erro transiente.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; delayMs?: number } = {}
): Promise<T> {
  const { attempts = 3, delayMs = 1000 } = options
  let lastError: Error

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Não faz retry em erros não-transientes
      if (!isRetryable(error)) throw error

      // Espera antes do próximo attempt
      if (i < attempts - 1) {
        await sleep(delayMs * Math.pow(2, i))
      }
    }
  }

  throw lastError!
}

function isRetryable(error: unknown): boolean {
  const code = (error as any)?.code || (error as any)?.status
  return ['rate_limit', 'timeout', 'service_unavailable', '429', '503'].some(
    c => String(code).includes(c) || String(error).includes(c)
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

**Uso:**

```typescript
const result = await withRetry(
  () => llmService.invoke({ prompt, signal }),
  { attempts: 3, delayMs: 1000 }
)
```

### 11.5 Observabilidade Mínima

```typescript
// server/commands/utils/logger.ts

/**
 * Logger estruturado simples para comandos.
 * Sem dependências externas, apenas console.log.
 */
export function logCommand(event: string, data: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  console.log(JSON.stringify({ timestamp, event, ...data }))
}

// Uso
logCommand('command.started', { commandId, userId, command: '/analise1' })
logCommand('command.step.completed', { commandId, step: 'etapa1', durationMs: 4500 })
logCommand('command.completed', { commandId, totalDurationMs: 28000, success: true })
```

### 11.6 O Que NÃO Entra no MVP

Para evitar over-engineering, estas funcionalidades ficam para Fase 2:

1. **Persistência de progresso no banco** - Retomada de comandos interrompidos
2. **Grafana/Datadog** - Dashboards de métricas
3. **Redis para locks** - Só necessário se escalar horizontalmente
4. **Circuit breaker** - Proteção avançada contra falhas em cascata
5. **Modo offline** - Cache local de comandos em andamento

---

## 12. Referências

- [orchestration_architecture_v7.md](./orchestration_architecture_v7.md) - Arquitetura de orquestração atual
- [ESPECIALIZACOES_PLAN_V2.1_UPDATE.md](../modules/ESPECIALIZACOES_PLAN_V2.1_UPDATE.md) - Plano de módulos
- `server/prompts/engines.ts` - Definição dos Motores A/B/C/D
- `server/services/IntentService.ts` - Classificação de intenções atual

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | 2025-01-22 | Documento inicial |
| 1.1 | 2025-01-22 | Adicionada Seção 9 (Pontos Críticos): Event Schema, Context Window, AbortController |
| 1.2 | 2025-01-22 | Adicionada Seção 9.4: useReducer para estado do Frontend (sugestão do Gerente) |
| 1.3 | 2025-01-22 | Adicionada Seção 9.5 (Resiliência): Retry, Rate Limiting, Observabilidade. Adicionada Seção 10 (Testes) |
| 1.4 | 2025-01-22 | **Aprovado para Codificação.** Seção 11: Decisões de Scope MVP (CommandResolver, InMemoryLock, withRetry simplificado). Definido o que NÃO entra no MVP. |
| 1.5 | 2025-01-22 | Refatorada Seção 9.5.1: Introduzida interface `ICommandResolver` para testabilidade. Adicionada nota sobre limitação do In-Memory Lock em ambiente multi-instância (Seção 9.5.3). |
