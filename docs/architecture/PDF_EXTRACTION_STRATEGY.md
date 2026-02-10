# Estratégia Híbrida de Extração de PDF

**Data:** 2026-02-10
**Status:** Implementado
**Arquivos:** `server/_core/pdfExtractor.ts`, `server/processDocumentsRouter.ts`

## Visão Geral

Implementação de uma estratégia híbrida para extração de texto de PDFs que prioriza extração local (custo zero) com fallback automático para Google File API quando necessário.

## Motivação

Os PDFs do ePROC (sistema judicial) são tipicamente:
- PDFs nativos digitais (não scans)
- Texto pesquisável/selecionável
- Bem estruturados

Para esses documentos, usar a Google File API (com Gemini) é **overkill** e gera custos desnecessários.

## Arquitetura

```
PDF recebido
    ↓
1. Extração Local (PDF.js)
    ↓
2. Validação de Qualidade
    ├─ OK (high/medium confidence) → Usa texto local ✓ (custo zero)
    └─ Falha (low confidence) → File API (fallback seguro)
```

## Critérios de Qualidade

A validação usa **thresholds conservadores** - na dúvida, prefere File API.

| Critério | Threshold | O que detecta |
|----------|-----------|---------------|
| Chars/página | ≥ 50 | Páginas vazias ou escaneadas |
| Palavras/página | ≥ 8 | Conteúdo textual real |
| Ratio alfabético | ≥ 50% | Encoding quebrado/garbage |
| Páginas válidas | ≥ 60% | PDFs com muitas páginas vazias |

### Níveis de Confiança

- **high**: Todos os critérios passam → usa extração local
- **medium**: 1 critério falhou → usa extração local (aceitável)
- **low**: 2+ critérios falharam → vai para File API

## Implementação

### `pdfExtractor.ts`

```typescript
// Thresholds conservadores
const QUALITY_THRESHOLDS = {
    MIN_CHARS_PER_PAGE: 50,
    MIN_WORDS_PER_PAGE: 8,
    MIN_ALPHABETIC_RATIO: 0.5,
    MIN_VALID_PAGES_RATIO: 0.6,
};

// Função principal
export async function extractPdfWithQualityCheck(buffer: Buffer): Promise<{
    pages: ExtractedPage[];
    fullText: string;
    quality: ExtractionQualityResult;
}>;
```

### `processDocumentsRouter.ts`

```typescript
// 1. Tentar extração local primeiro
const localResult = await extractPdfWithQualityCheck(buffer);

if (localResult.quality.isValid) {
    // Usar extração local (custo zero)
    extractedText = localResult.fullText;
} else {
    // Fallback para File API
    const result = await readPdfWithVision(buffer, { apiKey, model });
    extractedText = result.content;
}
```

## Logs de Monitoramento

### Extração local bem-sucedida:
```
[PDFExtractor] Extração local: 15 páginas, 8500 chars, qualidade: high
[ProcessDocuments] Extração LOCAL bem-sucedida (high): 15 páginas, 8500 chars
```

### Fallback para File API:
```
[PDFExtractor] Extração local: 15 páginas, 200 chars, qualidade: low (Poucos caracteres por página)
[ProcessDocuments] Extração local insuficiente: Poucos caracteres por página. Usando File API...
[ProcessDocuments] File API: Leitura visual concluída. Tokens: 15000
```

## Economia Estimada

Para PDFs do ePROC (boa qualidade):
- **60-80%** dos documentos usarão extração local
- Economia aproximada: **$50-100/mês** para 100 PDFs/dia de 20 páginas

## Quando File API é Necessário

A File API continua essencial para:
- Prints de conversa (WhatsApp, email)
- Documentos escaneados
- Tabelas complexas onde estrutura visual importa
- Fotos de documentos
- PDFs com encoding problemático

## Ajuste de Thresholds

Se após testes você perceber que:

**Extração local aceita PDFs ruins:**
→ Aumente os thresholds em `pdfExtractor.ts:27-35`

**Extração local rejeita PDFs bons:**
→ Diminua os thresholds

## Arquivos Relacionados

- [server/_core/pdfExtractor.ts](../../server/_core/pdfExtractor.ts) - Extração e validação
- [server/_core/fileApi.ts](../../server/_core/fileApi.ts) - Google File API
- [server/processDocumentsRouter.ts](../../server/processDocumentsRouter.ts) - Integração

## TODO / Melhorias Futuras

- [ ] Monitorar taxa de fallback para File API em produção
- [ ] Ajustar thresholds baseado em dados reais
- [ ] Considerar cache de extrações para documentos recorrentes
- [ ] Avaliar adição de Poppler como segunda opção de extração local (se PDF.js falhar em casos específicos)
