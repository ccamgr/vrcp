import { Avatar, CurrentUser, Group, GroupAccessType, InstanceRegion, InstanceType, LimitedGroup, LimitedUserFriend, LimitedUserInstance, LimitedUserSearch, LimitedWorld, User, World } from "@/api/vrchat";
export type UserLike = LimitedUserSearch | LimitedUserFriend | LimitedUserInstance | User | CurrentUser
export type WorldLike = LimitedWorld | World
export type GroupLike = LimitedGroup | Group
export type AvatarLike = Avatar
type StatusGettableUser = Exclude<UserLike, LimitedUserInstance>


export function parseLocationString(location: string| undefined): 
{
  isOffline?: boolean;
  isPrivate?: boolean;
  parsedLocation?: { 
    worldId?: string; 
    instanceId?: string;
  }
} {
  try {
    if (!location) return {};
    if (location == "offline") return { isOffline: true };
    if (location == "private") return { isPrivate: true };
    const [worldId, instanceId] = location.split(":");
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
  groupAccessType: GroupAccessType | undefined;
  region: InstanceRegion

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
  if (type === "public") return "Public";
  if (type === "hidden") return "Friends+";
  if (type === "friends") return "Friends";
  if (type === "private") return "Private"; // Invite or Invite+
  if (type === "group") {// GroupOnly or Group+ or GroupPublic
    if (groupAccessType === "members") return "Group";
    if (groupAccessType === "plus") return "Group+";
    if (groupAccessType === "public") return "GroupPublic";
    return "Group";
  }
  return "unknown";
}


export function getStatusColor(user: StatusGettableUser) {
  if (user.status == "join me") return "#00bbffff" // join me
  if (user.status == "active") return "#59ff00ff" // online
  if (user.status == "ask me") return "#ff7b00ff" // ask me
  if (user.status == "busy") return "#b10000ff" // don't disturb
  if (user.status == "offline") return "#595959ff" // offline
  return "#000000ff";
}

// get trust rank color (and friend color)
export function getTrustRankColor(user: UserLike, useFriendColor: boolean = false) {
  if (useFriendColor && user.isFriend) return "#ffee00ff"; // friend
  const tags = user.tags;
  if (tags.includes("system_troll")) return "#363636ff"; // Nuisance

  if (tags.includes("system_trust_legend")) return "#ff0101ff"; // legend (unused?)
  if (tags.includes("system_trust_veteran")) return "#aa01ffff"; // trusted
  if (tags.includes("system_trust_trusted")) return "#ff8800ff"; // known
  if (tags.includes("system_trust_known")) return "#26ff00ff"; // User
  if (tags.includes("system_trust_basic")) return "#004cffff"; // NewUser
  return "#ffffffff"; // Visitor
}

// get trust rank string from Tags
export function getTrustRank(user: UserLike): string {
  const tags = user.tags;
  if (tags.includes("system_troll")) return "nuisance";
  if (tags.includes("system_trust_legend")) return "legend"; // (unused?)
  if (tags.includes("system_trust_veteran")) return "trusted";
  if (tags.includes("system_trust_trusted")) return "known";
  if (tags.includes("system_trust_known")) return "user";
  if (tags.includes("system_trust_basic")) return "new_user";
  return "visitor";
}

// VRC+ Subscriber
export function isSupporter(user: UserLike): boolean {
  const tags = user.tags;
  return tags.includes("system_supporter");
}

export function getAuthorTags(data: AvatarLike | WorldLike): string[] {
  const tags = data.tags.filter(t => t.startsWith("author_tag_"));
  return tags.map(t => t.replace("author_tag_", ""));
}


export function getReleaseStatusColor(data: AvatarLike | WorldLike) {
  if (data.releaseStatus == "public") return "rgba(95, 164, 255, 1)"; // public
  if (data.releaseStatus == "private") return "#ff8636ff"; // private
  if (data.releaseStatus == "hidden") return "#3d3c3cff"; // hidden
  return "#000000ff";
}

export function getAvatarPlatform (data: AvatarLike) {
  const platforms: string[] = []
  if (data.performance.standalonewindows) platforms.push("standalonewindows");
  if (data.performance.android) platforms.push("android");
  if (data.performance.ios) platforms.push("ios");
  return platforms;
}
export function getWorldPlatform (data: WorldLike) {
  const platforms: string[] = []
  if (data.unityPackages?.some(pkg => pkg.platform == "standalonewindows")) platforms.push("standalonewindows");
  if (data.unityPackages?.some(pkg => pkg.platform == "android")) platforms.push("android");
  if (data.unityPackages?.some(pkg => pkg.platform == "ios")) platforms.push("ios");
  return platforms;
}