// https://orm.drizzle.team/docs/column-types/sqlite
import { User } from "@/generated/vrcapi";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(), // ex. usr_c1644b5b-3ca4-45b4-97c6-a2a0de70d469, legacy, 8JoV9XEdpo
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").$onUpdateFn(()=>sql`(current_timestamp)`),

  displayName: text("display_name"),
  iconUrl: text("icon_url"),
  imageUrl: text("image_url"),
  isFriend: integer("is_friend", { mode: 'boolean' }).default(false),
  favoriteGroupId: text("favorite_group_id"),
  option: text("option", { mode: 'json' }).$type<{
    color?: string,
    localNote?:string,
    [key: string]: any
   }>().notNull().default({}),
  rawData: text("raw_data", { mode: 'json' }).$type<User>(),
});

export function convertToDBUser(user: User) : DBUser {
  return {
    id: user.id,
    displayName: user.displayName,
    iconUrl: (user.userIcon && user.userIcon.length > 0) ? user.userIcon
    : (user.profilePicOverride && user.profilePicOverride.length > 0) ? user.profilePicOverride
    : user.currentAvatarImageUrl,
    imageUrl: (user.profilePicOverride && user.profilePicOverride.length > 0) ? user.profilePicOverride
    : user.currentAvatarImageUrl,
    isFriend: user.isFriend || false,
    favoriteGroupId: null,
    rawData: user,
    updatedAt: new Date().toISOString(),
  }
}

export type DBUser = typeof usersTable.$inferInsert;