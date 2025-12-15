/**
 * Configuração do Chunker
 */
interface ChunkingConfig {
    maxSize: number; // Tamanho ideal do chunk em caracteres
    overlap: number; // Sobreposição entre chunks para manter contexto
}

const DEFAULT_CONFIG: ChunkingConfig = {
    maxSize: 1000,
    overlap: 200,
};

/**
 * Interface de Chunk gerado
 */
export interface TextChunk {
    content: string;
    chunkIndex: number;
    tokenCountEstimate: number;
}

/**
 * Função de Chunking Inteligente com Sobreposição
 * Essa função quebra um texto longo em partes menores, mantendo um "overlap"
 * (sobreposição) entre o final de um e o começo do outro.
 * 
 * Ex: Se overlap=5, chunk1 termina em "ABCDE", chunk2 começa em "ABCDE..."
 * Isso evita que frases sejam cortadas ao meio e se perca o sentido na fronteira.
 */
export function splitTextIntoChunks(
    text: string,
    config: ChunkingConfig = DEFAULT_CONFIG
): TextChunk[] {
    const { maxSize, overlap } = config;

    if (text.length <= maxSize) {
        return [{
            content: text,
            chunkIndex: 0,
            tokenCountEstimate: Math.ceil(text.length / 4) // Estimativa grosseira de tokens
        }];
    }

    const chunks: TextChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
        let endIndex = startIndex + maxSize;

        // Ajuste fino: tentar não cortar palavras no meio
        if (endIndex < text.length) {
            // Procurar o último espaço dentro do limite
            const lastSpace = text.lastIndexOf(" ", endIndex);
            if (lastSpace > startIndex) {
                endIndex = lastSpace;
            }
        }

        const chunkContent = text.substring(startIndex, endIndex);

        chunks.push({
            content: chunkContent.trim(),
            chunkIndex: chunkIndex++,
            tokenCountEstimate: Math.ceil(chunkContent.length / 4)
        });

        // Avançar o cursor, mas recuar pelo overlap
        startIndex = endIndex - overlap;

        // Proteção contra loop infinito se overlap >= maxSize (configuração inválida)
        if (startIndex <= endIndex - maxSize) {
            startIndex = endIndex; // Ignorar overlap se for muito grande
        }
    }

    return chunks;
}
