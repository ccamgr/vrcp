import { SettingKey } from '@/contexts/SettingContext';
import StorageWrapper from '@/lib/wrappers/storageWrapper';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

// app.json の BGTaskSchedulerPermittedIdentifiers に登録した名前と一致させる
export const TASK_NAME = 'BACKGROUND_FETCH_TASK';

// タスクの定義
TaskManager.defineTask(TASK_NAME, async () => {
  const now = new Date();
  console.log(`[Background Task] 実行: ${now.toISOString()}`);

  try {
    // ここにAPIリクエストなどの処理を書く
    const key: SettingKey = 'otherOptions_desktopAppURL';
    const reqUrl = await StorageWrapper.getItemAsync(key);

    if (reqUrl) {
      console.log(`[Background Task] 設定されたURL: ${reqUrl}`);
    }

    // 成功時
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error(error);
    // 失敗時
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// 登録関数
export async function registerBackgroundTaskAsync() {
  return BackgroundTask.registerTaskAsync(TASK_NAME, {
    minimumInterval: 60 * 60 * 3, // 3時間 (秒)
  });
}

export async function unregisterBackgroundTaskAsync() {
  return BackgroundTask.unregisterTaskAsync(TASK_NAME);
}
