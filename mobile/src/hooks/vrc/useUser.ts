import { useQuery, useQueryClient, onlineManager } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { usersRepo } from "@/db/repogitories";
import { User } from "@/generated/vrcapi";
import { convertFromDBUser, convertToDBUser } from "@/db/schema";

const EXPIRATION = 1 * 24 * 60 * 60 * 1000; // 1 day

/**
 * Hook with offline-first caching with SQLite for user data
 * @param userId
 * @returns
 */
export const useUser = (userId?: string) => {
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "db", "user", userId];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const now = Date.now();

      // 1. Get current cache (regardless of expiration)
      const cached = await usersRepo.get(userId);

      // 2. If valid cache exists, return it immediately
      if (cached?.expiresAt && cached.expiresAt > now) {
        return convertFromDBUser(cached);
      }

      // 3. If expired or no cache, check network status
      if (!onlineManager.isOnline()) {
        if (cached) {
          console.log(`[useUser] Offline: Using expired cache for ${userId}`);
          return convertFromDBUser(cached);
        }
        throw new Error("Offline and no cache available");
      }

      try {
        // 4. Try to fetch fresh data from API
        const res = await vrc.usersApi.getUser({ userId });

        // Update SQLite cache (Fire and forget)
        usersRepo.upsert({
          ...convertToDBUser(res.data),
          expiresAt: now + EXPIRATION,
        }).catch(console.error);

        return res.data;
      } catch (error) {
        // 5. Offline Fallback: If API fails but we have an expired cache, use it
        if (cached) {
          console.log(`[useUser] Offline fallback for ${userId}`);
          return convertFromDBUser(cached);
        }
        throw error;
      }
    },
    enabled: !!userId && !!vrc.usersApi,
    staleTime: EXPIRATION,
    networkMode: 'offlineFirst',
  });
  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    query.refetch();
  };
  const setUser = (updater: (prev: User | undefined) => User) => {
    queryClient.setQueryData<User>(QUERY_KEY, updater);
  };

  return { ...query, refetch, setUser };
};
