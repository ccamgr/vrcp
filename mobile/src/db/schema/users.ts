// https://orm.drizzle.team/docs/column-types/sqlite
import { User } from "@/generated/vrcapi";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { baseCacheColumns } from "./_baseSchema";

export const users = sqliteTable("users", {
  ...baseCacheColumns,

  displayName: text("display_name"),
  iconUrl: text("icon_url"),
  imageUrl: text("image_url"),
  isFriend: integer("is_friend", { mode: 'boolean' }).default(false),
  favoriteGroupId: text("favorite_group_id"),
  option: text("option", { mode: 'json' }).$type<{
    color?: string,
    localNote?: string,
    [key: string]: any
  }>().notNull().default({}),
  rawData: text("raw_data", { mode: 'json' }).$type<User>(),
});

export function convertToDBUser(user: User): DBUser {
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
  }
}

export type DBUser = typeof users.$inferInsert;
