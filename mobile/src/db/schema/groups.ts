// https://orm.drizzle.team/docs/column-types/sqlite
import { Group } from "@/generated/api";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const groupsTable = sqliteTable("groups", {
  id: text("id").primaryKey(), // ex. grp_c1644b5b-3ca4-45b4-97c6-a2a0de70d469
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").$onUpdateFn(()=>sql`(current_timestamp)`),

  name: text("name"),
  imageUrl: text("image_url"),
  isJoined: integer("is_joined", { mode: 'boolean' }).default(false),
  option: text("option", { mode: 'json' }).$type<{
    [key: string]: any
  }>().notNull().default({}),
  rawData: text("raw_data", { mode: 'json' }).$type<Group>(),
});

export type DBGroup = typeof groupsTable.$inferInsert;
