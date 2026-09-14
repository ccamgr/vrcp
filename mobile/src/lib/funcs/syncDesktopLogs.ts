// src/services/logSyncService.ts
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import { extractErrMsg } from "@/lib/utils";
import { logsRepo } from "@/db/repogitories/logs";
import { LogPayload } from "@/generated/desktopapi/type";
import { getDesktopLogPage } from "@/lib/desktopApi";

const LAST_SYNC_KEY = "DESKTOP_LOG_LAST_SYNC_TIME";
const SYNC_OVERLAP_MS = 60 * 1000;
const LOG_PAGE_SIZE = 1000;

export async function syncDesktopLogs(
  desktopUrl: string,
  isFullSync: boolean = false,
  onProgress?: (msg: string) => void
) {
  if (!desktopUrl) {
    throw new Error("Desktop App URL is not configured.");
  }

  onProgress?.("Calculating sync period...");

  try {
    let startTimestamp: number | undefined = undefined;

    if (!isFullSync) {
      const lastSyncTime = await getLastSyncTime() || 0;
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      startTimestamp = Math.max(lastSyncTime - SYNC_OVERLAP_MS, oneWeekAgo);
    }

    onProgress?.("Fetching data from desktop...");

    let cursor: string | undefined;
    let syncedCount = 0;
    let latestSourceTimestamp: number | undefined;
    do {
      const response = await getDesktopLogPage(desktopUrl, {
        start: startTimestamp,
        cursor,
        limit: LOG_PAGE_SIZE,
      });
      const newLogs: LogPayload[] = response.data.logs;
      if (newLogs.length > 0) {
        onProgress?.(`Saving ${syncedCount + newLogs.length} records to local database...`);
        await logsRepo.bulkUpsert(newLogs);
        syncedCount += newLogs.length;
        latestSourceTimestamp = Math.max(
          latestSourceTimestamp ?? Number.MIN_SAFE_INTEGER,
          ...newLogs.map((log) => log.timestamp),
        );
      }
      cursor = response.data.nextCursor ?? undefined;
    } while (cursor);

    if (latestSourceTimestamp !== undefined) {
      await StorageWrapper.setItemAsync(
        LAST_SYNC_KEY,
        latestSourceTimestamp.toString(),
      );
    }
    onProgress?.(`Success! ${syncedCount} logs synced.`);

    return syncedCount;

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
