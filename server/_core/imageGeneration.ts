/**
 * DEPRECATED: Manus/Forge Image Generation API
 * 
 * Este módulo foi desabilitado pois dependia da infraestrutura Manus/Forge.
 * Para geração de imagens, considere usar:
 * - Google Gemini (gemini-2.0-flash-image)
 * - OpenAI DALL-E
 * - Stability AI
 */

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  throw new Error(
    "Image generation não disponível. A integração com Manus/Forge foi removida. " +
    "Para geração de imagens, considere usar Gemini, DALL-E ou Stability AI."
  );
}
