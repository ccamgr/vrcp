// https://orm.drizzle.team/docs/column-types/sqlite
import { Avatar } from "@/generated/vrcapi";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { baseCacheColumns } from "./_baseSchema";

export const avatars = sqliteTable("avatars", {
  ...baseCacheColumns,

  name: text("name"),
  imageUrl: text("image_url"),
  favoriteGroupId: text("favorite_group_id"),
  option: text("option", { mode: 'json' }).$type<{
    [key: string]: any
  }>().notNull().default({}),

  rawData: text("raw_data", { mode: 'json' }).$type<Avatar>(),

});

export function convertToDBAvatar(avatar: Avatar): DBAvatar {
  return {
    id: avatar.id,
    name: avatar.name,
    imageUrl: avatar.imageUrl,
    favoriteGroupId: null,
    rawData: avatar,
  }
}

export type DBAvatar = typeof avatars.$inferInsert;
