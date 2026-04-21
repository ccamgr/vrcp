export const migrations = {
  '0000_cool_mulholland_black.sql': {
    version: 0,
    sql: [
      `CREATE TABLE \`users\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`display_name\` text,
	\`icon_url\` text,
	\`image_url\` text,
	\`is_friend\` integer DEFAULT false,
	\`favorite_group_id\` text,
	\`option\` text DEFAULT '{}' NOT NULL,
	\`raw_data\` text
);`,
      `CREATE TABLE \`worlds\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`name\` text,
	\`image_url\` text,
	\`favorite_group_id\` text,
	\`option\` text DEFAULT '{}' NOT NULL,
	\`raw_data\` text
);`,
      `CREATE TABLE \`groups\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`name\` text,
	\`image_url\` text,
	\`is_joined\` integer DEFAULT false,
	\`option\` text DEFAULT '{}' NOT NULL,
	\`raw_data\` text
);`,
      `CREATE TABLE \`avatars\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`name\` text,
	\`image_url\` text,
	\`favorite_group_id\` text,
	\`option\` text DEFAULT '{}' NOT NULL,
	\`raw_data\` text
);`,
      `CREATE TABLE \`favorite_groups\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`created_at\` text DEFAULT (current_timestamp) NOT NULL,
	\`updated_at\` text,
	\`name\` text DEFAULT '' NOT NULL,
	\`display_name\` text,
	\`type\` text,
	\`option\` text DEFAULT '{}' NOT NULL,
	\`raw_data\` text
);`
    ]
  },
  '0001_marvelous_black_panther.sql': {
    version: 1,
    sql: [
      `CREATE TABLE \`logs\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`hash\` integer NOT NULL,
	\`timestamp\` integer NOT NULL,
	\`event_type\` text NOT NULL,
	\`data\` text NOT NULL
);`,
      `CREATE UNIQUE INDEX \`logs_hash_unique\` ON \`logs\` (\`hash\`);`
    ]
  },
};