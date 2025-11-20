ALTER TABLE `davidConfig` MODIFY COLUMN `systemPrompt` longtext;--> statement-breakpoint
ALTER TABLE `drafts` MODIFY COLUMN `content` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `jurisprudence` MODIFY COLUMN `content` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `knowledgeBase` MODIFY COLUMN `content` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` MODIFY COLUMN `content` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `processes` MODIFY COLUMN `facts` longtext;--> statement-breakpoint
ALTER TABLE `processes` MODIFY COLUMN `evidence` longtext;--> statement-breakpoint
ALTER TABLE `processes` MODIFY COLUMN `requests` longtext;--> statement-breakpoint
ALTER TABLE `savedPrompts` MODIFY COLUMN `content` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `userSettings` MODIFY COLUMN `customSystemPrompt` longtext;