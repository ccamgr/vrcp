import { vrcColors, vrcTexts } from "@/configs/vrchat";
import { Avatar, AvatarPerformance, CalendarEvent, CurrentUser, FavoritedWorld, Group, GroupAccessType, Instance, InstanceRegion, InstanceType, LimitedGroup, LimitedUserFriend, LimitedUserInstance, LimitedUserSearch, LimitedWorld, User, UserState, UserStatus, World } from "@/vrchat/api";
export type UserLike = LimitedUserSearch | LimitedUserFriend | LimitedUserInstance | User | CurrentUser
export type WorldLike = LimitedWorld | FavoritedWorld | World
export type GroupLike = LimitedGroup | Group
export type AvatarLike = Avatar
export type InstanceLike = MinInstance | Instance



type StatusGettableUser = Exclude<UserLike, LimitedUserInstance>

// 最低限のInstance情報だけを持つ型 (Worldに付随した部分的なInstance情報に対応)
type MinInstance = Pick< Instance, "id" | "instanceId" | "worldId" | "name" | "n_users" | "capacity" | "type" | "groupAccessType" | "region"> 
  & Partial<Exclude< Instance, "id" | "instanceId" | "worldId" | "name" | "n_users" | "capacity" | "type" | "groupAccessType" | "region">>;


// get ImageUrls from user 

export function getUserIconUrl(user: UserLike, highRes = false): string {
  if (user.userIcon) {
    return user.userIcon;
  }
  if (highRes) {
    if (user.profilePicOverride) {
      return user.profilePicOverride;
    } else if ("profilePicOverrideThumbnail" in user && user.profilePicOverrideThumbnail) {
      return user.profilePicOverrideThumbnail;
    } 
    if (user.currentAvatarImageUrl) {
      return user.currentAvatarImageUrl;
    } else if (user.currentAvatarThumbnailImageUrl) {
      return user.currentAvatarThumbnailImageUrl;
    }
  } else {
    if ("profilePicOverrideThumbnail" in user && user.profilePicOverrideThumbnail) {
      return user.profilePicOverrideThumbnail;
    } else if (user.profilePicOverride) {
      return user.profilePicOverride;
    }
    if (user.currentAvatarThumbnailImageUrl) {
      return user.currentAvatarThumbnailImageUrl;
    } else if (user.currentAvatarImageUrl) {
      return user.currentAvatarImageUrl;
    }
  }
  return "www";
}
export function getUserProfilePicUrl(user: UserLike, highRes = false): string {
  if (highRes) {
    if (user.profilePicOverride) {
      return user.profilePicOverride;
    } else if ("profilePicOverrideThumbnail" in user && user.profilePicOverrideThumbnail) {
      return user.profilePicOverrideThumbnail;
    } 
    if (user.currentAvatarImageUrl) {
      return user.currentAvatarImageUrl;
    } else if (user.currentAvatarThumbnailImageUrl) {
      return user.currentAvatarThumbnailImageUrl;
    }
  } else {
    if ("profilePicOverrideThumbnail" in user && user.profilePicOverrideThumbnail) {
      return user.profilePicOverrideThumbnail;
    } else if (user.profilePicOverride) {
      return user.profilePicOverride;
    }
    if (user.currentAvatarThumbnailImageUrl) {
      return user.currentAvatarThumbnailImageUrl;
    } else if (user.currentAvatarImageUrl) {
      return user.currentAvatarImageUrl;
    }
  }
  return "www";
}

// parse location string

export function parseLocationString(location: string| undefined): 
{
  isOffline?: boolean;
  isPrivate?: boolean;
  isTraveling?: boolean;
  parsedLocation?: { 
    worldId?: string; 
    instanceId?: string;
  }
} {
  try {
    if (!location || location.length === 0) return {};
    if (location == "offline") return { isOffline: true };
    if (location == "private") return { isPrivate: true };
    if (location == "traveling") return { isTraveling: true };
    const splited = location.split(":");
    let worldId = undefined, instanceId = undefined;
    if (splited.length < 2) {
      if (splited[0].startsWith("wrld_")) {
        worldId = splited[0];
      } else {
        instanceId = splited[0];
      }
    } else {
      worldId = splited[0];
      instanceId = splited[1];
    }
    return {
      parsedLocation: { worldId, instanceId }
    };
  } catch (e) {
    return {};
  }
}

