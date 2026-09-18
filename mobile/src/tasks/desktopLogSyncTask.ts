// src/tasks/desktopLogSyncTask.ts
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { db } from "@/db";
import migrations from "@/db/migration/migrations";
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import { syncDesktopLogs } from "@/lib/funcs/syncDesktopLogs";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

export const DESKTOP_LOG_SYNC_TASK_NAME = "BACKGROUND_DESKTOP_LOG_SYNC_TASK";

TaskManager.defineTask(DESKTOP_LOG_SYNC_TASK_NAME, async () => {
  const now = new Date();
  console.log(`[Desktop Log Sync Task] Executed at: ${now.toISOString()}`);

  try {
    await migrate(db, migrations);

    // Retrieve the desktop app URL from storage directly
    const storedDesktopUrl = await StorageWrapper.getItemAsync(
      "otherOptions_desktopAppURL",
    );
    const desktopUrl = storedDesktopUrl ? JSON.parse(storedDesktopUrl) : null;

    if (typeof desktopUrl !== "string" || !desktopUrl) {
      console.log(
        "[Desktop Log Sync Task] Desktop URL not configured. Skipping sync.",
      );
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    console.log("[Desktop Log Sync Task] Starting sync...");

    // Execute the core sync logic (Delta sync: false)
    const syncedCount = await syncDesktopLogs(desktopUrl, false);

    console.log(
      `[Desktop Log Sync Task] Successfully synced ${syncedCount} logs.`,
    );

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error(`[Desktop Log Sync Task] Error:`, error);
    // Return Success even on error to prevent OS-level retry storms
    return BackgroundTask.BackgroundTaskResult.Success;
  }
});
