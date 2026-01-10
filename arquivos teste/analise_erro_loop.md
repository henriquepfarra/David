# Relatório de Análise: Erro "Maximum Update Depth Exceeded"

## 1. Descrição do Problema
**Erro:** `Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.`
**Sintoma:** "Tela Vermelha da Morte" (Crash do React) que inutiliza a aplicação.
**Gatilho:** Ocorre consistentemente durante o processo de upload de PDF (Drag & Drop) e criação automática de conversa.
**Erro Concomitante:** O console exibe erros de backend: `TRPCClientError: Conversa não encontrada`, indicando que o frontend tenta acessar uma conversa que o banco de dados ainda não registrou ou já perdeu a referência.

## 2. Cronologia e Tentativas de Solução (Sem Sucesso)

### Tentativa 1: Correção de Race Condition no Estado
*   **Hipótese:** O callback `onSuccess` do upload estava acessando o estado `selectedConversationId` antigo (`null`) antes que o React o atualizasse.
*   **Ação:** Implementação de `useRef` (`selectedConversationIdRef`) para garantir acesso síncrono ao valor mais recente.
*   **Resultado:** O erro de backend persistiu e o loop continuou. Isso descartou que o problema fosse *apenas* a leitura do estado.

### Tentativa 2: Remoção do Componente `ScrollArea` (Chat)
*   **Hipótese:** O stack trace apontava consistentemente para componentes internos do React e bibliotecas de UI. Suspeitou-se que o `ScrollArea` (que usa cálculos de tamanho) estivesse entrando em loop ao tentar renderizar mensagens de erro ou atualizações rápidas.
*   **Ação:** Remoção completa do `<ScrollArea>` em `David.tsx`, substituindo por `div` nativa.
*   **Resultado:** O erro persistiu idêntico.

### Tentativa 3: Remoção do Componente `ScrollArea` (Sidebar/Layout)
*   **Hipótese:** O erro poderia estar no componente pai (`DashboardLayout`), que é renderizado junto. Como a lista de conversas atualiza após o upload, o `ScrollArea` da sidebar poderia ser o culpado.
*   **Ação:** Remoção do `<ScrollArea>` em `DashboardLayout.tsx`.
*   **Resultado:** O erro persistiu. Eliminamos a hipótese da biblioteca de scroll.

### Tentativa 4: Isolamento do Componente `Streamdown`
*   **Hipótese:** O componente de renderização de Markdown (`Streamdown`) poderia estar causando re-renders infinitos ao tentar processar streams de texto ou erros.
*   **Ação:** Substituição temporária por uma `div` simples.
*   **Resultado:** O erro persistiu, provando não ser culpa do renderizador de texto.

## 3. Análise Profunda & Nova Hipótese

Dado que removemos os "suspeitos habituais" (componentes de UI complexos) e o erro persiste, o problema é quase certamente **lógico/estrutural** no gerenciamento de estado do React, especificamente na sincronização entre três fontes de verdade:
1.  **Estado Local:** `selectedConversationId`
2.  **URL (Query Param):** `?c=123`
3.  **Refetch de Dados (React Query):** A lista de conversas e as mensagens.

### O Provável "Ciclo da Morte"
1.  O Upload cria uma conversa (ID: 100).
2.  O código tenta setar o estado `setSelectedConversationId(100)`.
3.  Um `useEffect` detecta mudança e atualiza a URL (`?c=100`).
4.  O Backend falha momentaneamente (`Conversa não encontrada`) ou retorna um erro.
5.  O tratamento de erro (ou um fluxo colateral) tenta resetar o estado para `null` ou re-selecionar a conversa.
6.  A mudança de URL dispara o `useEffect` de sincronização, que tenta setar o ID novamente.
7.  **Loop Infinito:** Estado -> URL -> Estado -> URL... (em milissegundos).

### Pontos de Atenção Identificados no Código
*   **Sincronização Bidirecional:** Existem listeners de `popstate` e `useEffect` monitorando `location` e `selectedConversationId` ao mesmo tempo.
*   **Mutação com Efeito Colateral:** O `uploadPdfQuickMutation` atualiza o estado E dispara `updateGoogleFileMutation`, que se falhar, pode desencadear novos updates.
*   **React Query Retries:** Se a query de mensagens falha ("Não encontrada"), o React Query pode estar tentando recarregar agressivamente, e a cada falha, um componente pai/filho tenta "corrigir" o estado navegando ou limpando a seleção.

## 4. Próximos Passos (Recomendação)
**PARAR AS MUDANÇAS DE CÓDIGO CEGAS.**

1.  **Auditoria de `useEffect`:** Revisar manualmente cada efeito que toca em `setLocation` ou `setSelectedConversationId`.
2.  **Desligar Sincronização de URL:** Testar desabilitar temporariamente a atualização da URL para ver se o loop para. Se parar, confirmamos o culpado.
3.  **Logs em Tempo Real:** Adicionar logs apenas nos setters de estado para ver quem está chamando quem.

Este erro é clássico de "luta" entre gerenciadores de estado (URL vs React State). A solução será simplificar o fluxo para uma única fonte de verdade.