export function parseInstanceId(instanceId: string | undefined): {
  name: string; 
  type: InstanceType;
  groupAccessType?: GroupAccessType;
  region?: InstanceRegion

  hidden?: string;
  friends?: string;
  private?: string;
  group?: string;
} | undefined {
  if (!instanceId) return undefined;
  const splitedInst = instanceId.split("~");
  const name = splitedInst[0]; // 

  const parseByReg = (type: string) => {
    const regRes = splitedInst.find(s => s.startsWith(`${type}(`))?.match(/\((.+?)\)/)
    return regRes && regRes.length > 1 ? regRes[1] : undefined;
  }

  const parsed = {
    region : (parseByReg("region") ?? "unknown" )as InstanceRegion,
    groupAccessType: parseByReg("groupAccessType") as GroupAccessType | undefined,
    // types
    hidden : parseByReg("hidden"),
    friends : parseByReg("friends"),
    private : parseByReg("private"),
    group : parseByReg("group"),
  }

  const type = parsed.hidden ? "hidden" 
    : parsed.friends ? "friends" 
    : parsed.private ? "private" 
    : parsed.group ? "group" 
    : "public"; // default to public (no-type provide)

  return { name, type, ...parsed };
}

// Get instance type with DisplayName (ex.Friends+) 
export function getInstanceType(type:InstanceType, groupAccessType?: GroupAccessType) {
  if (type === "public") return vrcTexts.instanceType.public;
  if (type === "hidden") return vrcTexts.instanceType.friends_plus;
  if (type === "friends") return vrcTexts.instanceType.friends;
  if (type === "private") return vrcTexts.instanceType.private; // Invite or Invite+
  if (type === "group") {// GroupOnly or Group+ or GroupPublic
    if (groupAccessType === "members") return vrcTexts.instanceType.group;
    if (groupAccessType === "plus") return vrcTexts.instanceType.group_plus;
    if (groupAccessType === "public") return vrcTexts.instanceType.group_public;
    return vrcTexts.instanceType.group;
  }
  return vrcTexts.instanceType.private;
}

export function getState(user: LimitedUserFriend): UserState | undefined {
  if (user.platform == "web") return "active"; 
  if (user.status !== "offline") return "online"; 
  if (user.location != "") return "offline";
  return undefined;
}


export function getStatusColor(userOrStr: StatusGettableUser | string ): string {
  const status = typeof userOrStr === "string" ? userOrStr : userOrStr.status;
  if (status == "join me") return vrcColors.userStatus.join_me; // join me
  if (status == "active") return vrcColors.userStatus.online; // online
  if (status == "ask me") return vrcColors.userStatus.ask_me; // ask me
  if (status == "busy") return vrcColors.userStatus.busy; // busy
  if (status == "offline") return vrcColors.userStatus.offline; // offline
  return vrcColors.userStatus.offline;
}

// get trust rank color (and friend color)
export function getTrustRankColor(user: UserLike, useFriendColor: boolean = false, useRankColor: boolean = true): string {
  if (useFriendColor && user.isFriend) return vrcColors.friend; // friend
  if (useRankColor) {
    const tags = user.tags;
    if (tags.includes("system_troll")) return vrcColors.trustRank.nuisance; // Nuisance

    if (tags.includes("system_trust_legend")) return vrcColors.trustRank.legend; // legend (unused?)
    if (tags.includes("system_trust_veteran")) return vrcColors.trustRank.trusted; // trusted
    if (tags.includes("system_trust_trusted")) return vrcColors.trustRank.known; // known
    if (tags.includes("system_trust_known")) return vrcColors.trustRank.user; // User
    if (tags.includes("system_trust_basic")) return vrcColors.trustRank.new_user; // NewUser
  }
  return vrcColors.trustRank.visitor; // Visitor
}


