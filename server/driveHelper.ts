/**
 * Helper para consultar conteúdo do Google Drive
 * URL do documento: https://docs.google.com/document/d/1cBxRmE9rEj_oFzwoOCzhh6jh6S6jY2hKFL4kSoSWbwo/edit?usp=drive_link
 */

const DRIVE_DOCUMENT_ID = "1cBxRmE9rEj_oFzwoOCzhh6jh6S6jY2hKFL4kSoSWbwo";

/**
 * Busca o conteúdo do documento do Google Drive
 * Usa a API de exportação pública do Google Docs
 */
export async function fetchDriveContent(): Promise<string> {
  try {
    // Tentar exportar como texto simples
    const exportUrl = `https://docs.google.com/document/d/${DRIVE_DOCUMENT_ID}/export?format=txt`;
    
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      console.warn("Não foi possível acessar o documento do Drive. Verifique se o documento está público.");
      return "";
    }
    
    const content = await response.text();
    return content;
  } catch (error) {
    console.error("Erro ao buscar conteúdo do Drive:", error);
    return "";
  }
}

/**
 * Busca conteúdo do Drive com cache simples
 * Cache expira após 5 minutos
 */
let cachedContent: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function fetchDriveContentCached(): Promise<string> {
  const now = Date.now();
  
  // Se o cache ainda é válido, retornar conteúdo em cache
  if (cachedContent && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedContent;
  }
  
  // Caso contrário, buscar novo conteúdo
  const content = await fetchDriveContent();
  cachedContent = content;
  cacheTimestamp = now;
  
  return content;
}

/**
 * Limpa o cache manualmente
 */
export function clearDriveCache(): void {
  cachedContent = null;
  cacheTimestamp = 0;
}
