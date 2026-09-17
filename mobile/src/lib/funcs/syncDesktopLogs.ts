// src/services/logSyncService.ts
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import { extractErrMsg } from "@/lib/utils";
import { sessionsRepo } from "@/db/repogitories/sessions";
import { StoredSession } from "@/db/schema/sessions";
import { getDesktopSessions } from "@/lib/desktopApi";

const LAST_SYNC_KEY = "DESKTOP_LOG_LAST_SYNC_TIME";
const SESSION_GENERATION_KEY = "DESKTOP_SESSION_GENERATION";
const SESSION_SOURCE_KEY = "DESKTOP_SESSION_SOURCE";
const SYNC_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_PAGE_SIZE = 200;

export async function syncDesktopLogs(
  desktopUrl: string,
  isFullSync: boolean = false,
  onProgress?: (msg: string) => void,
  retryCount: number = 0,
) {
  if (!desktopUrl) {
    throw new Error("Desktop App URL is not configured.");
  }

  onProgress?.("Calculating sync period...");

  try {
    const startTimestamp = isFullSync ? undefined : Date.now() - SYNC_LOOKBACK_MS;
    const [savedGeneration, savedSource] = await StorageWrapper.multiGet([
      SESSION_GENERATION_KEY,
      SESSION_SOURCE_KEY,
    ]);

    onProgress?.("Fetching data from desktop...");

    let cursor: string | undefined;
    let generation: number | undefined;
    let source: string | undefined;
    const items: StoredSession[] = [];
    const cursors = new Set<string>();
    do {
      const response = await getDesktopSessions(desktopUrl, {
        start: startTimestamp,
        cursor,
        limit: SESSION_PAGE_SIZE,
      });
      if (generation !== undefined && generation !== response.data.generation) {
        if (retryCount >= 2) throw new Error("Desktop session data changed during synchronization.");
        return syncDesktopLogs(desktopUrl, true, onProgress, retryCount + 1);
      }
      const pageSource = response.data.source;
      if (source !== undefined && source !== pageSource) {
        if (retryCount >= 2) throw new Error("Desktop source changed during synchronization.");
        return syncDesktopLogs(desktopUrl, true, onProgress, retryCount + 1);
      }
      generation = response.data.generation;
      source = pageSource;
      items.push(...response.data.sessions.map((session) => ({
        sourceId: `${pageSource}:${generation}:${session.sourceId}`,
        worldName: session.worldName,
        location: session.instanceId,
        startTime: session.startTime,
        endTime: session.endTime,
        durationMs: session.durationMs,
        username: session.username,
        players: session.players,
      })));
      cursor = response.data.nextCursor ?? undefined;
      if (cursor && (cursors.has(cursor) || cursors.size >= 10_000)) {
        throw new Error("Desktop returned an invalid session page cursor.");
      }
      if (cursor) cursors.add(cursor);
    } while (cursor);
    const mustReplaceAll = isFullSync
      || savedSource[1] !== source
      || (savedGeneration[1] !== null && savedGeneration[1] !== String(generation));
    if (mustReplaceAll && !isFullSync) {
      return syncDesktopLogs(desktopUrl, true, onProgress);
    }
    onProgress?.(`Saving ${items.length} sessions to local database...`);
    if (mustReplaceAll) {
      await sessionsRepo.replaceAll(items);
    } else {
      await sessionsRepo.replaceRange(items, startTimestamp!, Date.now());
    }
    await StorageWrapper.multiSet([
      [LAST_SYNC_KEY, Date.now().toString()],
      [SESSION_GENERATION_KEY, String(generation)],
      [SESSION_SOURCE_KEY, source],
    ]);
    onProgress?.(`Success! ${items.length} sessions synced.`);
    return items.length;

  } catch (error) {
    console.error("Log sync error:", error);
    throw new Error(extractErrMsg(error) || "Failed to sync logs");
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  const value = await StorageWrapper.getItemAsync(LAST_SYNC_KEY);
  if (value) {
    const timestamp = parseInt(value, 10);
    return isNaN(timestamp) ? null : timestamp;
  }
  return null;
}

export async function clearLastSyncTime(): Promise<void> {
  await StorageWrapper.removeItemAsync(LAST_SYNC_KEY);
}
