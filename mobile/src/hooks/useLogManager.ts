import { useState, useCallback } from "react";
import { useSetting } from "@/contexts/SettingContext";
import { syncDesktopLogs, getLastSyncTime } from "@/lib/funcs/syncDesktopLogs";
import { logsRepo } from "@/db/repogitories";
import { LogPayload } from "@/generated/desktopapi/type";

export const useLogManager = () => {
  const { settings } = useSetting();

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");

  // Stats state
  const [logStats, setLogStats] = useState<{ count: number } | null>(null);

  // Measure log count
  const measureLogs = useCallback(async () => {
    try {
      const count = await logsRepo.count();
      setLogStats({ count });
    } catch (error) {
      console.error("Failed to count desktop logs", error);
    }
  }, []);

  // Clear all logs
  const clearLogs = useCallback(async () => {
    try {
      await logsRepo.deleteAll();
      await measureLogs(); // Refresh count after deletion
    } catch (error) {
      console.error("Failed to clear desktop logs", error);
      throw error;
    }
  }, [measureLogs]);

  // Sync logs
  const syncLogs = useCallback(async (isFullSync: boolean = false) => {
    setIsSyncing(true);
    setSyncProgress("Starting sync...");
    console.log("Initiating log sync with desktop app...");

    try {
      await syncDesktopLogs(
        settings.otherOptions_desktopAppURL || "",
        isFullSync,
        setSyncProgress
      );

      // Auto-refresh count after successful sync
      await measureLogs();
    } catch (error) {
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [settings.otherOptions_desktopAppURL, measureLogs]);

  const getLocalLogs = useCallback(async (startMs: number, endMs: number): Promise<LogPayload[]> => {
    try {
      return await logsRepo.getLogsByRange(startMs, endMs);
    } catch (error) {
      console.error("Failed to fetch local logs by range", error);
      return [];
    }
  }, []);

  const getLastSync = useCallback(async (): Promise<number | null> => {
    try {
      return await getLastSyncTime();
    } catch (error) {
      console.error("Failed to get last sync time", error);
      return null;
    }
  }, []);

  return {
    isSyncing,
    syncProgress,
    syncLogs,
    getLocalLogs,
    logStats,
    measureLogs,
    clearLogs,
    getLastSync
  };
};
