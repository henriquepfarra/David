# Plano de Refatoração do Frontend: David.tsx (v4)

**Criado**: 17/01/2026
**Última atualização**: 13/02/2026
**Status**: Fases 0-3 concluídas. Redesign Settings concluído separadamente.
**Branch base**: `refactor/prompts-integration`

---

## Resumo Executivo

| Métrica | Inicial | Atual | Meta | Gap |
|---------|---------|-------|------|-----|
| **Linhas David.tsx** | 2924 | ~1820 | <500 | -1320 |
| **Linhas Configuracoes.tsx** | 901 | 79 | <100 | ✅ Concluído |
| **useState** | 46 | 29 | <10 | -19 |
| **useEffect** | 11 | 12 | <5 | -7 |

**Progresso atual**: 38% de redução em David.tsx (Fases 0-3). Configuracoes.tsx 91% de redução.

> **Nota (Fev/2026):** Configuracoes.tsx foi refatorado em 6 componentes Settings (sidebar, MinhaConta, Uso, Cobrança, Personalização, Avançado) + novos componentes: ProviderIcons, ChatInputArea com model selector. Estes não faziam parte do plano original mas contribuíram para a meta geral de redução.

---

## Fases Concluídas

| Fase | Descrição | Commit | Resultado |
|------|-----------|--------|-----------|
| 0 | Preparação (Playwright, auth) | `d367f7c` | Baseline criado |
| 0.5 | Consolidar estados upload | `f072064` | 3 → 1 fonte de verdade |
| 1 | Upload Module (usePdfUpload) | `720c678` | Hook extraído |
| 2 | Chat Input + Componentes | `c9a74ef` | ChatInput, AttachedFilesBadge, UploadProgress |
| 3.1 | usePrompts hook | `3f55b04` | Hook extraído (340 linhas) |
| 3.2 | Fix modal layout | `13457ef` | Modal funcionando |
| 3.3 | PromptsModal componente | `29ff49a` | Componente extraído (689 linhas) |

---

## Fases Pendentes

### Fase 4: Limpeza e Validação (Em andamento pela equipe)
- [ ] Remover imports não usados
- [ ] Remover código comentado/morto
- [ ] Rodar testes E2E
- [ ] Code review

---

## Fase 5: MessageList / ChatArea

**Objetivo**: Extrair renderização de mensagens do chat
**Impacto estimado**: -200 linhas
**Complexidade**: Média
**Risco**: Baixo

### 5.1 Criar componente MessageList (3h)

**Arquivo**: `client/src/components/chat/MessageList.tsx`

**Linhas a extrair**: 911-1061 do David.tsx

**Props necessárias**:
```typescript
interface MessageListProps {
  messages: Message[];
  pendingUserMessage: string | null;
  isStreaming: boolean;
  parsedStreaming: {
    thinking: string;
    content: string;
    inProgress: boolean;
  };
  statusMessage: string;
  onApproveDraft: (messageId: number, content: string, status: "approved" | "rejected") => void;
  onEditDraft: (messageId: number, content: string) => void;
}
```

**Subcomponentes incluídos**:
- `AssistantMessage` - Mensagem do David com thinking colapsável
- `UserMessage` - Mensagem do usuário (bubble style)
- `StreamingMessage` - Mensagem em progresso
- `ThinkingIndicator` - Indicador "pensando"

### 5.2 Criar componente ProcessBanner (1h)

**Arquivo**: `client/src/components/chat/ProcessBanner.tsx`

**Linhas a extrair**: 886-909

```typescript
interface ProcessBannerProps {
  processNumber: string;
}
```

### 5.3 Integração (1h)

Substituir no David.tsx por:
```tsx
<MessageList
  messages={conversationData?.messages || []}
  pendingUserMessage={pendingUserMessage}
  isStreaming={isStreaming}
  parsedStreaming={parsedStreaming}
  statusMessage={statusMessage}
  onApproveDraft={handleApproveDraft}
  onEditDraft={handleEditAndApprove}
/>
```

