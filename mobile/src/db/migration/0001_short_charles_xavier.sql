CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_key` text NOT NULL,
	`world_name` text NOT NULL,
	`location` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`username` text,
	`players` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_source_key_unique` ON `sessions` (`source_key`);