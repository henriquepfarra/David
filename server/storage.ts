/**
 * DEPRECATED: Manus/Forge Storage API
 * 
 * Este módulo foi desabilitado pois dependia da infraestrutura Manus/Forge.
 * Para armazenamento de arquivos, considere usar:
 * - Google Cloud Storage
 * - AWS S3
 * - Armazenamento local
 * 
 * TODO: Implementar nova solução de storage se necessário
 */

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  throw new Error(
    "Storage não disponível. A integração com Manus/Forge foi removida. " +
    "Configure uma solução de storage alternativa (ex: Google Cloud Storage, S3)."
  );
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  throw new Error(
    "Storage não disponível. A integração com Manus/Forge foi removida. " +
    "Configure uma solução de storage alternativa (ex: Google Cloud Storage, S3)."
  );
}
