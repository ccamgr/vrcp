import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoriteLimits } from "./useFavoriteLimits";
import { Avatar } from "@/generated/vrcapi";

/**
 * On-memory
 * @returns
 */
export const useFavAvatars = () => {
  const vrc = useVRChat();
  const auth = useAuth();
  const { data: limits } = useFavoriteLimits();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "state", "favAvatars"];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!limits) return [];
      const npr = 100;
      const avt = limits.maxFavoriteGroups.avatar * limits.maxFavoritesPerGroup.avatar;
      const nReq = Math.max(1, Math.ceil(avt / npr));

      const res = await Promise.all(
        Array.from({ length: nReq }, (_, i) =>
          vrc.avatarsApi.getFavoritedAvatars({ offset: i * npr, n: npr })
        )
      );
      return res.flatMap((r) => r.data);
    },
    enabled: !!auth.user && !!limits,
    staleTime: 10 * 60 * 1000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setFavAvatars = (updater: (prev: Avatar[] | undefined) => Avatar[]) => {
    queryClient.setQueryData<Avatar[]>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setFavAvatars };
};
