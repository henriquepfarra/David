CREATE TABLE `usageTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(50) NOT NULL,
	`model` varchar(100) NOT NULL,
	`inputTokens` bigint NOT NULL DEFAULT 0,
	`outputTokens` bigint NOT NULL DEFAULT 0,
	`requestCount` int NOT NULL DEFAULT 0,
	`date` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usageTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userSettings` MODIFY COLUMN `llmModel` varchar(100) DEFAULT 'gemini-3-flash-preview';--> statement-breakpoint
CREATE INDEX `usageTracking_userId_date_idx` ON `usageTracking` (`userId`,`date`);--> statement-breakpoint
CREATE INDEX `usageTracking_date_idx` ON `usageTracking` (`date`);