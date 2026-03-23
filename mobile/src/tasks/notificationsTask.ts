import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import StorageWrapper from '@/lib/wrappers/storageWrapper';
import * as SecureStore from "expo-secure-store";
import { Configuration, Notification, NotificationsApi, OrderOption, SortOption } from '@/generated/vrcapi';
import { getUserAgent } from '@/lib/utils';
import { extractNotificationContent } from '@/lib/funcs/extractNotificationContent';

// Must match the identifier registered in app.json (if required)
export const TASK_NAME = 'BACKGROUND_VRCHAT_NOTIFICATION_TASK';
const LAST_CHECKED_KEY = '@vrcp_last_notification_checked';


// Define the background task
TaskManager.defineTask(TASK_NAME, async () => {
  const now = new Date();
  console.log(`[Background Task] Executed at: ${now.toISOString()}`);

  try {
    /** Fetch user credentials from secure storage and Configure API   */
    const secret = await Promise.all([
      SecureStore.getItemAsync("auth_secret_username"),
      SecureStore.getItemAsync("auth_secret_password"),
    ]);
    if (!secret[0] || !secret[1]) {
      console.log("No secret found for auto login");
      return BackgroundTask.BackgroundTaskResult.Success; // No credentials, can't check notifications, but task itself succeeded
    }
    const conf = new Configuration({
      // basePath: BASE_API_URL, // default
      username: secret[0] || undefined,
      password: secret[1] || undefined,
      baseOptions: {
        headers: { "User-Agent": getUserAgent() },
      },
    });
    const api = new NotificationsApi(conf);
    /** get notifications */
    const responses = await api.getNotifications({
      type: "all",
      hidden: undefined,
      after: "five_days_ago", // or use actual timestamp
      n: 20, // fetch latest 20 notifications
      offset: 0,
    }, {
      params: {
        sort: SortOption.CreatedAt,
        order: OrderOption.Descending,
      }
    })


    const lastNotified = await StorageWrapper.getItemAsync(LAST_CHECKED_KEY);
    let newlastNotified: string | null = null;
    const notifications: Notification[] = responses.data;
    const newNotifications = notifications.filter(notif => {
      if (!notif.id) return false;
      if (notif.seen) return false; // only notify about unseen notifications
      if (lastNotified && notif.created_at <= lastNotified) {
        return false; // already notified
      } else {
        if (!newlastNotified || notif.created_at > newlastNotified) {
          newlastNotified = notif.created_at;
        }
      }
      return true;
    });
    // Save the new last notified timestamp to prevent duplicate notifications
    await StorageWrapper.setItemAsync(LAST_CHECKED_KEY, newlastNotified || "" );


    // send notification to mobile
    if (newNotifications.length > 0) {
      await Promise.all(newNotifications.map((notif) => {
        const { title, contents } = extractNotificationContent(notif);
        Notifications.scheduleNotificationAsync({
          content: {
            title: title || "",
            body: contents.join("\n") || "",
            data: {
              type: "vrc_notification",
              notificationId: notif.id || "",
              notificationsender: notif.senderUserId || "",
              notificationType: notif.type || "",
            },
          },
          trigger: null, // Send immediately
        });
      }));
      return BackgroundTask.BackgroundTaskResult.Success;
    } else {
      console.log(`[Background Task] No new notifications.`);
      return BackgroundTask.BackgroundTaskResult.Success;
    }
  } catch (error) {
    console.error(`[Background Task] Error:`, error);
    return BackgroundTask.BackgroundTaskResult.Success; // Even on error, we return Success to avoid retry storms. Consider logging the error for debugging.
  }
});
