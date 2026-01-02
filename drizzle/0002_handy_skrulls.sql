CREATE TABLE `promptCollections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promptCollections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `knowledgeBase` MODIFY COLUMN `documentType` enum('minuta_modelo','decisao_referencia','tese','enunciado','jurisprudencia','outro','sumula','tema_repetitivo') NOT NULL DEFAULT 'outro';--> statement-breakpoint
ALTER TABLE `knowledgeBase` ADD `systemId` varchar(100);--> statement-breakpoint
ALTER TABLE `savedPrompts` ADD `collectionId` int;--> statement-breakpoint
ALTER TABLE `savedPrompts` ADD `tags` json;--> statement-breakpoint
ALTER TABLE `knowledgeBase` ADD CONSTRAINT `knowledgeBase_systemId_unique` UNIQUE(`systemId`);--> statement-breakpoint
CREATE INDEX `promptCollections_userId_idx` ON `promptCollections` (`userId`);--> statement-breakpoint
CREATE INDEX `knowledgeBase_systemId_idx` ON `knowledgeBase` (`systemId`);--> statement-breakpoint
CREATE INDEX `savedPrompts_collectionId_idx` ON `savedPrompts` (`collectionId`);