### Checklist Fase 5
- [ ] Criar MessageList.tsx
- [ ] Criar ProcessBanner.tsx
- [ ] Atualizar exports em `components/chat/index.ts`
- [ ] Integrar no David.tsx
- [ ] Testar scroll automático
- [ ] Testar streaming de mensagens
- [ ] Testar botões aprovar/editar minuta
- [ ] Commit: `refactor(fase5): extrair MessageList componente`

---

## Fase 6: HomeScreen

**Objetivo**: Extrair tela inicial (sem conversa selecionada)
**Impacto estimado**: -190 linhas
**Complexidade**: Baixa
**Risco**: Baixo

### 6.1 Criar componente HomeScreen (3h)

**Arquivo**: `client/src/components/HomeScreen.tsx`

**Linhas a extrair**: 1066-1255 do David.tsx

**Props necessárias**:
```typescript
interface HomeScreenProps {
  userName: string;
  messageInput: string;
  setMessageInput: (value: string) => void;
  onSendMessage: () => void;
  onOpenUpload: () => void;
  onOpenPrompts: () => void;
  onOpenFiles: () => void;
  onOpenSettings: () => void;
  // Upload state
  uploadState: UploadState;
  attachedFiles: AttachedFile[];
  onRemoveFile: (uri: string) => void;
  // Recording
  isRecording: boolean;
  onRecordClick: () => void;
  isTranscribing: boolean;
  // Mutations
  isCreatingConversation: boolean;
  isStreaming: boolean;
}
```

### 6.2 Integração (1h)

Substituir bloco HOME no David.tsx por:
```tsx
{!selectedConversationId && (
  <HomeScreen
    userName={user?.name?.split(' ')[0] || 'Usuário'}
    messageInput={messageInput}
    setMessageInput={setMessageInput}
    onSendMessage={handleSendMessage}
    onOpenUpload={open}
    onOpenPrompts={() => setIsPromptsModalOpen(true)}
    onOpenFiles={() => setIsFilesModalOpen(true)}
    onOpenSettings={() => setLocation("/settings")}
    uploadState={uploadState}
    attachedFiles={attachedFiles}
    onRemoveFile={(uri) => setAttachedFiles(prev => prev.filter(f => f.uri !== uri))}
    isRecording={isRecording}
    onRecordClick={handleRecordClick}
    isTranscribing={transcribeAudioMutation.isPending}
    isCreatingConversation={createConversationMutation.isPending}
    isStreaming={isStreaming}
  />
)}
```

### Checklist Fase 6
- [ ] Criar HomeScreen.tsx
- [ ] Mover refs necessárias (textareaRef)
- [ ] Integrar no David.tsx
- [ ] Testar input e envio de mensagem
- [ ] Testar upload de arquivo
- [ ] Testar botões de ação
- [ ] Testar gravação de áudio
- [ ] Commit: `refactor(fase6): extrair HomeScreen componente`

---

## Fase 7: ChatInputArea

**Objetivo**: Extrair área de input do chat (quando conversa selecionada)
**Impacto estimado**: -300 linhas
**Complexidade**: Alta
**Risco**: Médio (muitas interações)

### 7.1 Criar componente ChatInputArea (4h)

**Arquivo**: `client/src/components/chat/ChatInputArea.tsx`

**Linhas a extrair**: 1311-1630 do David.tsx

**Props necessárias**:
```typescript
interface ChatInputAreaProps {
  // Input
  messageInput: string;
  setMessageInput: (value: string) => void;
  onSendMessage: () => void;
  isProcessing: boolean;

  // Upload
  getRootProps: () => DropzoneRootProps;
  getInputProps: () => DropzoneInputProps;
  isDragActive: boolean;
  openUpload: () => void;
  uploadState: UploadState;

  // Files
  attachedFiles: AttachedFile[];
  onRemoveFile: (uri: string) => void;
  selectedProcessId?: number;
  processNumber?: string;
  onRemoveProcess: () => void;

  // Prompts Modal
  isPromptsModalOpen: boolean;
  setIsPromptsModalOpen: (open: boolean) => void;
  promptsModalProps: PromptsModalProps; // Todas as props do PromptsModal

  // Prompt Form (quando criando/editando)
  isCreatePromptOpen: boolean;
  viewingPrompt: ViewingPrompt | null;
  // ... demais props de form

  // Audio
  isRecording: boolean;
  onRecordClick: () => void;
  isTranscribing: boolean;

  // Enhance
  onEnhancePrompt: () => void;
  isEnhancing: boolean;

  // Settings
  llmModel?: string;
}
```

