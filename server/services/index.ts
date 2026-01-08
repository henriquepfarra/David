/**
 * Exporta todos os serviços do DAVID
 */

export { RagService, getRagService, hasExactReference } from "./RagService";
export type { RagResult, SearchOptions, SearchDocument } from "./RagService";

export {
    ContextBuilder,
    createChatBuilder,
    createMinutaBuilder,
    createAnaliseBuilder
} from "./ContextBuilder";
export type { ProcessContext, BuilderOptions } from "./ContextBuilder";
