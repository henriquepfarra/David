import { useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook para gerenciar o ID da conversa selecionada.
 *
 * ## Single Source of Truth
 * A URL é a ÚNICA fonte de verdade para o ID da conversa (?c=123).
 * Este hook elimina loops de estado ao garantir fluxo unidirecional:
 *
 * ```
 * Ação do Usuário → URL → Estado Derivado → Re-render
 * ```
 *
 * ## Uso
 * ```typescript
 * const [conversationId, setConversationId] = useConversationId();
 *
 * // Ler (sempre atualizado da URL)
 * console.log(conversationId); // null ou number
 *
 * // Escrever (modifica URL, que dispara re-render)
 * setConversationId(123);
 * setConversationId(null); // Limpa seleção
 * ```
 *
 * @returns [conversationId, setConversationId]
 */
export function useConversationId(): [number | null, (id: number | null) => void] {
  const [location, setLocation] = useLocation();

  // LEITURA: Deriva da URL (sem estado intermediário)
  // useMemo garante que só recalcula quando location muda
  const conversationId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');

    // Validação: deve ser número inteiro positivo
    if (c) {
      const parsed = parseInt(c, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }, [location]); // Reage apenas a mudanças no location do wouter

  // ESCRITA: Modifica a URL (wouter detecta e faz re-render)
  // useCallback previne recriação da função a cada render
  const setConversationId = useCallback((id: number | null) => {
    if (id === null || id === undefined) {
      // Limpar seleção: remove query param
      setLocation('/david');
    } else if (typeof id === 'number' && id > 0) {
      // Selecionar conversa: adiciona query param
      setLocation(`/david?c=${id}`);
    } else {
      console.warn('[useConversationId] ID inválido:', id);
    }
  }, [setLocation]);

  return [conversationId, setConversationId];
}
