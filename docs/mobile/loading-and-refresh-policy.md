# モバイルのローディングと更新 UI 方針

モバイル画面では、初期表示・ユーザーが明示的に行う更新・TanStack Query によるバックグラウンド再取得を別の状態として扱う。これにより、Android / iOS のネイティブなプル更新インジケーターと、画面中央のローディング表示が同時に出ることを防ぐ。

## 状態と表示

| 状態 | 意味 | UI |
| --- | --- | --- |
| 初期ロード | 画面表示に必要なデータがまだない | `LoadingIndicator` を表示する |
| 手動更新 | ユーザーがリストを引っ張って更新した | ネイティブの `RefreshControl` / `FlatList` / `SectionList` の更新表示と、スピナーなしの半透明オーバーレイを表示する |
| バックグラウンド再取得 | stale な Query の自動再検証、画面復帰、キャッシュ更新など | 操作を妨げるローディング UI は表示しない |
| ページ追加読み込み | 無限リストの次ページ取得 | リスト末尾の UI だけを必要に応じて表示する |

`isFetching` は上記のすべてを含むため、`refreshing` や全画面オーバーレイの直接の入力にしない。初期表示は Query の `isLoading` とデータの有無で判断する。

## 実装方法

`mobile/src/hooks/usePullToRefresh.ts` を、Promise を返す明示更新関数に使う。この Hook が手動更新中だけ `isRefreshing` を `true` にし、成功・失敗を問わず完了時に戻す。

```tsx
const { data, isLoading, refetch } = useExample();
const { isRefreshing, onRefresh } = usePullToRefresh(refetch);

return (
  <>
    {isLoading && !data && <LoadingIndicator absolute />}
    {isRefreshing && <LoadingIndicator absolute overlayOnly />}
    <FlatList refreshing={isRefreshing} onRefresh={onRefresh} />
  </>
);
```

複数の Query を更新する画面では、`Promise.all` を返す `useCallback` を作り、それを `usePullToRefresh` に渡す。手動実装の API 取得でも、初期ロード用と `isRefreshing` を独立した state として持つ。

## プラットフォーム差異

プル更新の見た目は React Native のネイティブ `RefreshControl` に委ねる。Android と iOS でインジケーターの外観は異なる。手動更新中は `LoadingIndicator` の `overlayOnly` を併用して背景だけを暗くし、中央のスピナーや文言は表示しない。初期ロードでは従来どおりスピナーを表示する。
