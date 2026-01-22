ALTER TABLE `knowledgeBase` MODIFY COLUMN `documentType` enum('minuta_modelo','decisao_referencia','tese','enunciado','jurisprudencia','outro','sumula_stj','sumula_stf','sumula_vinculante','tema_repetitivo') NOT NULL DEFAULT 'outro';--> statement-breakpoint
ALTER TABLE `learnedTheses` MODIFY COLUMN `thesis` longtext;--> statement-breakpoint
ALTER TABLE `conversations` ADD `moduleSlug` varchar(20);--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `legalThesis` longtext NOT NULL;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `writingStyleSample` longtext;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `writingCharacteristics` json;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `status` enum('PENDING_REVIEW','ACTIVE','REJECTED') DEFAULT 'PENDING_REVIEW' NOT NULL;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `thesisEmbedding` json;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `styleEmbedding` json;--> statement-breakpoint
ALTER TABLE `processes` ADD `lastActivityAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `userSettings` ADD `defaultModule` varchar(20) DEFAULT 'default';--> statement-breakpoint
CREATE INDEX `learnedTheses_status_idx` ON `learnedTheses` (`status`);