# User Mutual Friends / Groups 設計

## 目的

Mobile のユーザー詳細画面のサイドメニューに、対象ユーザーとの共通フレンドと共通グループを表示する導線を追加する。

対象ユーザーの公開グループ一覧とは別機能として、ログイン中の利用者と対象ユーザーが共有する情報だけを VRChat API から取得する。

## 対象と対象外

対象:

- User Detail のサイドメニューで「ユーザーのグループ」の直後に表示する 2 項目
- 共通フレンド一覧と共通グループ一覧の専用画面
- TanStack Query による取得、ページング、手動再読込、エラー表示
- 日本語を含む既存の全ロケールへの画面・メニュー文言の追加

対象外:

- Desktop への同等機能の追加
- VRChat API の生成コード変更
- 共通情報の SQLite 保存、永続 Query cache への保存
- グループメンバーの追加取得、共通フレンドからの一括操作

## API 契約

生成済み v1.21.0 client の `UsersApi` をそのまま利用する。

| 表示 | API | 引数 | 戻り値 |
| --- | --- | --- | --- |
| 共通フレンド | `getMutualFriends` | `userId`, `n`, `offset` | `MutualFriend[]` |
| 共通グループ | `getMutualGroups` | `userId`, `n`, `offset` | `LimitedUserGroups[]` |

各 API は最大 100 件のページングをサポートする。実装では `n = 100`、初回 `offset = 0`、以後は取得済み件数を `offset` とする。応答件数が 100 未満なら最終ページとする。

`getMutuals` は件数だけを返すが、User Detail を開くたびに追加リクエストを発生させないため使用しない。メニュー項目に件数は表示しない。

## 画面・ルーティング

```text
User Detail
  └─ side menu
      ├─ ユーザーのワールド
      ├─ ユーザーのグループ
      ├─ 共通のフレンド  -> /details/user/:id/mutual-friends
      └─ 共通のグループ  -> /details/user/:id/mutual-groups
```

追加するファイルは以下とする。

```text
mobile/src/
├── app/details/user/[id]/
│   ├── mutual-friends.tsx
│   └── mutual-groups.tsx
├── hooks/vrc/
│   ├── useMutualFriends.ts
│   └── useMutualGroups.ts
└── lib/route.ts
```

`app/details/_layout.tsx` に 2 画面の Stack title を追加する。User Detail の `menuItems` には「ユーザーのグループ」の次に 2 項目を加える。

ログイン中のユーザー自身の Detail を開いている場合、共通情報は意味を持たない。その場合は両メニューを `hidden` にする。ログイン中のユーザー情報をまだ取得できていない場合は、不要な API 呼び出しを避けるため遷移を許可しない。

## UI 設計

### 共通フレンド

- `FlatList` で `MutualFriend` を表示する。
- 既存 `CardViewUser` を利用する。`MutualFriend` は `id`、`displayName`、`iconUrl`、`status`、`statusDescription` を持ち、既存の `UserLike` 表示契約を満たす。
- カード選択時は `routeToUser(friend.id)` で通常の User Detail を開く。
- `onEndReached` で次ページを取得する。初回・次ページ取得中は footer の `LoadingIndicator` を表示する。
- pull-to-refresh は先頭ページから再取得する。

### 共通グループ

- 既存の User Groups と同じカードグリッドを使用する。
- `LimitedUserGroups` の `id` と `name`、`bannerUrl` を `CardViewGroup` に渡す。
- カード選択時は `routeToGroup(group.id)` で Group Detail を開く。
- 既存のカード列数設定 `uiOptions_cardViewColumns` を反映する。
- `onEndReached` と pull-to-refresh の挙動は共通フレンドと同じにする。

### 状態表示

| 状態 | 表示 | 操作 |
| --- | --- | --- |
| 初回取得中 | 全画面 LoadingIndicator | なし |
| 取得成功・空 | 「共通のフレンド／グループはいません」 | pull-to-refresh |
| 次ページ取得中 | List footer の LoadingIndicator | スクロール継続可 |
| 初回取得失敗 | 失敗メッセージと再試行ボタン | 再試行 |
| 再読込失敗 | 既存一覧を残し Toast | pull-to-refresh で再試行 |
| API が 403 / 404 | 共通情報を取得できない旨の画面 | 再試行 |

403 / 404 の詳細を「相手が拒否した」と断定しない。相手の mutual settings、プライバシー、API 側の仕様変更など複数の要因があるためである。