### 7.2 Integração (2h)

### Checklist Fase 7
- [ ] Criar ChatInputArea.tsx
- [ ] Extrair lógica de action bars (create/edit/view prompt)
- [ ] Manter refs internas
- [ ] Integrar no David.tsx
- [ ] Testar todos os modos (normal, creating, viewing)
- [ ] Testar drag & drop
- [ ] Testar envio com arquivo
- [ ] Testar PromptsModal integrado
- [ ] Commit: `refactor(fase7): extrair ChatInputArea componente`

---

## Fase 8: Dialogs Module (PRIORIDADE ALTA)

**Objetivo**: Extrair todos os Dialogs para arquivos separados
**Impacto estimado**: -600 linhas (MAIOR IMPACTO)
**Complexidade**: Baixa
**Risco**: Baixo

### 8.1 Estrutura de diretório

```
client/src/components/dialogs/
├── index.ts
├── DeletePromptDialog.tsx
├── EditDraftDialog.tsx
├── RenameConversationDialog.tsx
├── DeleteConversationDialog.tsx
├── ProcessSelectorDialog.tsx
├── ProcessDataDialog.tsx
├── UploadDocsDialog.tsx
├── PromptSelectorDialog.tsx
├── DuplicateProcessDialog.tsx
└── FilesModal.tsx
```

### 8.2 Mapeamento de Dialogs

| Dialog | Linhas David.tsx | Props Principais |
|--------|------------------|------------------|
| DeletePromptDialog | 1636-1669 | `isOpen`, `onClose`, `onConfirm`, `promptIds` |
| EditDraftDialog | 1672-1730 | `isOpen`, `onClose`, `draft`, `onSave`, `draftType` |
| RenameConversationDialog | 1733-1783 | `isOpen`, `onClose`, `title`, `onRename` |
| DeleteConversationDialog | 2147-2179 | `isOpen`, `onClose`, `onConfirm` |
| ProcessSelectorDialog | 1786-1864 | `isOpen`, `onClose`, `processes`, `onSelect` |
| ProcessDataDialog | 1867-1941 | `isOpen`, `onClose`, `process` |
| UploadDocsDialog | 1944-2072 | `isOpen`, `onClose`, `processId`, `onUpload` |
| PromptSelectorDialog | 2075-2144 | `isOpen`, `onClose`, `prompts`, `onSelect` |
| DuplicateProcessDialog | 2182-2229 | `isOpen`, `onClose`, `conversations`, `onNavigate` |
| FilesModal | 2233-2274 | `isOpen`, `onClose`, `files` |

### 8.3 Template de Dialog

```typescript
// client/src/components/dialogs/EditDraftDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

interface EditDraftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  draft: string;
  draftType: "sentenca" | "decisao" | "despacho" | "acordao" | "outro";
  onDraftTypeChange: (type: "sentenca" | "decisao" | "despacho" | "acordao" | "outro") => void;
  onDraftChange: (content: string) => void;
  onSave: () => void;
  isSaving?: boolean;
}

export function EditDraftDialog({
  isOpen,
  onClose,
  draft,
  draftType,
  onDraftTypeChange,
  onDraftChange,
  onSave,
  isSaving = false,
}: EditDraftDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Editar Minuta</DialogTitle>
          <DialogDescription>
            Revise e edite a minuta gerada pelo DAVID antes de aprovar
          </DialogDescription>
        </DialogHeader>
        {/* ... conteúdo ... */}
      </DialogContent>
    </Dialog>
  );
}
```

### 8.4 Ordem de extração (por complexidade)

1. **Simples** (1h cada):
   - DeletePromptDialog
   - DeleteConversationDialog
   - FilesModal

