import * as BackgroundTask from 'expo-background-task';
import { TASK_NAME as TASK_NOTIFICATION } from './notificationsTask';

export async function registerBackgroundTaskAsync() {
  try {
    BackgroundTask.registerTaskAsync(TASK_NOTIFICATION, {
      minimumInterval: 60 * 15, // 15 minutes
    });
    console.log('Background task registered successfully');
  } catch (err) {
    console.error('Failed to register background task:', err);
  }

}

export async function unregisterBackgroundTaskAsync() {
  try {
    await BackgroundTask.unregisterTaskAsync(TASK_NOTIFICATION);
    console.log('Background task unregistered successfully');
  } catch (err) {
    console.error('Failed to unregister background task:', err);
  }
}
