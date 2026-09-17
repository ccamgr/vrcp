import { useQuery } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { isCurrentAccount } from "@/lib/vrcapiModels";

/**
 * On-memory
 * @returns
 */
export const useCurrentUser = () => {
  const vrc = useVRChat();
  const auth = useAuth();

  return useQuery({
    queryKey: ["vrc", "account", auth.user?.id, "current"],
    queryFn: async () => {
      const res = await vrc.authenticationApi.getCurrentUser();
      if (!isCurrentAccount(res.data)) {
        throw new Error(
          "Current user request returned a two-factor authentication response",
        );
      }
      return res.data;
    },
    enabled: !!auth.user?.id,
    // Short staleTime for real-time data
    staleTime: 60 * 1000,
    meta: { persist: false },
  });
};
