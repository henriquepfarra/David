CREATE TABLE `davidConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`systemPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `davidConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `davidConfig_userId_unique` UNIQUE(`userId`)
);
