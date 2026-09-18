import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// This table is retained in the Drizzle schema until every supported upgrade path migrates it at app startup.
export const legacyLogs = sqliteTable("logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hash: integer("hash").notNull().unique(),
  timestamp: integer("timestamp").notNull(),
  eventType: text("event_type").notNull(),
  data: text("data").notNull(),
});
