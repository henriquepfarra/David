/**
 * Exporta todos os serviços do DAVID
 */

export { RagService, getRagService, hasExactReference } from "./RagService";
export type { RagResult, SearchOptions, SearchDocument } from "./RagService";

export {
    ContextBuilder,
    createChatBuilder,
    createMinutaBuilder,
    createAnaliseBuilder,
    createBuilderForIntent,
    createAbstractBuilder,
    createConcreteBuilder,
} from "./ContextBuilder";
export type { ProcessContext, BuilderOptions } from "./ContextBuilder";

export { IntentService, classify, formatDebugBadge } from "./IntentService";
export type { Intent, IntentResult, RagScope, Motor, ClassifyContext } from "./IntentService";




