/**
 * Feature Flags para deploy seguro de refatorações
 * 
 * Uso:
 * import { FEATURES } from '@/config/features';
 * if (FEATURES.USE_REFACTORED_UPLOAD) { ... }
 */

export const FEATURES = {
    /**
     * Usa o novo sistema de upload refatorado (UploadContext)
     * Ativar via: VITE_REFACTORED_UPLOAD=true
     */
    USE_REFACTORED_UPLOAD: import.meta.env.VITE_REFACTORED_UPLOAD === 'true',

    /**
     * Usa o novo ChatInput componente
     * Ativar via: VITE_REFACTORED_CHAT_INPUT=true
     */
    USE_REFACTORED_CHAT_INPUT: import.meta.env.VITE_REFACTORED_CHAT_INPUT === 'true',

    /**
     * Usa o novo PromptsModal componente
     * Ativar via: VITE_REFACTORED_PROMPTS=true
     */
    USE_REFACTORED_PROMPTS: import.meta.env.VITE_REFACTORED_PROMPTS === 'true',
} as const;

// Type helper para autocomplete
export type FeatureFlag = keyof typeof FEATURES;
