import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { Group } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";
import { hasVrcIdPrefix } from "@/lib/vrcapiModels";

const STALE_TIME = 7 * 24 * 60 * 60 * 1000;
export const useGroup = (groupId?: string, forceRefetch = false) => {
  const auth = useAuth();
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const accountId = auth.user?.id ?? "";
  const hasValidGroupId = hasVrcIdPrefix(groupId, "grp_");
  const queryKey = vrcQueryKeys.group(accountId, groupId ?? "");
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      (await vrc.groupsApi.getGroup({ groupId: groupId! })).data,
    enabled: !!accountId && hasValidGroupId,
    staleTime: forceRefetch ? 0 : STALE_TIME,
    gcTime: STALE_TIME,
    refetchOnMount: forceRefetch ? "always" : true,
    meta: { persist: true },
  });
  return {
    ...query,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    setGroup: (updater: (prev: Group | undefined) => Group) =>
      queryClient.setQueryData<Group>(queryKey, updater),
  };
};
