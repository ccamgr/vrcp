import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export interface SessionInterval {
  start: number;
  end: number;
}

export interface SessionPlayer {
  name: string;
  intervals: SessionInterval[];
  totalDurationMs: number;
}

export interface StoredSession {
  sourceId: string;
  worldName: string;
  location: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  username: string | null;
  players: SessionPlayer[];
}

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceKey: text("source_key").notNull().unique(),
  worldName: text("world_name").notNull(),
  location: text("location").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  durationMs: integer("duration_ms").notNull(),
  username: text("username"),
  players: text("players", { mode: "json" }).$type<SessionPlayer[]>().notNull(),
});
