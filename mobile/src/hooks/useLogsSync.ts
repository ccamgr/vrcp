import { useState, useCallback } from "react";
import { useSetting } from "@/contexts/SettingContext";
import { syncDesktopLogs } from "@/lib/funcs/syncDesktopLogs";

export const useLogSync = () => {
  const { settings } = useSetting();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");

  const syncLogs = useCallback(async (isFullSync: boolean = false) => {
    setIsSyncing(true);
    setSyncProgress("Starting sync...");

    try {
      // コアロジックを呼び出す
      await syncDesktopLogs(
        settings.otherOptions_desktopAppURL || "",
        isFullSync,
        setSyncProgress // コールバックで文字列を受け取って State を更新
      );
    } catch (error) {
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [settings.otherOptions_desktopAppURL]);

  return { isSyncing, syncProgress, syncLogs };
};
