import { useState, useCallback, useRef } from "react";
import { useSetting } from "@/contexts/SettingContext";
import {
  clearLastSyncTime,
  getLastSyncTime,
  syncDesktopLogs,
} from "@/lib/funcs/syncDesktopLogs";
import { sessionsRepo } from "@/db/repogitories";
import { StoredSession } from "@/db/schema/sessions";
import * as Network from 'expo-network';

export const useLogManager = () => {
  const { settings } = useSetting();

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");
  const syncInFlightRef = useRef(false);

  // Stats state
  const [logStats, setLogStats] = useState<{ count: number } | null>(null);

  // Measure log count
  const measureLogs = useCallback(async () => {
    try {
      const count = await sessionsRepo.count();
      setLogStats({ count });
    } catch (error) {
      console.error("Failed to count desktop logs", error);
    }
  }, []);

  // Clear all logs
  const clearLogs = useCallback(async () => {
    try {
      await clearLastSyncTime();
      await sessionsRepo.deleteAll();
      await measureLogs(); // Refresh count after deletion
    } catch (error) {
      console.error("Failed to clear desktop logs", error);
      throw error;
    }
  }, [measureLogs]);

  // Sync logs
  const syncLogs = useCallback(async (isFullSync: boolean = false) => {
    if (syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    setIsSyncing(true);
    setSyncProgress("Starting sync...");
    console.log("Initiating log sync with desktop app...");

    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setSyncProgress("No network connection. Please connect to the internet and try again.");
        return;
      }

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
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [settings.otherOptions_desktopAppURL, measureLogs]);

  const getLocalSessions = useCallback(async (startMs: number, endMs: number): Promise<StoredSession[]> => {
    try {
      return await sessionsRepo.getByRange(startMs, endMs);
    } catch (error) {
      console.error("Failed to fetch local sessions by range", error);
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
    getLocalSessions,
    logStats,
    measureLogs,
    clearLogs,
    getLastSync
  };
};
