CREATE TABLE `processDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`processId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`content` longtext NOT NULL,
	`fileType` varchar(50),
	`fileUrl` varchar(500),
	`documentType` enum('inicial','prova','peticao','sentenca','recurso','outro') NOT NULL DEFAULT 'outro',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `knowledgeBase` ADD `documentType` enum('minuta_modelo','decisao_referencia','tese','enunciado','jurisprudencia','outro') DEFAULT 'outro' NOT NULL;--> statement-breakpoint
CREATE INDEX `processDocuments_userId_idx` ON `processDocuments` (`userId`);--> statement-breakpoint
CREATE INDEX `processDocuments_processId_idx` ON `processDocuments` (`processId`);