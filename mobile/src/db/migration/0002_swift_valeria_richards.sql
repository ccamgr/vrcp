CREATE TABLE `session_sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`source` text,
	`generation` integer,
	`schema_version` integer,
	`last_sync_time` integer
);