2. **Média** (1.5h cada):
   - RenameConversationDialog
   - DuplicateProcessDialog
   - PromptSelectorDialog

3. **Complexa** (2h cada):
   - EditDraftDialog
   - ProcessSelectorDialog
   - ProcessDataDialog
   - UploadDocsDialog

### Checklist Fase 8
- [ ] Criar estrutura de diretório
- [ ] Extrair DeletePromptDialog
- [ ] Extrair DeleteConversationDialog
- [ ] Extrair FilesModal
- [ ] Extrair RenameConversationDialog
- [ ] Extrair DuplicateProcessDialog
- [ ] Extrair PromptSelectorDialog
- [ ] Extrair EditDraftDialog
- [ ] Extrair ProcessSelectorDialog
- [ ] Extrair ProcessDataDialog
- [ ] Extrair UploadDocsDialog
- [ ] Criar index.ts com exports
- [ ] Integrar todos no David.tsx
- [ ] Testar cada dialog individualmente
- [ ] Commit: `refactor(fase8): extrair dialogs para módulo separado`

---

## Fase 9: Hooks Adicionais

**Objetivo**: Extrair lógica de mutations e handlers para hooks
**Impacto estimado**: -150 linhas
**Complexidade**: Média
**Risco**: Baixo

### 9.1 useConversationActions (2h)

**Arquivo**: `client/src/hooks/useConversationActions.ts`

```typescript
export function useConversationActions() {
  const utils = trpc.useUtils();

  const renameMutation = trpc.david.renameConversation.useMutation({...});
  const deleteMutation = trpc.david.deleteConversation.useMutation({...});
  const togglePinMutation = trpc.david.togglePin.useMutation({...});
  const deleteMultipleMutation = trpc.david.deleteMultiple.useMutation({...});

  return {
    rename: renameMutation.mutate,
    delete: deleteMutation.mutate,
    togglePin: togglePinMutation.mutate,
    deleteMultiple: deleteMultipleMutation.mutate,
    isRenaming: renameMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

### 9.2 useDraftApproval (1.5h)

**Arquivo**: `client/src/hooks/useDraftApproval.ts`

```typescript
export function useDraftApproval(conversationId: number | null, processId?: number) {
  const approveMutation = trpc.david.approvedDrafts.create.useMutation({...});

  const approve = (messageId: number, content: string, status: "approved" | "rejected") => {...};
  const saveEdited = (messageId: number, originalDraft: string, editedDraft: string, draftType: DraftType) => {...};

  return {
    approve,
    saveEdited,
    isApproving: approveMutation.isPending,
  };
}
```

### 9.3 useAudioRecording (1.5h)

**Arquivo**: `client/src/hooks/useAudioRecording.ts`

```typescript
export function useAudioRecording(onTranscribed: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const transcribeMutation = trpc.david.transcribeAudio.useMutation({...});

  const startRecording = async () => {...};
  const stopRecording = () => {...};
  const toggleRecording = () => isRecording ? stopRecording() : startRecording();

  return {
    isRecording,
    isTranscribing: transcribeMutation.isPending,
    toggleRecording,
  };
}
```

### Checklist Fase 9
- [ ] Criar useConversationActions.ts
- [ ] Criar useDraftApproval.ts
- [ ] Criar useAudioRecording.ts
- [ ] Integrar hooks no David.tsx
- [ ] Remover lógica duplicada
- [ ] Testar todas as funcionalidades
- [ ] Commit: `refactor(fase9): extrair hooks de actions`

---

## Fase 10: Context API (Arquitetura Final)

**Objetivo**: Criar contexto global para eliminar prop drilling
**Impacto estimado**: -100 linhas + melhor arquitetura
**Complexidade**: Alta
**Risco**: Médio

### 10.1 DavidContext (4h)

**Arquivo**: `client/src/contexts/DavidContext.tsx`

```typescript
interface DavidState {
  // Conversa
  selectedConversationId: number | null;
  selectedProcessId: number | undefined;

  // Input
  messageInput: string;
  attachedFiles: AttachedFile[];

