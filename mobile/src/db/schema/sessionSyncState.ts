import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessionSyncState = sqliteTable("session_sync_state", {
  id: integer("id").primaryKey(),
  revision: integer("revision").notNull(),
  source: text("source"),
  generation: integer("generation"),
  schemaVersion: integer("schema_version"),
  lastSyncTime: integer("last_sync_time"),
});
