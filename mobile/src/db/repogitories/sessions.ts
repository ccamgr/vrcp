import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "../index";
import { sessionSyncState } from "../schema/sessionSyncState";
import { sessions, StoredSession } from "../schema/sessions";

const SESSION_SYNC_STATE_ID = 1;

export interface SessionSyncSnapshot {
  revision: number;
  source: string | null;
  generation: number | null;
  schemaVersion: number | null;
  lastSyncTime: number | null;
}

export interface SessionSyncWrite {
  expectedRevision: number;
  source: string;
  generation: number;
  schemaVersion: number;
  lastSyncTime: number;
  items: StoredSession[];
  range: { start: number; end: number } | null;
}

export type SessionSyncWriteResult = "saved" | "stale" | "requires-full";

const emptySyncSnapshot = (): SessionSyncSnapshot => ({
  revision: 0,
  source: null,
  generation: null,
  schemaVersion: null,
  lastSyncTime: null,
});

const toStoredSession = (item: StoredSession) => ({
  sourceKey: item.sourceId,
  worldName: item.worldName,
  location: item.location,
  startTime: item.startTime,
  endTime: item.endTime,
  durationMs: item.durationMs,
  username: item.username,
  players: item.players,
});

const syncSnapshotFromRow = (
  row: typeof sessionSyncState.$inferSelect | undefined,
): SessionSyncSnapshot => row ?? emptySyncSnapshot();

export const sessionsRepo = {
  async bulkUpsert(items: StoredSession[]) {
    if (items.length === 0) return;
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .insert(sessions)
          .values(toStoredSession(item))
          .onConflictDoUpdate({
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

  async getByRange(
    startTime: number,
    endTime: number,
  ): Promise<StoredSession[]> {
    const rows = await db
      .select()
      .from(sessions)
      .where(
        and(lte(sessions.startTime, endTime), gte(sessions.endTime, startTime)),
      )
      .orderBy(asc(sessions.startTime), asc(sessions.id));
    return rows.map(({ id: _id, sourceKey, ...session }) => ({
      ...session,
      sourceId: sourceKey,
    }));
  },

  async getSyncSnapshot(): Promise<SessionSyncSnapshot> {
    const row = await db
      .select()
      .from(sessionSyncState)
      .where(eq(sessionSyncState.id, SESSION_SYNC_STATE_ID))
      .get();
    return syncSnapshotFromRow(row);
  },

  async applySync(write: SessionSyncWrite): Promise<SessionSyncWriteResult> {
    return db.transaction(
      async (tx) => {
        const row = await tx
          .select()
          .from(sessionSyncState)
          .where(eq(sessionSyncState.id, SESSION_SYNC_STATE_ID))
          .get();
        const current = syncSnapshotFromRow(row);
        if (current.revision !== write.expectedRevision) return "stale";

        const requiresFull =
          current.source !== write.source ||
          current.generation !== write.generation ||
          current.schemaVersion !== write.schemaVersion;
        if (requiresFull && write.range !== null) return "requires-full";

        if (write.range === null) {
          await tx.delete(sessions);
        } else {
          await tx
            .delete(sessions)
            .where(
              and(
                lte(sessions.startTime, write.range.end),
                gte(sessions.endTime, write.range.start),
              ),
            );
        }

        for (const item of write.items) {
          await tx
            .insert(sessions)
            .values(toStoredSession(item))
            .onConflictDoUpdate({
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

        await tx
          .insert(sessionSyncState)
          .values({
            id: SESSION_SYNC_STATE_ID,
            revision: current.revision + 1,
            source: write.source,
            generation: write.generation,
            schemaVersion: write.schemaVersion,
            lastSyncTime: write.lastSyncTime,
          })
          .onConflictDoUpdate({
            target: sessionSyncState.id,
            set: {
              revision: current.revision + 1,
              source: write.source,
              generation: write.generation,
              schemaVersion: write.schemaVersion,
              lastSyncTime: write.lastSyncTime,
            },
          });
        return "saved";
      },
      { behavior: "immediate" },
    );
  },

  async clearAllAndResetSyncState(): Promise<void> {
    await db.transaction(
      async (tx) => {
        const row = await tx
          .select()
          .from(sessionSyncState)
          .where(eq(sessionSyncState.id, SESSION_SYNC_STATE_ID))
          .get();
        const current = syncSnapshotFromRow(row);
        await tx.delete(sessions);
        await tx
          .insert(sessionSyncState)
          .values({
            id: SESSION_SYNC_STATE_ID,
            revision: current.revision + 1,
            source: null,
            generation: null,
            schemaVersion: null,
            lastSyncTime: null,
          })
          .onConflictDoUpdate({
            target: sessionSyncState.id,
            set: {
              revision: current.revision + 1,
              source: null,
              generation: null,
              schemaVersion: null,
              lastSyncTime: null,
            },
          });
      },
      { behavior: "immediate" },
    );
  },

  async count(): Promise<number> {
    const rows = await db.select().from(sessions);
    return rows.length;
  },
};
