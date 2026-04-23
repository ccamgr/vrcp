// src/services/logSyncService.ts
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import { extractErrMsg } from "@/lib/utils";
import { getLogsFromDesktop } from "@/generated/desktopapi/client";
import { logsRepo } from "@/db/repogitories/logs";
import { LogPayload } from "@/generated/desktopapi/type";

const LAST_SYNC_KEY = "DESKTOP_LOG_LAST_SYNC_TIME";

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
      startTimestamp = Math.max(lastSyncTime, oneWeekAgo);
    }

    onProgress?.("Fetching data from desktop...");

    const response = await getLogsFromDesktop(desktopUrl, {
      start: startTimestamp
    });

    const newLogs: LogPayload[] = response.data;

    if (newLogs && newLogs.length > 0) {
      onProgress?.(`Saving ${newLogs.length} records to local database...`);
      await logsRepo.bulkUpsert(newLogs);
    }

    await StorageWrapper.setItemAsync(LAST_SYNC_KEY, Date.now().toString());
    onProgress?.(`Success! ${newLogs?.length || 0} logs synced.`);

    return newLogs?.length || 0; // 同期した件数を返す

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
