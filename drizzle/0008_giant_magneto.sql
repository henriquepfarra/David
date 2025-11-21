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
CREATE INDEX `approvedDrafts_userId_idx` ON `approvedDrafts` (`userId`);--> statement-breakpoint
CREATE INDEX `approvedDrafts_processId_idx` ON `approvedDrafts` (`processId`);--> statement-breakpoint
CREATE INDEX `learnedTheses_userId_idx` ON `learnedTheses` (`userId`);--> statement-breakpoint
CREATE INDEX `learnedTheses_approvedDraftId_idx` ON `learnedTheses` (`approvedDraftId`);