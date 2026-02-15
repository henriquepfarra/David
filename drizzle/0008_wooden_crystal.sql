ALTER TABLE `conversations` ADD `pdfExtractedText` longtext;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `useCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `learnedTheses` ADD `lastUsedAt` timestamp;