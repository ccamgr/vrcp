// https://orm.drizzle.team/docs/column-types/sqlite
import { FavoriteGroup } from "@/generated/vrcapi";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { baseCacheColumns } from "./_baseSchema";

export const favoriteGroups = sqliteTable("favorite_groups", {
  ...baseCacheColumns,

  name: text("name").notNull().default(""),
  displayName: text("display_name"),
  type: text("type", { enum: ["friend", "world", "avatar"] }),


  option: text("option", { mode: 'json' }).$type<{
    color?: string,
    [key: string]: any
  }>().notNull().default({}),
  rawData: text("raw_data", { mode: 'json' }).$type<FavoriteGroup>(),
});

export function convertToDBFavoriteGroup(favoriteGroup: FavoriteGroup): DBFavoriteGroup {
  return {
    id: favoriteGroup.id,
    name: favoriteGroup.name,
    displayName: favoriteGroup.displayName,
    type: favoriteGroup.type,
    rawData: favoriteGroup,
  }
}

export type DBFavoriteGroup = typeof favoriteGroups.$inferInsert;
