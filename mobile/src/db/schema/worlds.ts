// https://orm.drizzle.team/docs/column-types/sqlite
import { World } from "@/generated/vrcapi";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { baseCacheColumns } from "./_baseSchema";

export const worlds = sqliteTable("worlds", {
  ...baseCacheColumns,

  name: text("name"),
  imageUrl: text("image_url"),
  favoriteGroupId: text("favorite_group_id"),
  option: text("option", { mode: 'json' }).$type<{
    [key: string]: any
  }>().notNull().default({}),
  rawData: text("raw_data", { mode: 'json' }).$type<World>(),
});

export function convertToDBWorld(world: World): DBWorld {
  return {
    id: world.id,
    name: world.name,
    imageUrl: world.imageUrl,
    favoriteGroupId: null,
    rawData: world,
  }
}

export type DBWorld = typeof worlds.$inferInsert;

