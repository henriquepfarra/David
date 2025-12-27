CREATE TABLE `approvedDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`processId` int,
	`conversationId` int,
	`messageId` int,
	`originalDraft` longtext NOT NULL,
	`editedDraft` longtext,
	`draftType` enum('sentenca','decisao','despacho','acordao','outro') NOT NULL,
	`approvalStatus` enum('approved','edited_approved','rejected') NOT NULL,
	`userNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `approvedDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`processId` int,
	`title` varchar(300) NOT NULL,
	`isPinned` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `davidConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`systemPrompt` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `davidConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `davidConfig_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`userId` int NOT NULL,
	`draftType` enum('sentenca','decisao','despacho','acordao') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jurisprudence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`court` varchar(100) NOT NULL,
	`caseNumber` varchar(100),
	`title` varchar(300) NOT NULL,
	`summary` text,
	`content` longtext NOT NULL,
	`decisionDate` timestamp,
	`keywords` text,
	`url` varchar(500),
	`isFavorite` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jurisprudence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeBase` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`content` longtext NOT NULL,
	`fileType` varchar(50),
	`documentType` enum('minuta_modelo','decisao_referencia','tese','enunciado','jurisprudencia','outro') NOT NULL DEFAULT 'outro',
	`source` enum('sistema','usuario') NOT NULL DEFAULT 'usuario',
	`category` varchar(100),
	`tags` text,
	`embedding` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeBase_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learnedTheses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`approvedDraftId` int NOT NULL,
	`processId` int,
	`thesis` longtext NOT NULL,
	`legalFoundations` longtext,
	`keywords` text,
	`decisionPattern` longtext,
	`isObsolete` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learnedTheses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processDocumentChunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`documentId` int NOT NULL,
	`content` longtext NOT NULL,
	`pageNumber` int NOT NULL,
	`chunkIndex` int NOT NULL,
	`tokenCount` int,
	`embedding` json,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processDocumentChunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `processes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`processNumber` varchar(50) NOT NULL,
	`court` varchar(100),
	`judge` varchar(200),
	`plaintiff` text,
	`defendant` text,
	`subject` text,
	`facts` longtext,
	`evidence` longtext,
	`requests` longtext,
	`status` varchar(50),
	`distributionDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savedPrompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`category` varchar(100),
	`content` longtext NOT NULL,
	`description` text,
	`isDefault` int NOT NULL DEFAULT 0,
	`executionMode` enum('chat','full_context') NOT NULL DEFAULT 'chat',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savedPrompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`llmApiKey` text,
	`llmProvider` varchar(50) DEFAULT 'google',
	`llmModel` varchar(100) DEFAULT 'gemini-2.5-flash',
	`readerApiKey` text,
	`readerModel` varchar(100) DEFAULT 'gemini-2.0-flash',
	`customSystemPrompt` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `approvedDrafts_userId_idx` ON `approvedDrafts` (`userId`);--> statement-breakpoint
CREATE INDEX `approvedDrafts_processId_idx` ON `approvedDrafts` (`processId`);--> statement-breakpoint
CREATE INDEX `conversations_userId_idx` ON `conversations` (`userId`);--> statement-breakpoint
CREATE INDEX `drafts_userId_idx` ON `drafts` (`userId`);--> statement-breakpoint
CREATE INDEX `drafts_processId_idx` ON `drafts` (`processId`);--> statement-breakpoint
CREATE INDEX `jurisprudence_userId_idx` ON `jurisprudence` (`userId`);--> statement-breakpoint
CREATE INDEX `knowledgeBase_userId_idx` ON `knowledgeBase` (`userId`);--> statement-breakpoint
CREATE INDEX `learnedTheses_userId_idx` ON `learnedTheses` (`userId`);--> statement-breakpoint
CREATE INDEX `learnedTheses_approvedDraftId_idx` ON `learnedTheses` (`approvedDraftId`);--> statement-breakpoint
CREATE INDEX `messages_conversationId_idx` ON `messages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `processDocumentChunks_processId_idx` ON `processDocumentChunks` (`processId`);--> statement-breakpoint
CREATE INDEX `processDocumentChunks_documentId_idx` ON `processDocumentChunks` (`documentId`);--> statement-breakpoint
CREATE INDEX `processDocuments_userId_idx` ON `processDocuments` (`userId`);--> statement-breakpoint
CREATE INDEX `processDocuments_processId_idx` ON `processDocuments` (`processId`);--> statement-breakpoint
CREATE INDEX `processes_userId_idx` ON `processes` (`userId`);--> statement-breakpoint
CREATE INDEX `savedPrompts_userId_idx` ON `savedPrompts` (`userId`);