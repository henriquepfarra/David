import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Hook para gerenciar todas as mutations do David.tsx
 *
 * Agrupa mutations relacionadas em um único hook para:
 * - Reduzir linhas no componente principal
 * - Facilitar testes unitários
 * - Centralizar lógica de callbacks
 *
 * @param callbacks - Funções de callback para eventos de sucesso
 */
export interface UseDavidMutationsCallbacks {
  // Conversation callbacks
  onConversationCreated?: (data: { id: number }) => void;
  onConversationDeleted?: () => void;
  onConversationRenamed?: () => void;
  onConversationsRefetch?: () => void;
  onMessagesRefetch?: () => void;

  // Selection mode callbacks
  onSelectionCleared?: () => void;
  onSelectionModeOff?: () => void;
}

export function useDavidMutations(callbacks: UseDavidMutationsCallbacks = {}) {
  const utils = trpc.useUtils();

  // ============================================
  // CONVERSATION MUTATIONS
  // ============================================

  const createConversationMutation = trpc.david.createConversation.useMutation({
    onSuccess: (data) => {
      callbacks.onConversationCreated?.(data);
      callbacks.onConversationsRefetch?.();
    },
    onError: (error) => {
      toast.error("Erro ao criar conversa: " + error.message);
      console.error("[CreateConv] Erro ao criar conversa:", error);
    },
  });

  const renameConversationMutation = trpc.david.renameConversation.useMutation({
    onSuccess: () => {
      callbacks.onConversationsRefetch?.();
      callbacks.onConversationRenamed?.();
      toast.success("✏️ Conversa renomeada");
    },
    onError: (error) => {
      toast.error("Erro ao renomear: " + error.message);
    },
  });

  const deleteConversationMutation = trpc.david.deleteConversation.useMutation({
    onSuccess: () => {
      callbacks.onConversationsRefetch?.();
      callbacks.onConversationDeleted?.();
      toast.success("🗑️ Conversa deletada");
    },
    onError: (error) => {
      toast.error("Erro ao deletar: " + error.message);
    },
  });

  const togglePinMutation = trpc.david.togglePin.useMutation({
    onSuccess: () => {
      callbacks.onConversationsRefetch?.();
      toast.success("📌 Status de fixação alterado");
    },
    onError: (error) => {
      toast.error("Erro ao fixar: " + error.message);
    },
  });

  const deleteMultipleMutation = trpc.david.deleteMultiple.useMutation({
    onSuccess: (data) => {
      callbacks.onConversationsRefetch?.();
      callbacks.onSelectionCleared?.();
      callbacks.onSelectionModeOff?.();
      toast.success(`🗑️ ${data.deletedCount} conversa(s) deletada(s)`);
    },
    onError: (error) => {
      toast.error("Erro ao deletar conversas: " + error.message);
    },
  });

  // ============================================
  // PROCESS MUTATIONS
  // ============================================

  const updateProcessMutation = trpc.david.updateConversationProcess.useMutation({
    onSuccess: () => {
      callbacks.onMessagesRefetch?.();
      toast.success("Processo vinculado à conversa");
    },
    onError: (error) => {
      toast.error("Erro ao vincular processo: " + error.message);
    },
  });

  // ============================================
  // TITLE GENERATION
  // ============================================

  const generateTitleMutation = trpc.david.generateTitle.useMutation({
    onSuccess: () => {
      callbacks.onConversationsRefetch?.();
    },
    onError: (error) => {
      console.error("[TitleGen] Erro ao gerar título:", error.message);
      // Não mostrar toast pois é operação em background
    },
  });

  // ============================================
  // GOOGLE FILE MUTATIONS
  // ============================================

  const updateGoogleFileMutation = trpc.david.updateGoogleFile.useMutation({
    onSuccess: () => {
      // Arquivo vinculado silenciosamente
    },
    onError: (error) => {
      console.error("[UpdateGoogle] Erro:", error.message);
    },
  });

  const cleanupGoogleFileMutation = trpc.david.cleanupGoogleFile.useMutation({
    onSuccess: () => {
      // Arquivo limpo silenciosamente
    },
    onError: (error) => {
      console.error("[Cleanup] Erro ao limpar arquivo:", error.message);
    },
  });

  // ============================================
  // CLEANUP MUTATIONS
  // ============================================

  const cleanupIfEmptyMutation = trpc.david.cleanupIfEmpty.useMutation({
    onSuccess: (data) => {
      if (data.deleted) {
        callbacks.onConversationsRefetch?.();
      }
    },
    onError: (error) => {
      console.error("[Cleanup] Erro ao limpar conversa vazia:", error.message);
      // Não mostrar toast pois é operação em background
    },
  });

  // ============================================
  // DRAFT APPROVAL MUTATIONS
  // ============================================

  const approveDraftMutation = trpc.david.approvedDrafts.create.useMutation({
    onSuccess: () => {
      toast.success("✅ Minuta aprovada e salva para aprendizado!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar minuta: " + error.message);
    },
  });

  // ============================================
  // PROMPT MUTATIONS
  // ============================================

  const applyPromptMutation = trpc.david.savedPrompts.applyToConversation.useMutation({
    onSuccess: () => {
      callbacks.onMessagesRefetch?.();
      toast.success("📝 Prompt aplicado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao aplicar prompt: " + error.message);
    },
  });

  // ============================================
  // AUDIO & ENHANCE MUTATIONS
  // ============================================

  const enhancePromptMutation = trpc.david.enhancePrompt.useMutation({
    onError: () => toast.error("Erro ao melhorar prompt"),
  });

  const transcribeAudioMutation = trpc.david.transcribeAudio.useMutation({
    onError: () => toast.error("Erro ao transcrever áudio"),
  });

  // ============================================
  // DOCUMENT UPLOAD MUTATION
  // ============================================

  const uploadDocMutation = trpc.processDocuments.upload.useMutation({
    onError: (error) => {
      console.error("[UploadDoc] Erro ao fazer upload:", error);
      // Erro já é tratado no catch onde mutateAsync é chamado
    },
  });

  return {
    // Conversation
    createConversationMutation,
    renameConversationMutation,
    deleteConversationMutation,
    togglePinMutation,
    deleteMultipleMutation,

    // Process
    updateProcessMutation,

    // Title
    generateTitleMutation,

    // Google File
    updateGoogleFileMutation,
    cleanupGoogleFileMutation,

    // Cleanup
    cleanupIfEmptyMutation,

    // Draft
    approveDraftMutation,

    // Prompt
    applyPromptMutation,

    // Audio & Enhance
    enhancePromptMutation,
    transcribeAudioMutation,

    // Document
    uploadDocMutation,

    // Utils
    utils,
  };
}
