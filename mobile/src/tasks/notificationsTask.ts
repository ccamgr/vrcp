import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import StorageWrapper from '@/lib/wrappers/storageWrapper';
import * as SecureStore from "expo-secure-store";
import { Configuration, Notification, NotificationsApi, UsersApi, OrderOption, SortOption } from '@/generated/vrcapi';
import { getUserAgent } from '@/lib/utils';
import { extractNotificationContent } from '@/lib/funcs/extractNotificationContent';

export const VRCHAT_NOTIFICATION_TASK_NAME = 'BACKGROUND_VRCHAT_NOTIFICATION_TASK';
const LAST_CHECKED_KEY = 'BACKGROUND_VRCHAT_NOTIFICATION_TASK_LAST_CHECKED';

TaskManager.defineTask(VRCHAT_NOTIFICATION_TASK_NAME, async () => {
  const now = new Date();
  console.log(`[Background Task] Executed at: ${now.toISOString()}`);

  try {
    const secret = await Promise.all([
      SecureStore.getItemAsync("auth_secret_username"),
      SecureStore.getItemAsync("auth_secret_password"),
    ]);

    if (!secret[0] || !secret[1]) {
      console.log("No secret found for auto login");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const conf = new Configuration({
      username: secret[0] || undefined,
      password: secret[1] || undefined,
      baseOptions: {
        headers: { "User-Agent": getUserAgent() },
      },
    });

    const notificationsApi = new NotificationsApi(conf);
    const usersApi = new UsersApi(conf); // Add UsersApi to fetch display names

    const responses = await notificationsApi.getNotifications({
      type: "all",
      after: "five_days_ago",
      n: 20,
      offset: 0,
    }, {
      params: { sort: SortOption.CreatedAt, order: OrderOption.Descending }
    });

    const lastNotified = await StorageWrapper.getItemAsync(LAST_CHECKED_KEY);
    let newlastNotified: string | null = null;
    const notifications: Notification[] = responses.data;

    const newNotifications = notifications.filter(notif => {
      if (!notif.id || notif.seen) return false;
      if (lastNotified && notif.created_at <= lastNotified) return false;

      if (!newlastNotified || notif.created_at > newlastNotified) {
        newlastNotified = notif.created_at;
      }
      return true;
    });

    await StorageWrapper.setItemAsync(LAST_CHECKED_KEY, newlastNotified || "");

    if (newNotifications.length > 0) {
      // Simple memory cache to avoid fetching the same user multiple times in one task run
      const fetchedUsers: Record<string, string> = {};

      await Promise.all(newNotifications.map(async (notif) => {
        let senderNameStr = "";

        // Fetch displayName using senderUserId
        if (notif.senderUserId) {
          try {
            if (fetchedUsers[notif.senderUserId]) {
              senderNameStr = `${fetchedUsers[notif.senderUserId]}: `;
            } else {
              const userRes = await usersApi.getUser({ userId: notif.senderUserId });
              const displayName = userRes.data.displayName;
              fetchedUsers[notif.senderUserId] = displayName;
              senderNameStr = `${displayName}: `;
            }
          } catch (e) {
            console.warn(`Failed to fetch user info for ${notif.senderUserId}`, e);
            senderNameStr = "Unknown User: ";
          }
        }

        const { title, contents } = extractNotificationContent(notif);
        const bodyText = senderNameStr + contents.join("\n");

        await Notifications.scheduleNotificationAsync({
          content: {
            title: title || "VRChat",
            body: bodyText,
            data: {
              type: "vrc_notification",
              notificationId: notif.id || "",
              notificationsender: notif.senderUserId || "",
              notificationType: notif.type || "",
            },
          },
          trigger: null,
        });
      }));

      return BackgroundTask.BackgroundTaskResult.Success;
    } else {
      console.log(`[Background Task] No new notifications.`);
      return BackgroundTask.BackgroundTaskResult.Success;
    }
  } catch (error) {
    console.error(`[Background Task] Error:`, error);
    return BackgroundTask.BackgroundTaskResult.Success;
  }
});
