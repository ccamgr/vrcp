import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useVRChat } from "@/contexts/VRChatContext";
import {
  type InfiniteListPageRequest,
  useInfiniteList,
} from "@/hooks/useInfiniteList";
import { LimitedUserGroups } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";
import { hasVrcIdPrefix } from "@/lib/vrcapiModels";

const PAGE_SIZE = 100;
const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

export const useMutualGroups = (
  userId?: string,
  onError?: (error: unknown) => void,
) => {
  const auth = useAuth();
  const vrc = useVRChat();
  const canFetch =
    hasVrcIdPrefix(userId, "usr_") &&
    !!auth.user?.id &&
    userId !== auth.user.id;
  const queryKey = vrcQueryKeys.mutualGroups(auth.user?.id ?? "", userId ?? "");
  const fetchPage = useCallback(
    async ({ offset, pageSize }: InfiniteListPageRequest) => {
      if (!userId) throw new Error("User ID is required");
      const res = await vrc.usersApi.getMutualGroups({
        userId,
        n: pageSize,
        offset,
      });
      return res.data;
    },
    [userId, vrc.usersApi],
  );

  return {
    ...useInfiniteList<LimitedUserGroups>({
      queryKey,
      enabled: canFetch && !!vrc.usersApi,
      pageSize: PAGE_SIZE,
      fetchPage,
      onError,
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
      refetchOnMount: true,
      persist: false,
    }),
    canFetch,
  };
};
