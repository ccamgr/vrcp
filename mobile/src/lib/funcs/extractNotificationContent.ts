// src/lib/funcs/extractNotificationContent.ts
import { Notification, NotificationType } from "@/generated/vrcapi";

export interface ExtractedNotification {
  title: string;
  contents: string[];
}

export function extractNotificationContent(notification: Notification): ExtractedNotification {
  const type = notification.type;
  let title = String(type); // デフォルトは type をそのままタイトルに
  const contents: string[] = [];

  // VRC API のレスポンスは details に追加情報（JSON文字列など）が入ることがあります。
  // 必要に応じてここでパースして contents に加えることも可能ですが、
  // 今回は基本的なメッセージの抽出に留めます。

  switch (type) {
    case NotificationType.FriendRequest:
    case NotificationType.Invite:
    case NotificationType.InviteResponse:
    case NotificationType.Message:
    case NotificationType.RequestInvite:
    case NotificationType.RequestInviteResponse:
    case NotificationType.Votetokick:
      // UIで UserOrGroupChip が名前を表示するため、senderUsername は除外。
      // Push通知（バックグラウンド）の場合も「[ユーザー名]から〇〇」というタイトルを
      // 別途生成する方が綺麗ですが、今回はシンプルに元のロジックを踏襲しつつダブりを防ぎます。
      if (notification.message) {
        contents.push(notification.message);
      }
      break;
    default:
      // 未知の通知タイプの場合のフォールバック
      if (notification.message) {
        contents.push(notification.message);
      }
      break;
  }

  // もし title をもっとユーザーフレンドリーにしたい場合は、ここで i18n などを噛ませることもできます。
  // （バックグラウンドタスクでは i18n が動かない場合があるので注意）

  return {
    title,
    contents,
  };
}
