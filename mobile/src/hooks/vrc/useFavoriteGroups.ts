import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { FavoriteGroup } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";

/**
 * On-memory
 * @returns
 */
export const useFavoriteGroups = () => {
  const vrc = useVRChat();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const QUERY_KEY = vrcQueryKeys.favoriteGroups(auth.user?.id ?? "");

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await vrc.favoritesApi.getFavoriteGroups();
      return res.data;
    },
    enabled: !!auth.user,
    staleTime: 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    meta: { persist: true },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setFavoriteGroups = (
    updater: (prev: FavoriteGroup[] | undefined) => FavoriteGroup[],
  ) => {
    queryClient.setQueryData<FavoriteGroup[]>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setFavoriteGroups };
};
