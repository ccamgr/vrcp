import { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFriends } from "./useFriends";
import { useFavorites } from "./useFavorites";
import { LimitedUserFriend, Favorite } from "@/generated/vrcapi";
import { sortFriendWithStatus } from "@/lib/funcs/sortFriendWithStatus";

export const useFavFriends = () => {
  const queryClient = useQueryClient();
  const QUERY_KEY = ["vrc", "state", "favFriends"];

  // 1. ソースとなるデータを取得
  const friendsReq = useFriends();
  const favsReq = useFavorites();

  // 2. フィルタリングとソートの計算ロジック
  const deriveFavFriends = (friends: LimitedUserFriend[], favorites: Favorite[]) => {
    const friFavSet = new Set(
      favorites.filter((ff) => ff.type === "friend").map((ff) => ff.favoriteId)
    );
    const filtered = friends.filter((f) => friFavSet.has(f.id));
    return sortFriendWithStatus(filtered);
  };

  // 3. このフック自身のクエリ定義
  const query = useQuery({
    queryKey: QUERY_KEY,
    // queryFn は「現在のキャッシュを返すだけ」にする（受動的）
    queryFn: () => queryClient.getQueryData<LimitedUserFriend[]>(QUERY_KEY) ?? [],
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7日間
  });

  // 4. ソースが更新されたら、自身のキャッシュに反映する
  useEffect(() => {
    if (friendsReq.data && favsReq.data) {
      const result = deriveFavFriends(friendsReq.data, favsReq.data);
      queryClient.setQueryData(QUERY_KEY, result);
    }
  }, [friendsReq.data, favsReq.data]);

  /** * 💡 ここがポイント：useQuery の各関数をオーバーライドして「ソース」と同期させる
   */

  // ソースのどちらかがフェッチ中なら、このフックもフェッチ中とする
  const isFetching = friendsReq.isFetching || favsReq.isFetching || query.isFetching;
  const isLoading = friendsReq.isLoading || favsReq.isLoading || query.isLoading;

  // refetch() が呼ばれたら、ソースの両方を叩き直す
  const refetch = async () => {
    // 両方の API を叩き、結果を待つ
    const [fResult, favResult] = await Promise.all([
      friendsReq.refetch(),
      favsReq.refetch()
    ]);

    // 両方の取得が成功していれば、再計算してキャッシュを更新
    if (fResult.data && favResult.data) {
      const result = deriveFavFriends(fResult.data, favResult.data);
      queryClient.setQueryData(QUERY_KEY, result);
      return { data: result, error: null };
    }
    return { data: query.data, error: fResult.error || favResult.error };
  };

  // refresh() (キャッシュの無効化) もソースに伝播させる
  const refresh = () => {
    friendsReq.refresh();
    favsReq.refresh();
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return {
    ...query,      // 永続化されたデータや状態
    data: query.data ?? [],
    isFetching,    // ソースと連動
    isLoading,     // ソースと連動
    refetch,       // ソースを叩きに行く
    refresh,       // ソースを無効化する
  };
};