## データ取得・キャッシュ

両 hook は `useInfiniteQuery` を使い、画面コンポーネントに API 呼び出しや offset 管理を置かない。

```ts
['vrc', 'api', 'user', userId, 'mutual-friends']
['vrc', 'api', 'user', userId, 'mutual-groups']
```

- `enabled` は `userId` が存在し、`usersApi` が初期化済みで、対象が自分自身ではないときだけ `true` とする。
- `initialPageParam` は `0`、`getNextPageParam` は最後の応答が 100 件未満なら `undefined`、それ以外は取得済み件数とする。
- flatten 時に `id` 単位で重複排除する。ネットワーク再試行やページ境界の重複で同じカードを表示しない。
- `staleTime` は 5 分、`gcTime` は 30 分とする。
- `meta: { persist: false }` を設定する。現行 persister は `['vrc', 'state', ...]` だけを永続化するが、共通フレンド・グループはプライバシー上の変動が大きいため、明示的に永続化対象外とする。
- `refetch` は対象 query key だけを invalidate する。friends / groups / user detail のキャッシュ全体を消さない。

Query が dispose された後も、30 分以内に同じ対象を再度開く場合はメモリ内の表示を先に使い、バックグラウンドで新しい内容を確認する。

## 責務分離

| 層 | 責務 |
| --- | --- |
| `generated/vrcapi` | OpenAPI 由来の API 型・`UsersApi` メソッド。編集しない。 |
| `hooks/vrc/useMutual*.ts` | query key、ページング、API 呼び出し、重複排除、再取得。 |
| `lib/route.ts` | 型を持たない画面遷移 URL の組み立てだけ。 |
| `app/details/user/[id]/*` | 表示、カード押下、refresh と loading/error の描画。 |
| User Detail | サイドメニュー導線だけ。共通一覧 API を事前取得しない。 |
| i18n | 表示文言。画面内に翻訳文字列を直接書かない。 |

## i18n

既存の各 locale に以下を追加する。キー名は実装時に既存の `pages.detail_user_*` 命名と合わせる。

```text
pages.detail_user.menuLabel_mutualFriends
pages.detail_user.menuLabel_mutualGroups
pages.detail_user_mutual_friends.label
pages.detail_user_mutual_friends.empty
pages.detail_user_mutual_friends.unavailable
pages.detail_user_mutual_groups.label
pages.detail_user_mutual_groups.empty
pages.detail_user_mutual_groups.unavailable
common.retry
```

既存 `common.retry` がある場合は再利用し、重複キーを追加しない。

## エラー処理

- API error の生のレスポンス、Cookie、Authorization、URL query は UI・Toast・console に出さない。
- 初回失敗は画面内の一般化した文言と再試行ボタンを出す。開発用ログが必要な場合だけ既存 logger に短い error code を記録する。
- 次ページ取得が失敗しても、先に取得済みのカード一覧は残す。
- `hasNextPage` が `false` の後は API を呼ばない。
- 画面離脱後に結果が反映されないよう、TanStack Query の lifecycle に任せる。コンポーネント独自の async state は持たない。

## 検証計画

- 共通フレンド 0 件、1 件、100 件、101 件以上で初回・追加ロード・空表示が正しいこと。
- 共通グループでカード列数設定、Group Detail 遷移、重複排除が正しいこと。
- 対象ユーザーを連続して切り替えても、別 userId の結果が混ざらないこと。
- pull-to-refresh 後に古い一覧が重複せず、次ページ offset が先頭から正しく再計算されること。
- 403 / 404 / network error / timeout で既存一覧の保持と再試行が正しく動くこと。
- ログアウト後、またはアカウント変更後に前の利用者の mutual query が表示されないこと。
- `n = 100` と offset が生成済み API の引数契約に一致すること。
- TypeScript check、対象ロケールの JSON 構文、Mobile lint を実行すること。

## 実装前の確認事項

- mutual API の 403 / 404 がどの設定・関係性で返るかは、実アカウントで確認して表示文言を最終調整する。
- `MutualFriend` は profile picture を返さないため、既存 `CardViewUser` の `iconUrl` fallback が十分に見やすいかを端末で確認する。
- 既存 User Groups 画面の offset 管理には独自 state がある。共通一覧の実装でその方式を複製せず、`useInfiniteQuery` に統一する。
