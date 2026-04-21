CREATE TABLE `avatars` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`expires_at` integer,
	`name` text,
	`image_url` text,
	`favorite_group_id` text,
	`option` text DEFAULT '{}' NOT NULL,
	`raw_data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`expires_at` integer,
	`name` text,
	`image_url` text,
	`is_joined` integer DEFAULT false,
	`option` text DEFAULT '{}' NOT NULL,
	`raw_data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`expires_at` integer,
	`display_name` text,
	`icon_url` text,
	`image_url` text,
	`is_friend` integer DEFAULT false,
	`favorite_group_id` text,
	`option` text DEFAULT '{}' NOT NULL,
	`raw_data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worlds` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`expires_at` integer,
	`name` text,
	`image_url` text,
	`favorite_group_id` text,
	`option` text DEFAULT '{}' NOT NULL,
	`raw_data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hash` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`event_type` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `logs_hash_unique` ON `logs` (`hash`);