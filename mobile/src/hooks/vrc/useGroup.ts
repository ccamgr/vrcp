import { useQuery, useQueryClient, onlineManager } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { groupsRepo } from "@/db/repogitories";
import { Group } from "@/generated/vrcapi";
import { convertFromDBGroup, convertToDBGroup } from "@/db/schema";

const EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Hook with offline-first caching with SQLite for group data
 * @param groupId
 * @returns
 */
export const useGroup = (groupId?: string) => {
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "db", "group", groupId];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!groupId) throw new Error("Group ID is required");
      const now = Date.now();

      const cached = await groupsRepo.get(groupId);

      if (cached?.expiresAt && cached.expiresAt > now) {
        return convertFromDBGroup(cached);
      }

      if (!onlineManager.isOnline()) {
        if (cached) {
          console.log(`[useGroup] Offline: Using expired cache for ${groupId}`);
          return convertFromDBGroup(cached);
        }
        throw new Error("Offline and no cache available");
      }

      try {
        const res = await vrc.groupsApi.getGroup({ groupId });

        groupsRepo.upsert({
          ...convertToDBGroup(res.data),
          expiresAt: now + EXPIRATION,
        }).catch(console.error);

        return res.data;
      } catch (error) {
        if (cached) {
          console.log(`[useGroup] Offline fallback for ${groupId}`);
          return convertFromDBGroup(cached);
        }
        throw error;
      }
    },
    enabled: !!groupId && !!vrc.groupsApi,
    staleTime: EXPIRATION,
    networkMode: 'offlineFirst',
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setGroup = (updater: (prev: Group | undefined) => Group) => {
    queryClient.setQueryData<Group>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setGroup };
};
