import {
  CurrentUser,
  InlineObject,
  InlineObject4,
  PublicProfile,
  RequiresTwoFactorAuth,
  User,
  UserStatus,
} from "@/generated/vrcapi";

export type CurrentAccount = CurrentUser;

export type UserPresentation = {
  id: string;
  displayName: string;
  tags: string[];
  isFriend: boolean;
  status: UserStatus;
  statusDescription: string;
  location?: string;
  last_activity?: string | null;
  last_login?: string | null;
  last_mobile?: string | null;
  last_platform?: string;
  platform?: string;
  friendKey?: string;
  friendRequestStatus?: string;
  note?: string;
  state?: CurrentUser["state"];
  date_joined?: string;
  currentAvatar?: string;
  currentAvatarImageUrl?: string;
  currentAvatarThumbnailImageUrl?: string;
  profilePicOverride?: string;
  profilePicOverrideThumbnail?: string;
  iconUrl?: string;
  userIcon?: string;
  bio?: string;
  bioLinks?: string[];
  badges?: PublicProfile["badges"];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isRequiresTwoFactorAuth = (
  value: InlineObject,
): value is RequiresTwoFactorAuth =>
  isRecord(value) && Array.isArray(value.requiresTwoFactorAuth);

export const isCurrentAccount = (
  value: InlineObject,
): value is CurrentAccount =>
  isRecord(value) &&
  typeof value.id === "string" &&
  !isRequiresTwoFactorAuth(value);

export const isCurrentUserRecord = (
  value: InlineObject4,
): value is CurrentUser => isRecord(value) && Array.isArray(value.friends);

export const toUserCore = (value: InlineObject4): User => {
  if (!isCurrentUserRecord(value)) {
    return value;
  }

  return {
    ...value,
    last_activity:
      "last_activity" in value && typeof value.last_activity === "string"
        ? value.last_activity
        : "",
  };
};

export const toUserPresentation = (
  user: CurrentAccount | User,
  profile?: PublicProfile,
): UserPresentation => ({
  id: user.id,
  displayName: profile?.displayName ?? user.displayName,
  tags: user.tags,
  isFriend: user.isFriend,
  status: profile?.status ?? user.status,
  statusDescription: profile?.statusDescription ?? user.statusDescription,
  location: user.location,
  last_activity: user.last_activity,
  last_login: user.last_login,
  last_mobile: user.last_mobile,
  last_platform: user.last_platform,
  platform: user.platform,
  friendKey: user.friendKey,
  friendRequestStatus: user.friendRequestStatus,
  note: user.note,
  state: user.state,
  date_joined: user.date_joined,
  currentAvatar:
    profile?.currentAvatar ??
    (isCurrentUserRecord(user) ? user.currentAvatar : undefined),
  currentAvatarImageUrl:
    profile?.currentAvatarImageUrl ??
    (isCurrentUserRecord(user) ? user.currentAvatarImageUrl : undefined),
  currentAvatarThumbnailImageUrl:
    profile?.currentAvatarThumbnailImageUrl ??
    (isCurrentUserRecord(user)
      ? user.currentAvatarThumbnailImageUrl
      : undefined),
  iconUrl: user.iconUrl,
  userIcon: profile?.userIcon,
  bio: profile?.bio,
  bioLinks: profile?.bioLinks,
  badges: profile?.badges,
});
