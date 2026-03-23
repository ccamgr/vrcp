import { Notification, NotificationType } from "@/generated/vrcapi";



interface ResType {
  title: string
  contents: string[]
}


export function extractNotificationContent ( notification: Notification ) : ResType {
  const type = notification.type
  let title = ""
  let contents: string[] = []
  if (type == NotificationType.FriendRequest) {
    title = notification.type;
    // @ts-ignore
    notification.senderUsername && contents.push(notification.senderUsername)
    notification.message && contents.push(notification.message)
  } else if (type == NotificationType.Invite) {
    title = notification.type;
    // @ts-ignore
    notification.senderUsername && contents.push(notification.senderUsername)
    notification.message && contents.push(notification.message)

  } else if (type == NotificationType.InviteResponse) {
    title = notification.type;
    // @ts-ignore
    notification.senderUsername && contents.push(notification.senderUsername)
    notification.message && contents.push(notification.message)

  } else if (type == NotificationType.Message) {
    title = notification.type;
    notification.message && contents.push(notification.message)

  } else if (type == NotificationType.RequestInvite) {
    title = notification.type;
    // @ts-ignore
    notification.senderUsername && contents.push(notification.senderUsername)
    notification.message && contents.push(notification.message)

  } else if (type == NotificationType.RequestInviteResponse) {
    title = notification.type;
    // @ts-ignore
    notification.senderUsername && contents.push(notification.senderUsername)
    notification.message && contents.push(notification.message)

  } else if (type == NotificationType.Votetokick) {
    title = notification.type;
    // @ts-ignore
    notification.senderUsername && contents.push(notification.senderUsername)
    notification.message && contents.push(notification.message)
  }

  return {
    title,
    contents
  }
}
