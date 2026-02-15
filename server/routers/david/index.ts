import { mergeRouters } from "../../_core/trpc";
import { davidConversationsRouter } from "./conversations";
import { davidChatRouter } from "./chat";
import { davidGoogleFilesRouter } from "./googleFiles";
import { davidPromptsRouter } from "./prompts";
import { davidLearningRouter } from "./learning";
import { davidAdminRouter } from "./admin";

export const davidRouter = mergeRouters(
  davidConversationsRouter,
  davidChatRouter,
  davidGoogleFilesRouter,
  davidPromptsRouter,
  davidLearningRouter,
  davidAdminRouter,
);
