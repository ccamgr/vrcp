import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { World } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";
import { hasVrcIdPrefix } from "@/lib/vrcapiModels";

const STALE_TIME = 7 * 24 * 60 * 60 * 1000;
export const useWorld = (worldId?: string, forceRefetch = false) => {
  const auth = useAuth();
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const accountId = auth.user?.id ?? "";
  const hasValidWorldId = hasVrcIdPrefix(worldId, "wrld_");
  const queryKey = vrcQueryKeys.world(accountId, worldId ?? "");
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      (await vrc.worldsApi.getWorld({ worldId: worldId! })).data,
    enabled: !!accountId && hasValidWorldId,
    staleTime: forceRefetch ? 0 : STALE_TIME,
    gcTime: STALE_TIME,
    refetchOnMount: forceRefetch ? "always" : true,
    meta: { persist: true },
  });
  return {
    ...query,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    setWorld: (updater: (prev: World | undefined) => World) =>
      queryClient.setQueryData<World>(queryKey, updater),
  };
};