// get trust rank string from Tags
export function getTrustRank(user: UserLike) {
  const tags = user.tags;
  if (tags.includes("system_troll")) return vrcTexts.trustRank.nuisance;
  if (tags.includes("system_trust_legend")) return vrcTexts.trustRank.legend;
  if (tags.includes("system_trust_veteran")) return vrcTexts.trustRank.trusted;
  if (tags.includes("system_trust_trusted")) return vrcTexts.trustRank.known;
  if (tags.includes("system_trust_known")) return vrcTexts.trustRank.user;
  if (tags.includes("system_trust_basic")) return vrcTexts.trustRank.new_user;
  return vrcTexts.trustRank.visitor;
}

// VRC+ Subscriber
export function isSupporter(user: UserLike): boolean {
  const tags = user.tags;
  return tags.includes("system_supporter");
}

// get friendRequestStatus
export function getFriendRequestStatus(user: User): "null" | "outgoing" | "completed" {
  if (user.friendRequestStatus === "completed") return "completed";
  if (user.friendRequestStatus === "outgoing") return "outgoing";
  if (user.friendRequestStatus === "null") return "null";
  return "null";
}

// Avatar or World 

export function getAuthorTags(data: AvatarLike | WorldLike): string[] {
  const tags = data.tags?.filter(t => t.startsWith("author_tag_"));
  return tags?.map(t => t.replace("author_tag_", "")) ?? [];
}


export function getReleaseStatusColor(data: AvatarLike | WorldLike) {
  if (data.releaseStatus == "public") return vrcColors.releaseStatus.public; // public
  if (data.releaseStatus == "private") return vrcColors.releaseStatus.private; // private
  if (data.releaseStatus == "hidden") return vrcColors.releaseStatus.hidden; // hidden
  return "#000000ff";
}

export function getPlatform (data: AvatarLike | WorldLike): {
  platform: string;
  avatarPerformance?: string;
}[] {
  const platforms: { platform: string; avatarPerformance?: string }[] = [];
  if ("performance" in data) { // Avatar
    if (data.performance.standalonewindows) platforms.push({ platform: "standalonewindows", avatarPerformance: data.performance.standalonewindows });
    if (data.performance.android) platforms.push({ platform: "android", avatarPerformance: data.performance.android });
    if (data.performance.ios) platforms.push({ platform: "ios", avatarPerformance: data.performance.ios });
  } else if ("unityPackages" in data) { // World
    if (data.unityPackages?.some(pkg => pkg.platform == "standalonewindows")) platforms.push({ platform: "standalonewindows" });
    if (data.unityPackages?.some(pkg => pkg.platform == "android")) platforms.push({ platform: "android" });
    if (data.unityPackages?.some(pkg => pkg.platform == "ios")) platforms.push({ platform: "ios" });
  }
  return platforms;
}


// converter
// Convert User to LimitedUserFriend (for DataContext etc...)
export function convertToLimitedUserFriend(user: UserLike): LimitedUserFriend {
  const obj = Object(user);
  return {
    ...user,
    imageUrl: user?.currentAvatarThumbnailImageUrl ?? user?.currentAvatarImageUrl,
    location: obj.location ?? "offline",
    friendKey: obj.friendKey ?? "",
    last_mobile: obj.last_mobile ?? "",
    last_login: obj.last_login ?? "",
    last_activity: obj.last_activity ?? "",
    platform: obj.platform ?? "",
    
  };
}
// Convert User to LimitedUserInstance (for DataContext etc...)
export function convertToLimitedUserInstance(user: UserLike): LimitedUserInstance {
  const obj = Object(user);
  return {
    ...user,
    pronouns: obj.pronouns ?? "",
    currentAvatarThumbnailImageUrl: user?.currentAvatarThumbnailImageUrl ?? user?.currentAvatarImageUrl,
    currentAvatarTags: obj.currentAvatarTags ?? [],
    ageVerified: obj.ageVerificationStatus ?? false,
    ageVerificationStatus: obj.ageVerificationStatus ?? "hidden",
    allowAvatarCopying: obj.allowAvatarCopying ?? false,
    date_joined: obj.date_joined ?? "",
    friendKey: obj.friendKey ?? "",
    state: obj.state ?? undefined,
    last_mobile: obj.last_mobile ?? "",
    last_activity: obj.last_activity ?? "",
  };
} 