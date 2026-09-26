import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { User } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";
import { hasVrcIdPrefix, toUserCore } from "@/lib/vrcapiModels";

const STALE_TIME = 24 * 60 * 60 * 1000;
export const useUser = (userId?: string, forceRefetch = false) => {
  const auth = useAuth();
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const accountId = auth.user?.id ?? "";
  const hasValidUserId = hasVrcIdPrefix(userId, "usr_");
  const queryKey = vrcQueryKeys.user(accountId, userId ?? "");
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      toUserCore((await vrc.usersApi.getUser({ userId: userId! })).data),
    enabled: !!accountId && hasValidUserId,
    staleTime: forceRefetch ? 0 : STALE_TIME,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnMount: forceRefetch ? "always" : true,
    meta: { persist: true },
  });
  return {
    ...query,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    setUser: (updater: (prev: User | undefined) => User) =>
      queryClient.setQueryData<User>(queryKey, updater),
  };
};
