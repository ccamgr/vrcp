import { Favorite, LimitedUserFriend } from "@/generated/api";
import { convertToLimitedUserInstance, InstanceLike, parseInstanceId, parseLocationString } from "../vrchat";
import { sortFriendWithStatus } from "./sortFriendWithStatus";

type LocationData = {
  location: string;
  friends?: LimitedUserFriend[];
  hasFavoriteFriends?: boolean;
}
// overload signatures
function calcFriendsLocations(
  friends: LimitedUserFriend[],
  favorites: Favorite[],
  onlyHasFavorites: boolean,
  withUnlocatable: false,
): InstanceLike[];
function calcFriendsLocations(
  friends: LimitedUserFriend[],
  favorites: Favorite[],
  onlyHasFavorites: boolean,
  withUnlocatable: true,
): {instances: InstanceLike[], unlocatableFriends: LimitedUserFriend[]};
function calcFriendsLocations(
  friends: LimitedUserFriend[],
  favorites: Favorite[],
  onlyHasFavorites: boolean,
  withUnlocatable:boolean = false,
): InstanceLike[] | {instances: InstanceLike[], unlocatableFriends: LimitedUserFriend[]} {
    if (!friends) return withUnlocatable ? {instances: [], unlocatableFriends: []} : [];
    // create favoriteMap for quick lookup
    const favoriteMap: Record<string, boolean> = {};
    if (favorites) {
      for (const fav of favorites) {
        if (fav.type !== "friend") continue;
        favoriteMap[fav.favoriteId] = true;
      }
    }
    const unlocatableFriends: LimitedUserFriend[] = [];
    // group friends by instanceId
    // instanceId -> { friends: LimitedUserFriend[], length: number, hasFavorite: boolean }
    const map: Record<string, LocationData> = {};
    for (const friend of friends) {
      const location = friend.location;
      const { parsedLocation, isOffline } = parseLocationString(location);
      if (parsedLocation == undefined) {
        if (withUnlocatable && !isOffline) unlocatableFriends.push(friend);
        continue;
      }
      if (!map[location]) {
        map[location] = { location, friends: [], hasFavoriteFriends: false }
      };
      map[location].friends?.push(friend);
      if (favoriteMap[friend.id]) map[location].hasFavoriteFriends = true;

    }
    // convert to MinInstance[]
    const instanceFriends: (
      InstanceLike & {hasFavoriteFriends: boolean, friendsCount: number}
    )[] = [];
    Object.values(map).forEach((locData) => {
      if (onlyHasFavorites && !locData.hasFavoriteFriends) return;
      const { parsedLocation } = parseLocationString(locData.location);
      const parsedInstance = parseInstanceId(parsedLocation?.instanceId);
      if (parsedLocation && parsedLocation.worldId && parsedLocation.instanceId) {
        const instance = {
          id: parsedLocation.instanceId,
          instanceId: parsedLocation.instanceId,
          worldId: parsedLocation.worldId,
          location: locData.location,
          users: locData.friends?.map(convertToLimitedUserInstance),
          n_users: -1,
          capacity: -1,
          type: parsedInstance?.type ?? "hidden",
          region: parsedInstance?.region ?? "unknown",
          name: parsedInstance?.name ?? "",
          // for sort, not from MinInstance interface
          hasFavoriteFriends: locData.hasFavoriteFriends ?? false,
          friendsCount: locData.friends?.length ?? 0,
        };
        instanceFriends.push(instance);
      }
    });
    const sorted = instanceFriends.sort((a, b) => {
      if (a.hasFavoriteFriends && !b.hasFavoriteFriends) return -1;
      if (!a.hasFavoriteFriends && b.hasFavoriteFriends) return 1;
      // both have or both not have favorite, sort by length desc
      const aCount = a.friendsCount ?? 0;
      const bCount = b.friendsCount ?? 0;
      if (aCount !== bCount) return bCount - aCount;
      return a.type.localeCompare(b.type);
    });
    if (withUnlocatable) {
          return {instances: sorted, unlocatableFriends: sortFriendWithStatus(unlocatableFriends)};
    }
    return sorted;
  }


  export { calcFriendsLocations };