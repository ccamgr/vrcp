// This file is generated automatically by a script(gen-type.ts).
// Don't modify manually!

import * as _API from "../api";


export interface PipelineRawMessage<T extends PipelineType = PipelineType> {
  type: T;
  content?: string | null; // JSON string
}

export interface PipelineMessage<T extends PipelineType = PipelineType> {
  timestamp: number; // milliseconds
  type: T;
  content?: PipelineContent<T>;
}

export const PipelineType = [
  'notification',
  'response-notification',
  'see-notification',
  'hide-notification',
  'clear-notification',
  'notification-v2',
  'notification-v2-update',
  'notification-v2-delete',
  'friend-add',
  'friend-delete',
  'friend-online',
  'friend-active',
  'friend-offline',
  'friend-update',
  'friend-location',
  'user-update',
  'user-location',
  'user-badge-assigned',
  'user-badge-unassigned',
  'content-refresh',
  'modified-image-update',
  'instance-queue-joined',
  'instance-queue-ready',
  'group-joined',
  'group-left',
  'group-member-updated',
  'group-role-updated'
] as const;
export type PipelineType = typeof PipelineType[keyof typeof PipelineType];

export type PipelineContent<T extends PipelineType> = T extends 'notification'
? NotificationPipelineContent
: T extends 'response-notification'
? ResponseNotificationPipelineContent
: T extends 'see-notification'
? SeeNotificationPipelineContent
: T extends 'hide-notification'
? HideNotificationPipelineContent
: T extends 'clear-notification'
? ClearNotificationPipelineContent
: T extends 'notification-v2'
? NotificationV2PipelineContent
: T extends 'notification-v2-update'
? NotificationV2UpdatePipelineContent
: T extends 'notification-v2-delete'
? NotificationV2DeletePipelineContent
: T extends 'friend-add'
? FriendAddPipelineContent
: T extends 'friend-delete'
? FriendDeletePipelineContent
: T extends 'friend-online'
? FriendOnlinePipelineContent
: T extends 'friend-active'
? FriendActivePipelineContent
: T extends 'friend-offline'
? FriendOfflinePipelineContent
: T extends 'friend-update'
? FriendUpdatePipelineContent
: T extends 'friend-location'
? FriendLocationPipelineContent
: T extends 'user-update'
? UserUpdatePipelineContent
: T extends 'user-location'
? UserLocationPipelineContent
: T extends 'user-badge-assigned'
? UserBadgeAssignedPipelineContent
: T extends 'user-badge-unassigned'
? UserBadgeUnassignedPipelineContent
: T extends 'content-refresh'
? ContentRefreshPipelineContent
: T extends 'modified-image-update'
? ModifiedImageUpdatePipelineContent
: T extends 'instance-queue-joined'
? InstanceQueueJoinedPipelineContent
: T extends 'instance-queue-ready'
? InstanceQueueReadyPipelineContent
: T extends 'group-joined'
? GroupJoinedPipelineContent
: T extends 'group-left'
? GroupLeftPipelineContent
: T extends 'group-member-updated'
? GroupMemberUpdatedPipelineContent
: T extends 'group-role-updated'
? GroupRoleUpdatedPipelineContent
: null;

export type NotificationPipelineContent = _API.Notification

export type ResponseNotificationPipelineContent = {
  notificationId: string;
  receiverId: string;
  responseId: string;
}

export type SeeNotificationPipelineContent = string

export type HideNotificationPipelineContent = string

export type ClearNotificationPipelineContent = null;

export type NotificationV2PipelineContent = {
  id: string;
  version: 2;
  type: string;
  category: string;
  isSystem: boolean;
  ignoreDND: boolean;
  senderUserId: string;
  senderUsername: string;
  receiverUserId: string;
  relatedNotificationsId: string | undefined;
  title: string;
  message: string;
  imageUrl: string;
  link: string;
  linkText: string;
  responses: {
      type: string;
      data: string;
      icon: string;
      text: string;
    }[];
  expiresAt: string;
  expiryAfterSeen: number;
  requireSeen: boolean;
  seen: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationV2UpdatePipelineContent = {
  id: string;
  version: 2;
  updates: Record<string, any>;
}

export type NotificationV2DeletePipelineContent = {
  ids: string[];
  version: 2;
}

export type FriendAddPipelineContent = {
  userId: string;
  user: _API.User;
}

export type FriendDeletePipelineContent = {
  userId: string;
}

export type FriendOnlinePipelineContent = {
  userId: string;
  platform: string;
  location: string;
  canRequestInvite: boolean;
  user: _API.User;
}

export type FriendActivePipelineContent = {
  userId: string;
  platform: string;
  user: _API.User;
}

export type FriendOfflinePipelineContent = {
  userId: string;
  platform: string;
}

export type FriendUpdatePipelineContent = {
  userId: string;
  user: _API.User;
}

export type FriendLocationPipelineContent = {
  userId: string;
  location: string;
  travelingToLocation: string;
  worldId: string;
  canRequestInvite: boolean;
  user: _API.User;
}

export type UserUpdatePipelineContent = {
  userId: string;
  user: {
    bio: string;
    currentAvatar: string;
    currentAvatarImageUrl: string;
    currentAvatarThumbnailImageUrl: string;
    displayName: string;
    fallbackAvatar: string;
    id: string;
    profilePicOverride: string;
    status: string;
    statusDescription: string;
    tags: string[];
    userIcon: string;
    username: string;
  }
}

export type UserLocationPipelineContent = {
  userId: string;
  user: _API.User;
  location: string;
  instance: string;
  travelingToLocation: string;
}

export type UserBadgeAssignedPipelineContent = {
  badge: string;
}

export type UserBadgeUnassignedPipelineContent = {
  badgeId: string;
}

export type ContentRefreshPipelineContent = {
  contentType: string;
  fileId: string;
  itemId: string;
  itemType: string;
  actionType: string;
}

export type ModifiedImageUpdatePipelineContent = {
  fileId: string;
  pixelSize: number;
  versionNumber: number;
  needsProcessing: boolean;
}

export type InstanceQueueJoinedPipelineContent = {
  instanceLocation: string;
  position: number;
}

export type InstanceQueueReadyPipelineContent = {
  instanceLocation: string;
  expiry: string;
}

export type GroupJoinedPipelineContent = {
  groupId: string;
}

export type GroupLeftPipelineContent = {
  groupId: string;
}

export type GroupMemberUpdatedPipelineContent = {
  member: _API.GroupLimitedMember;
}

export type GroupRoleUpdatedPipelineContent = {
  role: _API.GroupRole;
}