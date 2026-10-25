import { Favorite, LimitedUserFriend } from "@/generated/vrcapi";

export type FriendLocationFilter = {
  enabledFavoriteGroups: Record<string, boolean>;
  includeNonFavorite: boolean;
};

export const isFavoriteGroupEnabled = (
  filter: FriendLocationFilter,
  groupName: string,
) => filter.enabledFavoriteGroups[groupName] ?? true;

export const filterFriendLocations = (
  friends: LimitedUserFriend[],
  favorites: Favorite[],
  filter: FriendLocationFilter,
) => {
  const favoriteGroupNamesByFriendId = new Map<string, string[]>();

  for (const favorite of favorites) {
    if (favorite.type !== "friend") continue;

    const groupNames =
      favoriteGroupNamesByFriendId.get(favorite.favoriteId) ?? [];
    groupNames.push(...favorite.tags);
    favoriteGroupNamesByFriendId.set(favorite.favoriteId, groupNames);
  }

  return friends.filter((friend) => {
    const groupNames = favoriteGroupNamesByFriendId.get(friend.id) ?? [];

    if (groupNames.length === 0) {
      return filter.includeNonFavorite;
    }

    return groupNames.some((groupName) =>
      isFavoriteGroupEnabled(filter, groupName),
    );
  });
};
