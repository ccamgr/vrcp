import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/generated/vrcapi";

/**
 * On-memory
 * @returns
 */
export const useNotifications = () => {
  const vrc = useVRChat();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "state", "notifications"];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await vrc.notificationsApi.getNotifications({ offset: 0, n: 100 });
      return res.data;
    },
    enabled: !!auth.user,
    staleTime: 60 * 1000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const setNotifications = (updater: (prev: Notification[] | undefined) => Notification[]) => {
    queryClient.setQueryData<Notification[]>(QUERY_KEY, updater);
  };

  return { ...query, refresh, setNotifications };
};
