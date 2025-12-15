CREATE TABLE `processDocumentChunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`documentId` int NOT NULL,
	`content` longtext NOT NULL,
	`pageNumber` int NOT NULL,
	`chunkIndex` int NOT NULL,
	`tokenCount` int,
	`embedding` text,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processDocumentChunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userSettings` ADD `openaiEmbeddingsKey` text;--> statement-breakpoint
CREATE INDEX `processDocumentChunks_processId_idx` ON `processDocumentChunks` (`processId`);--> statement-breakpoint
CREATE INDEX `processDocumentChunks_documentId_idx` ON `processDocumentChunks` (`documentId`);