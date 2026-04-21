import { useQuery, useQueryClient, onlineManager } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { avatarsRepo } from "@/db/repogitories";
import { Avatar } from "@/generated/vrcapi";
import { convertFromDBAvatar, convertToDBAvatar } from "@/db/schema";

const EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hook with offline-first caching with SQLite for avatar data
 * @param avatarId
 * @returns
 */
export const useAvatar = (avatarId?: string) => {
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "db", "avatar", avatarId];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!avatarId) throw new Error("Avatar ID is required");
      const now = Date.now();

      // 1. Get current cache (regardless of expiration)
      const cached = await avatarsRepo.get(avatarId);

      // 2. If valid cache exists, return it immediately
      if (cached?.expiresAt && cached.expiresAt > now) {
        return convertFromDBAvatar(cached);
      }

      // 3. If expired or no cache, check network status
      // If offline and we have an expired cache, use it as a fallback
      if (!onlineManager.isOnline()) {
        if (cached) {
          console.log(`[useAvatar] Offline: Using expired cache for ${avatarId}`);
          return convertFromDBAvatar(cached);
        }
        throw new Error("Offline and no cache available");
      }

      try {
        // 3. Try to fetch fresh data from API
        const res = await vrc.avatarsApi.getAvatar({ avatarId });

        // Update SQLite cache (Fire and forget)
        avatarsRepo.upsert({
          ...convertToDBAvatar(res.data),
          expiresAt: now + EXPIRATION,
        }).catch(console.error);

        return res.data;
      } catch (error) {
        // 4. Offline Fallback: If API fails but we have an expired cache, use it
        if (cached) {
          console.log(`[useAvatar] Offline fallback for ${avatarId}`);
          return convertFromDBAvatar(cached);
        }
        throw error; // No cache and API failed
      }
    },
    enabled: !!avatarId && !!vrc.avatarsApi,
    staleTime: EXPIRATION,
    networkMode: 'offlineFirst',
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setAvatar = (updater: (prev: Avatar | undefined) => Avatar) => {
    queryClient.setQueryData<Avatar>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setAvatar };
};
