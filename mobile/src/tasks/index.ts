import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { VRCHAT_NOTIFICATION_TASK_NAME } from './notificationsTask';
import { DESKTOP_LOG_SYNC_TASK_NAME } from './desktopLogSyncTask';

export async function registerBackgroundTaskAsync() {
  try {
    await TaskManager.unregisterAllTasksAsync().catch(err => {
      console.error('Failed to unregister existing tasks:', err);
    });
    BackgroundTask.registerTaskAsync(VRCHAT_NOTIFICATION_TASK_NAME, {
      minimumInterval: 60 * 15, // 15 minutes
    });
    BackgroundTask.registerTaskAsync(DESKTOP_LOG_SYNC_TASK_NAME, {
      minimumInterval: 60 * 60, // 1 hour
    });
    console.log('Background tasks registered successfully');
  } catch (err) {
    console.error('Failed to register background task:', err);
  }

}

export async function unregisterBackgroundTaskAsync() {
  try {
    await BackgroundTask.unregisterTaskAsync(VRCHAT_NOTIFICATION_TASK_NAME);
    await BackgroundTask.unregisterTaskAsync(DESKTOP_LOG_SYNC_TASK_NAME);
    console.log('Background tasks unregistered successfully');
  } catch (err) {
    console.error('Failed to unregister background task:', err);
  }
}
