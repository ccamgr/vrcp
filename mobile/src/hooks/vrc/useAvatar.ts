import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { Avatar } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";
import { hasVrcIdPrefix } from "@/lib/vrcapiModels";

const STALE_TIME = 7 * 24 * 60 * 60 * 1000;
export const useAvatar = (avatarId?: string, forceRefetch = false) => {
  const auth = useAuth();
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const accountId = auth.user?.id ?? "";
  const hasValidAvatarId = hasVrcIdPrefix(avatarId, "avtr_");
  const queryKey = vrcQueryKeys.avatar(accountId, avatarId ?? "");
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      (await vrc.avatarsApi.getAvatar({ avatarId: avatarId! })).data,
    enabled: !!accountId && hasValidAvatarId,
    staleTime: forceRefetch ? 0 : STALE_TIME,
    gcTime: STALE_TIME,
    refetchOnMount: forceRefetch ? "always" : true,
    meta: { persist: true },
  });
  return {
    ...query,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    setAvatar: (updater: (prev: Avatar | undefined) => Avatar) =>
      queryClient.setQueryData<Avatar>(queryKey, updater),
  };
};
