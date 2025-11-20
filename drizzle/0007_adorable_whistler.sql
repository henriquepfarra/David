CREATE INDEX `conversations_userId_idx` ON `conversations` (`userId`);--> statement-breakpoint
CREATE INDEX `drafts_userId_idx` ON `drafts` (`userId`);--> statement-breakpoint
CREATE INDEX `drafts_processId_idx` ON `drafts` (`processId`);--> statement-breakpoint
CREATE INDEX `jurisprudence_userId_idx` ON `jurisprudence` (`userId`);--> statement-breakpoint
CREATE INDEX `knowledgeBase_userId_idx` ON `knowledgeBase` (`userId`);--> statement-breakpoint
CREATE INDEX `messages_conversationId_idx` ON `messages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `processes_userId_idx` ON `processes` (`userId`);--> statement-breakpoint
CREATE INDEX `savedPrompts_userId_idx` ON `savedPrompts` (`userId`);