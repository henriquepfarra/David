import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import type { ModuleSlug } from '@/types/modules';

interface UseModuleStateOptions {
    conversationId: number | null;
}

/**
 * Hook customizado para gerenciar estado de módulos especializados
 * Segue padrão de refatoração aplicado em usePrompts, usePdfUpload, etc.
 */
export function useModuleState({ conversationId }: UseModuleStateOptions) {
    // Estado local do módulo ativo (sobrepõe padrão do usuário)
    const [localModule, setLocalModule] = useState<ModuleSlug | null>(null);

    // Ref para armazenar módulo pendente (selecionado na home, antes de criar conversa)
    const pendingModuleRef = useRef<ModuleSlug | null>(null);

    // Ref para rastrear conversationId anterior
    const prevConversationIdRef = useRef<number | null>(null);

    // Query do módulo padrão do usuário
    const { data: userDefaultModule } = trpc.modules.getUserDefault.useQuery(undefined, {
        staleTime: Infinity, // Não muda frequentemente
    });

    // Query dos dados da conversa (para obter moduleSlug salvo)
    const { data: conversationData } = trpc.david.getConversation.useQuery(
        { id: conversationId! },
        {
            enabled: !!conversationId,
            staleTime: 30000,
        }
    );

    // Mutation para atualizar módulo da conversa
    const setConversationModuleMutation = trpc.modules.setConversationModule.useMutation();

    // Determinar módulo efetivo (hierarquia)
    const effectiveModule: ModuleSlug =
        localModule || // 1. Override local (selector)
        (conversationData?.conversation?.moduleSlug as ModuleSlug) || // 2. Salvo na conversa
        (userDefaultModule as ModuleSlug) || // 3. Padrão do usuário
        'default'; // 4. Fallback

    // Lógica de transição de conversas
    useEffect(() => {
        const prevId = prevConversationIdRef.current;

        // Caso 1: Home → Nova Conversa (null → número)
        if (prevId === null && conversationId !== null) {
            // Se tinha módulo pendente (selecionado na home), aplicar à nova conversa
            if (pendingModuleRef.current && pendingModuleRef.current !== 'default') {
                setLocalModule(pendingModuleRef.current);

                // Salvar módulo na conversa nova
                setConversationModuleMutation.mutate({
                    conversationId,
                    moduleSlug: pendingModuleRef.current,
                });

                pendingModuleRef.current = null; // Limpar pendente
            }
        }
        // Caso 2: Chat → Outra Conversa (número → número diferente)
        else if (prevId !== null && conversationId !== null && prevId !== conversationId) {
            // Resetar para carregar da conversa nova
            setLocalModule(null);
        }
        // Caso 3: Chat → Home (número → null)
        else if (prevId !== null && conversationId === null) {
            // Manter módulo ao voltar para home (UX melhor)
            // Não reseta
        }

        prevConversationIdRef.current = conversationId;
    }, [conversationId]);

    // Função para alterar módulo
    const setModule = (moduleSlug: ModuleSlug) => {
        setLocalModule(moduleSlug);

        // Se tiver conversa, salvar no backend
        if (conversationId) {
            setConversationModuleMutation.mutate({
                conversationId,
                moduleSlug,
            });
        } else {
            // Na home (sem conversa), salvar como pendente para próxima conversa
            pendingModuleRef.current = moduleSlug;
        }
    };

    return {
        currentModule: effectiveModule,
        setModule,
        isChangingModule: setConversationModuleMutation.isPending,
    };
}
