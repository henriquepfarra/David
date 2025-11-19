CREATE TABLE `drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`userId` int NOT NULL,
	`draftType` enum('sentenca','decisao','despacho','acordao') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
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
	`content` text NOT NULL,
	`decisionDate` timestamp,
	`keywords` text,
	`url` varchar(500),
	`isFavorite` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jurisprudence_id` PRIMARY KEY(`id`)
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
	`facts` text,
	`evidence` text,
	`requests` text,
	`status` varchar(50),
	`distributionDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`llmApiKey` text,
	`llmProvider` varchar(50) DEFAULT 'openai',
	`llmModel` varchar(100) DEFAULT 'gpt-4',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSettings_userId_unique` UNIQUE(`userId`)
);
