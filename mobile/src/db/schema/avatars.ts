// https://orm.drizzle.team/docs/column-types/sqlite
import { Avatar } from "@/generated/vrcapi";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const avatarsTable = sqliteTable("avatars", {
  id: text("id").primaryKey(), // ex. avt_c1644b5b-3ca4-45b4-97c6-a2a0de70d469
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").$onUpdateFn(()=>sql`(current_timestamp)`),

  name: text("name"),
  imageUrl: text("image_url"),
  favoriteGroupId: text("favorite_group_id"),
  option: text("option", { mode: 'json' }).$type<{
    [key: string]: any
  }>().notNull().default({}),

  rawData: text("raw_data", { mode: 'json' }).$type<Avatar>(),

});

export function convertToDBAvatar(avatar: Avatar) : DBAvatar {
  return {
    id: avatar.id,
    name: avatar.name,
    imageUrl: avatar.imageUrl,
    favoriteGroupId: null,
    rawData: avatar,
    updatedAt: new Date().toISOString(),
  }
}

export type DBAvatar = typeof avatarsTable.$inferInsert;
