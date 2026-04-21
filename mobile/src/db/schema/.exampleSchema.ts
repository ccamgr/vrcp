// https://orm.drizzle.team/docs/column-types/sqlite
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { baseColumns, baseCacheColumns } from "./_baseSchema";

export const examples = sqliteTable("examples", {
  // 共通カラム
  // ...baseColumns,
  ...baseCacheColumns,
  // 各テーブルで必要に応じて定義するカラム
  sampleInt: integer("sample_int"),
  sampleFloat: real("sample_float"),
  sampleText: text("sample_text"),
  sampleBool: integer("sample_bool", { mode: 'boolean' }).default(false),
  sampleEnum: text("sample_enum", { enum: ["value1", "value2", "value3"] }),
  sampleJson: text("sample_json", { mode: 'json' }).$type<{ id: number, label?: string, value?: string }>().notNull().default({ id: 0 }), //  array of json

});

export type DBExample = typeof examples.$inferSelect;
