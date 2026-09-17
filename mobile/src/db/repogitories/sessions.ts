import { and, asc, gte, lte } from "drizzle-orm";
import { db } from "../index";
import { sessions, StoredSession } from "../schema/sessions";

export const sessionsRepo = {
  async bulkUpsert(items: StoredSession[]) {
    if (items.length === 0) return;
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.insert(sessions).values({
          sourceKey: item.sourceId,
          worldName: item.worldName,
          location: item.location,
          startTime: item.startTime,
          endTime: item.endTime,
          durationMs: item.durationMs,
          username: item.username,
          players: item.players,
        }).onConflictDoUpdate({
          target: sessions.sourceKey,
          set: {
            worldName: item.worldName,
            endTime: item.endTime,
            durationMs: item.durationMs,
            username: item.username,
            players: item.players,
          },
        });
      }
    });
  },

  async getByRange(startTime: number, endTime: number): Promise<StoredSession[]> {
    const rows = await db.select().from(sessions).where(and(
      lte(sessions.startTime, endTime),
      gte(sessions.endTime, startTime),
    )).orderBy(asc(sessions.startTime), asc(sessions.id));
    return rows.map(({ id: _id, sourceKey, ...session }) => ({
      ...session,
      sourceId: sourceKey,
    }));
  },

  async deleteAll() {
    await db.delete(sessions);
  },

  async replaceRange(items: StoredSession[], startTime: number, endTime: number) {
    await db.transaction(async (tx) => {
      await tx.delete(sessions).where(and(
        lte(sessions.startTime, endTime),
        gte(sessions.endTime, startTime),
      ));
      for (const item of items) {
        await tx.insert(sessions).values({
          sourceKey: item.sourceId,
          worldName: item.worldName,
          location: item.location,
          startTime: item.startTime,
          endTime: item.endTime,
          durationMs: item.durationMs,
          username: item.username,
          players: item.players,
        }).onConflictDoUpdate({
          target: sessions.sourceKey,
          set: {
            worldName: item.worldName,
            location: item.location,
            startTime: item.startTime,
            endTime: item.endTime,
            durationMs: item.durationMs,
            username: item.username,
            players: item.players,
          },
        });
      }
    });
  },

  async replaceAll(items: StoredSession[]) {
    await db.transaction(async (tx) => {
      await tx.delete(sessions);
      for (const item of items) {
        await tx.insert(sessions).values({
          sourceKey: item.sourceId,
          worldName: item.worldName,
          location: item.location,
          startTime: item.startTime,
          endTime: item.endTime,
          durationMs: item.durationMs,
          username: item.username,
          players: item.players,
        });
      }
    });
  },

  async count(): Promise<number> {
    const rows = await db.select().from(sessions);
    return rows.length;
  },
};
