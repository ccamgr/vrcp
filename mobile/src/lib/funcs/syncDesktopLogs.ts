// src/services/logSyncService.ts
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import { extractErrMsg } from "@/lib/utils";
import { getLogsFromDesktop } from "@/generated/desktopapi/client";
import { logsRepo } from "@/db/repogitories/logs";

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
      const lastSyncStr = await StorageWrapper.getItemAsync(LAST_SYNC_KEY);
      const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      startTimestamp = Math.max(lastSyncTime, oneWeekAgo);
    }

    onProgress?.("Fetching data from desktop...");

    const response = await getLogsFromDesktop(desktopUrl, {
      start: startTimestamp
    });

    const newLogs = Array.isArray(response.data) ? response.data : (response.data as any).logs;

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
