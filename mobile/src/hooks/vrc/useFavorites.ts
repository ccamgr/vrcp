import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoriteLimits } from "./useFavoriteLimits";
import { Favorite } from "@/generated/vrcapi";

/**
 * On-memory
 * @returns
 */
export const useFavorites = () => {
  const vrc = useVRChat();
  const auth = useAuth();
  const { data: limits } = useFavoriteLimits();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "state", "favorites"];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!limits) return [];
      const npr = 100;
      const avt = limits.maxFavoriteGroups.avatar * limits.maxFavoritesPerGroup.avatar;
      const fri = limits.maxFavoriteGroups.friend * limits.maxFavoritesPerGroup.friend;
      const wld = limits.maxFavoriteGroups.world * limits.maxFavoritesPerGroup.world;
      const nReq = Math.max(1, Math.ceil((avt + fri + wld) / npr));

      const res = await Promise.all(
        Array.from({ length: nReq }, (_, i) =>
          vrc.favoritesApi.getFavorites({ offset: i * npr, n: npr })
        )
      );
      return res.flatMap((r) => r.data);
    },
    enabled: !!auth.user && !!limits,
    staleTime: 10 * 60 * 1000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setFavorites = (updater: (prev: Favorite[] | undefined) => Favorite[]) => {
    queryClient.setQueryData<Favorite[]>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setFavorites };
};
