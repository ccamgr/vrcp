import { useQuery, useQueryClient, onlineManager } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { worldsRepo } from "@/db/repogitories";
import { World } from "@/generated/vrcapi";
import { convertFromDBWorld, convertToDBWorld } from "@/db/schema";

const EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hook with offline-first caching with SQLite for world data
 * @param worldId
 * @returns
 */
export const useWorld = (worldId?: string) => {
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "db", "world", worldId];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!worldId) throw new Error("World ID is required");
      const now = Date.now();

      const cached = await worldsRepo.get(worldId);

      if (cached?.expiresAt && cached.expiresAt > now) {
        return convertFromDBWorld(cached);
      }

      if (!onlineManager.isOnline()) {
        if (cached) {
          console.log(`[useWorld] Offline: Using expired cache for ${worldId}`);
          return convertFromDBWorld(cached);
        }
        throw new Error("Offline and no cache available");
      }

      try {
        const res = await vrc.worldsApi.getWorld({ worldId });

        worldsRepo.upsert({
          ...convertToDBWorld(res.data),
          expiresAt: now + EXPIRATION,
        }).catch(console.error);

        return res.data;
      } catch (error) {
        if (cached) {
          console.log(`[useWorld] Offline fallback for ${worldId}`);
          return convertFromDBWorld(cached);
        }
        throw error;
      }
    },
    enabled: !!worldId && !!vrc.worldsApi,
    staleTime: EXPIRATION,
    networkMode: 'offlineFirst',
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setWorld = (updater: (prev: World | undefined) => World) => {
    queryClient.setQueryData<World>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setWorld };
};
