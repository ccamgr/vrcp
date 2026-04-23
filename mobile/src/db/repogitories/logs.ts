import { createBaseRepo } from "./_baseRepo";
import { db } from "../index";
import { convertFromDBLog, convertToDBLog, logs } from "../schema/logs";
import { LogPayload } from "@/generated/desktopapi/type";
import { and, asc, gte, lt, lte, sql } from "drizzle-orm";

export const logsRepo = {
  // 大量のログを一括で挿入する（アップサート）
  bulkUpsert: async (newLogs: LogPayload[]) => {
    if (!newLogs || newLogs.length === 0) return;

    // SQLiteの制限回避のため、1度にインサートする件数を絞る（ログのカラム数×チャンクサイズ < 上限）
    const CHUNK_SIZE = 100;

    await db.transaction(async (tx) => {
      for (let i = 0; i < newLogs.length; i += CHUNK_SIZE) {
        const chunk = newLogs.slice(i, i + CHUNK_SIZE).map(convertToDBLog);

        await tx.insert(logs)
          .values(chunk)
          .onConflictDoNothing() // IDが既に存在する場合はスキップ（アップサートなら onConflictDoUpdate）
          .execute();
      }
    });
  },

  // 指定した時間範囲のログを取得する
  getLogsByRange: async (startMs: number, endMs: number) => {
    const dblogs = await db.select().from(logs).where(
      and(
        gte(logs.timestamp, startMs),
        lte(logs.timestamp, endMs)
      )
    ).orderBy(asc(logs.timestamp)).execute();
    return dblogs.map(convertFromDBLog);
  },

  //すべてのログを削除する（フルリセット用）
  deleteAll: async () => {
    await db.delete(logs).execute();
  },

  // 古いログを削除する（例: 30日以上前のログ）
  deleteBefore: async (timestamp: number) => {
    await db.delete(logs).where(lt(logs.timestamp, timestamp)).execute();
  },

  // ログの総数を取得する
  count: async (): Promise<number> => {
    const result = await db.select({ count: sql<number>`count(*)` }).from(logs);
    return result[0].count;
  },
};

