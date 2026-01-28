# Análise dos Erros de Teste

## Resumo dos Problemas

### 1. ❌ `server/david.test.ts` - Erro ao carregar `./draftGenerator`
**Erro:** `Failed to load url ./draftGenerator`
**Causa:** O arquivo importa `draftGenerator` que não existe no projeto.
**Solução:** Remover o import não utilizado, já que o teste não usa essas funções.

---

### 2. ❌ `server/auth.logout.test.ts` - Incompatibilidade de `maxAge`
**Erro:** Teste espera `maxAge: -1`, mas recebe `maxAge: 0`
**Causa:** O código em `routers.ts` usa `maxAge: 0` (correto segundo especificação HTTP), mas o teste espera `-1`.
**Solução:** Atualizar o teste para aceitar `maxAge: 0`, que é o valor correto para limpar cookies.

---

### 3. ❌ `server/settings.test.ts` - API Key mascarada
**Erro:** Teste espera `"test-key"`, mas recebe `"********"`
**Causa:** Por segurança, o endpoint `settings.get` mascara as chaves de API com `'********'` (linha 414 de `routers.ts`). O teste está incorreto ao esperar a chave real.
**Solução:** Atualizar o teste para verificar se a chave existe (valor mascarado) ao invés de comparar com a chave real.

---

### 4. ❌ `server/thesisExtraction.test.ts` - Schema desatualizado
**Erro:** `Extração incompleta - campos obrigatórios faltando`
**Causa:** O código atualizado espera campos novos: `legalThesis`, `writingStyleSample`, `writingCharacteristics`, mas o mock do teste usa campos antigos: `thesis`, `decisionPattern`.
**Solução:** Atualizar o mock do teste para usar o novo schema.

---

### 5. ⏱️ `server/autoTitle.test.ts` - Timeout
**Erro:** Teste timeout após 20 segundos
**Causa:** O teste depende de chamada real à LLM via `generateConversationTitle()`. A geração de título acontece em background (não bloqueia), mas se não houver API key configurada ou se a chamada da LLM demorar/falhar, o título não será gerado.
**Observação:** 
- Se não houver API key, o código usa fallback (primeiras palavras), mas o teste espera título diferente de "Nova conversa"
- O teste pode precisar de mock da LLM ou configuração de API key válida
- Considerar usar `caller.david.generateTitle()` explicitamente ao invés de esperar processo assíncrono

---

### 6. ❌ `server/fullFlow.test.ts` - Processo undefined
**Erro:** `processo` está `undefined` após tentar buscar/criar
**Causa:** `getProcessById` não existe como função exportada. O código estava usando uma função que não existe.
**Solução:** ✅ Corrigido - usar `caller.processes.get({ id })` ao invés de `getProcessById()`

---

## Correções Realizadas

1. ✅ **david.test.ts** - Removido import de `draftGenerator` inexistente
2. ✅ **auth.logout.test.ts** - Ajustado para aceitar `maxAge: 0` (correto segundo HTTP spec)
3. ✅ **settings.test.ts** - Ajustado para verificar valor mascarado `'********'` (por segurança)
4. ✅ **thesisExtraction.test.ts** - Atualizado mock para novo schema (`legalThesis`, `writingStyleSample`, `writingCharacteristics`)
5. ✅ **fullFlow.test.ts** - Corrigido para usar `caller.processes.get()` ao invés de `getProcessById()` inexistente

---

## Problemas Restantes

### ⚠️ `server/autoTitle.test.ts` - Timeout
Este teste requer configuração adicional:
- Mock da LLM (`invokeLLM`) ou API key válida configurada
- O processo de geração de título é assíncrono e pode falhar silenciosamente
- Recomendação: Mockar `generateConversationTitle` ou usar chamada explícita ao `generateTitle` endpoint
