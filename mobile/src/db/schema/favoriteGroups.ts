// https://orm.drizzle.team/docs/column-types/sqlite
import { FavoriteGroup } from "@/generated/api";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const favoriteGroupsTable = sqliteTable("favorite_groups", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").$onUpdateFn(()=>sql`(current_timestamp)`),

  name: text("name").notNull().default(""),
  displayName: text("display_name"),
  type: text("type", { enum: ["friend", "world", "avatar"] }),


  option: text("option", { mode: 'json' }).$type<{
    color?: string,
    [key: string]: any
  }>().notNull().default({}),
  rawData: text("raw_data", { mode: 'json' }).$type<FavoriteGroup>(),
});

export function convertToDBFavoriteGroup(favoriteGroup: FavoriteGroup) : DBFavoriteGroup {
  return {
    id: favoriteGroup.id,
    name: favoriteGroup.name,
    displayName: favoriteGroup.displayName,
    type: favoriteGroup.type,
    rawData: favoriteGroup,
    updatedAt: new Date().toISOString(),
  }
}

export type DBFavoriteGroup = typeof favoriteGroupsTable.$inferInsert;
