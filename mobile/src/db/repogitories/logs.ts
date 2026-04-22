import { createBaseRepository } from "./_baseRepo";
import { db } from "../index";
import { convertToDBLog, logs } from "../schema/logs";
import { LogPayload } from "@/generated/desktopapi/type";

export const logsRepo = {
  ...createBaseRepository(db, logs),
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

  /**
   * すべてのログを削除する（フルリセット用）
   */
  deleteAll: async () => {
    await db.delete(logs).execute();
  }
}

