import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { FavoriteLimits } from "@/generated/vrcapi";

/**
 * On-memory
 * @returns
 */
export const useFavoriteLimits = () => {
  const vrc = useVRChat();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "state", "favoriteLimits"];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await vrc.favoritesApi.getFavoriteLimits();
      return res.data;
    },
    enabled: !!auth.user,
    staleTime: 60 * 60 * 1000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setFavoriteLimits = (updater: (prev: FavoriteLimits | undefined) => FavoriteLimits) => {
    queryClient.setQueryData<FavoriteLimits>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setFavoriteLimits };
};
