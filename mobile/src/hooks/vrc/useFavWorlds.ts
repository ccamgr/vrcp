import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoriteLimits } from "./useFavoriteLimits";
import { FavoritedWorld } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";

/**
 * On-memory
 * @returns
 */
export const useFavWorlds = () => {
  const vrc = useVRChat();
  const auth = useAuth();
  const { data: limits } = useFavoriteLimits();
  const queryClient = useQueryClient();
  const QUERY_KEY = vrcQueryKeys.favWorlds(auth.user?.id ?? "");

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!limits) return [];
      const npr = 100;
      const wld =
        limits.maxFavoriteGroups.world * limits.maxFavoritesPerGroup.world;
      const nReq = Math.max(1, Math.ceil(wld / npr));

      const res = await Promise.all(
        Array.from({ length: nReq }, (_, i) =>
          vrc.worldsApi.getFavoritedWorlds({ offset: i * npr, n: npr }),
        ),
      );
      return res.flatMap((r) => r.data);
    },
    enabled: !!auth.user && !!limits,
    staleTime: 10 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    meta: { persist: true },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setFavWorlds = (
    updater: (prev: FavoritedWorld[] | undefined) => FavoritedWorld[],
  ) => {
    queryClient.setQueryData<FavoritedWorld[]>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setFavWorlds };
};
