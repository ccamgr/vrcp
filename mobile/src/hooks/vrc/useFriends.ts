import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "@/contexts/VRChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUser } from "./useCurrentUser";
import { LimitedUserFriend } from "@/generated/vrcapi";

/**
 * On-memory
 * @returns
 */
export const useFriends = () => {
  const vrc = useVRChat();
  const auth = useAuth();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "state", "friends"];

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const npr = 100;
      let nReqOnline = 2, nReqOffline = 2;

      if (currentUser) {
        const all = currentUser.friends?.length ?? 0;
        const off = currentUser.offlineFriends?.length ?? 0;
        nReqOnline = Math.max(1, Math.ceil((all - off) / npr));
        nReqOffline = Math.max(1, Math.ceil(off / npr));
      }

      const res = await Promise.all([
        ...Array.from({ length: nReqOnline }, (_, i) =>
          vrc.friendsApi.getFriends({ offset: i * npr, n: npr, offline: false })
        ),
        ...Array.from({ length: nReqOffline }, (_, i) =>
          vrc.friendsApi.getFriends({ offset: i * npr, n: npr, offline: true })
        ),
      ]);

      return res.flatMap((r) => r.data);
    },
    enabled: !!auth.user && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  // 3. 隠蔽化した便利メソッドを定義

  // 全体強制リフレッシュ (invalidateQueries相当)
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  // キャッシュの直接書き換え (Pipelineからのオンライン/オフライン通知などに使う)
  const setFriends = (updater: (prev: LimitedUserFriend[] | undefined) => LimitedUserFriend[]) => {
    queryClient.setQueryData<LimitedUserFriend[]>(QUERY_KEY, updater);
  };

  // 4. 元の query オブジェクトに自作メソッドをマージして返す
  return {
    ...query, // data, isLoading, error などはそのまま使える
    refresh,
    setFriends,
  };
};
