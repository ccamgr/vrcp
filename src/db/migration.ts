export const migrations = {
  '0000_legal_power_pack.sql': {
    version: 0,
    sql: `CREATE TABLE \`users\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`display_name\` text,
	\`icon_url\` text,
	\`picture_url\` text,
	\`is_friend\` integer DEFAULT false,
	\`favorite_group_id\` text,
	\`option\` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`worlds\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`name\` text,
	\`picture_url\` text,
	\`favorite_group_id\` text,
	\`option\` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`groups\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`name\` text,
	\`picture_url\` text,
	\`is_joined\` integer DEFAULT false,
	\`option\` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`avatars\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`name\` text,
	\`picture_url\` text,
	\`favorite_group_id\` text,
	\`option\` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`favorite_groups\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`name\` text DEFAULT '' NOT NULL,
	\`display_name\` text,
	\`type\` text,
	\`option\` text DEFAULT '{}' NOT NULL
);
`
  },
};