import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { GroupInstance } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";
import { hasVrcIdPrefix } from "@/lib/vrcapiModels";

const STALE_TIME = 30 * 1000;
const GC_TIME = 5 * 60 * 1000;

export const useGroupInstances = (groupId?: string, enabled = true) => {
  const auth = useAuth();
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const accountId = auth.user?.id ?? "";
  const hasValidGroupId = hasVrcIdPrefix(groupId, "grp_");
  const queryKey = vrcQueryKeys.groupInstances(accountId, groupId ?? "");
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      (await vrc.groupsApi.getGroupInstances({ groupId: groupId! })).data,
    enabled: enabled && !!accountId && hasValidGroupId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnMount: "always",
  });

  return {
    ...query,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    setInstances: (
      updater: (previous: GroupInstance[] | undefined) => GroupInstance[],
    ) => queryClient.setQueryData<GroupInstance[]>(queryKey, updater),
  };
};
