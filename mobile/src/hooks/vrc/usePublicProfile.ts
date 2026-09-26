import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { PublicProfile } from "@/generated/vrcapi";
import { vrcQueryKeys } from "@/lib/queryClient";
import { hasVrcIdPrefix } from "@/lib/vrcapiModels";

export const usePublicProfile = (userId?: string, asSelf = false) => {
  const auth = useAuth();
  const vrc = useVRChat();
  const queryClient = useQueryClient();
  const hasValidUserId = hasVrcIdPrefix(userId, "usr_");
  const isSelfProfile = asSelf && userId === auth.user?.id;
  const queryKey = vrcQueryKeys.publicProfile(
    auth.user?.id ?? "",
    userId ?? "",
    asSelf,
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const res = await vrc.usersApi.getPublicProfile({ userId, asSelf });
      return res.data;
    },
    enabled:
      !!auth.user?.id && hasValidUserId && (!asSelf || isSelfProfile),
    staleTime: asSelf ? 10 * 60 * 1000 : 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    meta: { persist: false },
  });

  const setProfile = (profile: PublicProfile) => {
    queryClient.setQueryData(queryKey, profile);
  };

  return { ...query, setProfile };
};
