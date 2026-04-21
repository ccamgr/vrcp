// https://orm.drizzle.team/docs/column-types/sqlite
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";


// uuidが主キーのテーブルで共通して使うカラム定義
export const baseColumns = {
  id: text("id").primaryKey(), // ex. usr_c1644b5b-3ca4-45b4-97c6-a2a0de70d469
  createdAt: integer("created_at").notNull().$defaultFn(Date.now),
  updatedAt: integer("updated_at").$onUpdateFn(Date.now),
};

// キャッシュ用のテーブルで共通して使うカラム定義
export const baseCacheColumns = {
  ...baseColumns,
  expiresAt: integer("expires_at").notNull(), // データの有効期限をunix timestampで管理
};
