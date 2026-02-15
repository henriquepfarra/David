# Estrategia Hibrida de Extracao de PDF

**Data:** 2026-02-15 (atualizado)
**Status:** Implementado e centralizado
**Arquivos principais:** `server/_core/pdfExtractor.ts`, `server/routers.ts` (uploadPdfQuick)

## Visao Geral

Extracao local (pdf.js, custo zero) roda no momento do upload, em paralelo com o upload pro Google File API. O texto extraido e persistido no banco (`conversations.pdfExtractedText`) e reutilizado por todos os fluxos downstream (chat, /analise1, qualquer comando futuro).

Para PDFs escaneados, fotos ou documentos de baixa qualidade, o sistema faz fallback automatico para o Google File API (Gemini visual).

## Fluxo Completo

```
PDF chega (upload)
    |
    v
[uploadPdfQuick] Buffer disponivel
    |
    +--- Em paralelo --->  uploadPdfForMultipleQueries(buffer) --> fileUri
    |
    +--- Em paralelo --->  extractPdfWithQualityCheck(buffer) --> texto + qualidade
    |
    v
Qualidade high/medium?
    |--- SIM --> salva pdfExtractedText no DB (custo zero)
    |--- NAO --> pdfExtractedText = null (FileAPI sera usado no momento do consumo)
    |
    v
fileUri SEMPRE salvo no DB (safety net)

--- No momento do uso (chat ou comando) ---

pdfExtractedText existe?
    |--- SIM --> usa direto (todos os providers, custo zero)
    |--- NAO + Google provider --> fileUri nativo (Gemini visual)
    |--- NAO + outro provider --> readContentFromUri fallback (FileAPI)
```

## Criterios de Qualidade

A validacao usa **thresholds conservadores** - na duvida, prefere File API.

| Criterio | Threshold | O que detecta |
|----------|-----------|---------------|
| Chars/pagina | >= 50 | Paginas vazias ou escaneadas |
| Palavras/pagina | >= 8 | Conteudo textual real |
| Ratio alfabetico | >= 50% | Encoding quebrado/garbage |
| Paginas validas | >= 60% | PDFs com muitas paginas vazias |

### Niveis de Confianca

- **high**: Todos os criterios passam -> usa extracao local
- **medium**: 1 criterio falhou -> usa extracao local (aceitavel)
- **low**: 2+ criterios falharam -> vai para File API

## Arquitetura Centralizada

A extracao acontece em **um unico lugar** (uploadPdfQuick) e o resultado e consumido por todos os fluxos:

### Upload (server/routers.ts - uploadPdfQuick)
- Decodifica base64 para Buffer
- Roda `extractPdfWithQualityCheck(buffer)` em paralelo com upload Google
- Retorna `{ fileUri, fileName, displayName, extractedText }`

### Persistencia
- `conversations.pdfExtractedText` (longtext, nullable) - texto extraido
- `conversations.googleFileUri` - URI do Google (sempre mantido como fallback)
- Ambos salvos via `updateConversationGoogleFile()`

### Consumidores
Todos checam `pdfExtractedText` antes de usar FileAPI:

1. **Chat stream** (`server/_core/index.ts`) - fluxo de conversa normal
2. **Comandos** (`server/commands/handlers/*.ts`) - /analise1, etc.
3. **ConversationService** (`server/services/ConversationService.ts`) - via sendMessage

## Logs de Monitoramento

### Extracao local bem-sucedida (custo zero):
```
[PDFExtractor] Extracao local: 43 paginas, 42692 chars, qualidade: high
[uploadPdfQuick] Extracao local: high (42692 chars), usando: LOCAL
[analise1] PDF via texto local (42734 chars)
```

### Fallback para File API (PDF escaneado):
```
[PDFExtractor] Extracao local: 15 paginas, 200 chars, qualidade: low (Poucos caracteres por pagina)
[uploadPdfQuick] Extracao local: low (200 chars), usando: FILE_API
[Stream] PDF fallback via FileAPI (scanned/low-quality): https://...
```

### Google provider nativo (scan sem texto local):
```
[Stream] PDF fallback via Gemini nativo (scanned/low-quality): https://...
```

## Quando File API e Necessario

A File API continua essencial para:
- Prints de conversa (WhatsApp, email)
- Documentos escaneados
- Tabelas complexas onde estrutura visual importa
- Fotos de documentos
- PDFs com encoding problematico

## Ajuste de Thresholds

Se apos testes voce perceber que:

**Extracao local aceita PDFs ruins:**
-> Aumente os thresholds em `pdfExtractor.ts:27-35`

**Extracao local rejeita PDFs bons:**
-> Diminua os thresholds

## Arquivos Relacionados

- [server/_core/pdfExtractor.ts](../../server/_core/pdfExtractor.ts) - Extracao e validacao de qualidade
- [server/_core/fileApi.ts](../../server/_core/fileApi.ts) - Google File API (fallback)
- [server/routers.ts](../../server/routers.ts) - uploadPdfQuick (ponto de extracao centralizado)
- [server/_core/index.ts](../../server/_core/index.ts) - Stream handler (consumidor)
- [server/commands/handlers/analise1.handler.ts](../../server/commands/handlers/analise1.handler.ts) - Comando /analise1 (consumidor)
- [server/routers/david/googleFiles.ts](../../server/routers/david/googleFiles.ts) - Persistencia do texto extraido
- [drizzle/schema.ts](../../drizzle/schema.ts) - Schema com campo pdfExtractedText

## Historico

- **2026-02-10**: Criacao do pdfExtractor.ts com quality check (usado apenas em processDocumentsRouter)
- **2026-02-15**: Centralizacao da extracao no uploadPdfQuick, persistencia no DB, simplificacao de todos os consumidores