  // UI State
  isPromptsModalOpen: boolean;
  isFilesModalOpen: boolean;
}

interface DavidActions {
  setSelectedConversationId: (id: number | null) => void;
  setSelectedProcessId: (id: number | undefined) => void;
  setMessageInput: (value: string) => void;
  addAttachedFile: (file: AttachedFile) => void;
  removeAttachedFile: (uri: string) => void;
  clearAttachedFiles: () => void;
  openPromptsModal: () => void;
  closePromptsModal: () => void;
}

// Split context para evitar re-renders
export const DavidStateContext = createContext<DavidState | null>(null);
export const DavidActionsContext = createContext<DavidActions | null>(null);

export function DavidProvider({ children }: { children: React.ReactNode }) {
  // ... implementação
}

export const useDavidState = () => useContext(DavidStateContext);
export const useDavidActions = () => useContext(DavidActionsContext);
```

### 10.2 Migração gradual

1. Criar DavidProvider
2. Envolver David.tsx com provider
3. Migrar estados um por um
4. Atualizar componentes filhos para usar context
5. Remover props não mais necessárias

### Checklist Fase 10
- [ ] Criar DavidContext.tsx
- [ ] Implementar DavidProvider
- [ ] Criar hooks useDavidState e useDavidActions
- [ ] Migrar selectedConversationId
- [ ] Migrar selectedProcessId
- [ ] Migrar messageInput
- [ ] Migrar attachedFiles
- [ ] Migrar estados de UI
- [ ] Atualizar componentes filhos
- [ ] Testar navegação entre conversas
- [ ] Testar persistência de estado
- [ ] Commit: `refactor(fase10): implementar DavidContext`

---

## Cronograma Sugerido

| Fase | Tempo Estimado | Prioridade | Dependências |
|------|----------------|------------|--------------|
| 4 | 4h | Alta | - |
| 8 | 12h | **ALTA** | Fase 4 |
| 5 | 5h | Média | Fase 4 |
| 6 | 4h | Média | Fase 4 |
| 7 | 6h | Média | Fases 5, 6 |
| 9 | 5h | Baixa | Fase 7 |
| 10 | 6h | Baixa | Todas anteriores |

**Total estimado**: ~42h (~1 semana com equipe de 2 devs)

---

## Projeção de Resultados

| Após Fase | Linhas David.tsx | useState | useEffect |
|-----------|------------------|----------|-----------|
| 4 | 2250 | 29 | 12 |
| 8 | 1650 | 25 | 12 |
| 5 | 1450 | 23 | 11 |
| 6 | 1260 | 20 | 10 |
| 7 | 960 | 18 | 9 |
| 9 | 810 | 15 | 8 |
| 10 | **~700** | **~10** | **~6** |

---

## Critérios de Aceitação por Fase

### Cada PR deve:
1. Passar todos os testes E2E existentes
2. Não introduzir regressões visuais
3. Manter mesma funcionalidade
4. Ter code review aprovado
5. Seguir padrões de código do projeto

### Testes obrigatórios:
- [ ] Upload PDF → Enviar mensagem
- [ ] Navegação entre conversas
- [ ] Streaming de resposta
- [ ] CRUD de prompts
- [ ] Aprovar/Editar minuta
- [ ] Gravação de áudio

---

## Notas Importantes

1. **Meta <500 linhas**: Provavelmente não será atingida sem dividir David.tsx em sub-rotas. Uma meta realista pós-refatoração é ~700 linhas.

2. **Ordem de execução**: Recomendo fortemente começar pela **Fase 8 (Dialogs)** - maior impacto, menor risco.

3. **Feature flags**: Considerar manter feature flag para rollback rápido em produção.

4. **Commits atômicos**: Cada dialog/componente pode ser um commit separado para facilitar review e rollback.

5. **Documentação**: Atualizar README do diretório `components/` após cada fase.

---

## Contato

Para dúvidas sobre este plano, consulte:
- Documentação anterior: `docs/FRONTEND_REFACTORING_PLAN.md`
- Análise de god functions: `REFACTORING_GOD_FUNCTIONS_ANALYSIS.md`
