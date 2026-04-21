import { useQuery } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { CurrentUser } from "@/generated/vrcapi";
import { useAuth } from "@/contexts/AuthContext";

/**
 * On-memory
 * @returns
 */
export const useCurrentUser = () => {
  const vrc = useVRChat();
  const auth = useAuth();

  return useQuery({
    queryKey: ["vrc", "state", "currentUser"],
    queryFn: async () => {
      const res = await vrc.authenticationApi.getCurrentUser();
      return res.data;
    },
    enabled: !!auth.user,
    // Short staleTime for real-time data
    staleTime: 60 * 1000,
  });
};
