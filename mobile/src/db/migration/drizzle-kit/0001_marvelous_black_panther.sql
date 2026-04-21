CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hash` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`event_type` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `logs_hash_unique` ON `logs` (`hash`);