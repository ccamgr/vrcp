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

  rawData: text("raw_data", { mode: 'json' }).notNull().$type<Avatar>(),

});

export type DBAvatar = typeof avatars.$inferInsert;

export function convertToDBAvatar(avatar: Avatar, favoriteGroupId?: string | null): DBAvatar {
  return {
    id: avatar.id,
    name: avatar.name,
    imageUrl: avatar.imageUrl,
    favoriteGroupId: favoriteGroupId || null,
    rawData: avatar,
  }
}

export function convertFromDBAvatar(dbAvatar: DBAvatar): Avatar {
  return dbAvatar.rawData;
}

