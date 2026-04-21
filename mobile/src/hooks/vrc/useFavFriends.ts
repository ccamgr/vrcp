import { useMemo } from "react";
import { useFriends } from "./useFriends";
import { useFavorites } from "./useFavorites";
import { LimitedUserFriend } from "@/generated/vrcapi";
import { sortFriendWithStatus } from "@/lib/funcs/sortFriendWithStatus";
import { getState } from "@/lib/vrchat";

export interface FriendsByState {
  online: LimitedUserFriend[];
  active: LimitedUserFriend[];
  offline: LimitedUserFriend[];
}

/**
 * Hook to get favorite friends organized by their status
 * This hook combines data from useFriends and useFavorites to return only the friends that are marked as favorites, categorized by their online status.
 * @returns
 */
export const useFavFriends = () => {
  // Fetch data from our custom hooks
  const { data: friends, isFetching: isFriendsFetching, refresh: refreshFriends } = useFriends();
  const { data: favorites, isFetching: isFavsFetching, refresh: refreshFavs } = useFavorites();

  // Combine loading states (true if either is fetching)
  const isFetching = isFriendsFetching || isFavsFetching;

  // Refresh both queries simultaneously
  const refresh = () => {
    refreshFriends();
    refreshFavs();
  };

  const favoriteFriends = useMemo<FriendsByState>(() => {
    const devided: FriendsByState = { online: [], active: [], offline: [] };

    // Return empty arrays if data is not ready
    if (!friends || !favorites) return devided;

    // Create a Set of favorite friend IDs for O(1) lookup
    const friFavSet = new Set(
      favorites.filter((ff) => ff.type === "friend").map((ff) => ff.favoriteId)
    );

    // Filter and divide friends based on status
    const favFriends = friends.filter((f) => friFavSet.has(f.id));

    favFriends.forEach(f => {
      const state = getState(f);
      if (state === "online") devided.online.push(f);
      else if (state === "active") devided.active.push(f);
      else devided.offline.push(f);
    });

    // Sort each category
    return {
      online: sortFriendWithStatus(devided.online),
      active: sortFriendWithStatus(devided.active),
      offline: sortFriendWithStatus(devided.offline),
    };
  }, [friends, favorites]);

  return {
    favoriteFriends,
    isFetching,
    refresh,
  };
};
