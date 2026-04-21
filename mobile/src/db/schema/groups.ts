// https://orm.drizzle.team/docs/column-types/sqlite
import { Group } from "@/generated/vrcapi";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { baseCacheColumns } from "./_baseSchema";

export const groups = sqliteTable("groups", {
  ...baseCacheColumns,

  name: text("name"),
  imageUrl: text("image_url"),
  isJoined: integer("is_joined", { mode: 'boolean' }).default(false),
  option: text("option", { mode: 'json' }).$type<{
    [key: string]: any
  }>().notNull().default({}),
  rawData: text("raw_data", { mode: 'json' }).$type<Group>(),
});

export type DBGroup = typeof groups.$inferInsert;
