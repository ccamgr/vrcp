# Mobile vrcapi 1.21.0 移行設計

## 目的

vrcapi 1.21.0 では、認証済みユーザーの状態、公開プロフィール、通常のユーザー情報が別のレスポンスモデルになった。Mobile はこの区別を明示し、次を満たす。

- `/auth/user` の 2FA 応答を通常ユーザーとして扱わない。
- 自己紹介、リンク、バッジを `PublicProfile` から正しく表示・更新する。
- ログアウトやアカウント切替後に、前のアカウントの状態キャッシュを表示しない。
- 任意フィールドが欠けても、SQLite への `undefined` 保存や画面クラッシュを起こさない。
- `src/generated/vrcapi/` は手編集しない。

この設計は Mobile の API 呼び出し、TanStack Query、および SQLite のキャッシュ方針を対象とする。Desktop の LAN セッション同期は対象外である。

## API モデルの役割

| モデル / API                                    | 用途                                           | 画面で使用する主な値                                                                      |
| ----------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `AuthenticationApi.getCurrentUser()`            | ログイン、セッション確認、現在のアカウント状態 | `id`、`displayName`、`iconUrl`、`currentAvatar`、`status`、`statusDescription`、`friends` |
| `RequiresTwoFactorAuth`                         | ログイン途中の 2FA 要求                        | `requiresTwoFactorAuth` のみ                                                              |
| `UsersApi.getPublicProfile({ userId, asSelf })` | プロフィール表示                               | `bio`、`bioLinks`、`badges`、`userIcon`、公開プロフィール画像、プロフィール装飾           |
| `UsersApi.getUser({ userId })`                  | ユーザー基本情報、フレンド関係、所在           | `id`、`location`、`status`、`note`、`friendRequestStatus`                                 |
| `UsersApi.updateProfile()`                      | 自己紹介、リンク、プロフィール装飾の更新       | `bio`、`bioLinks`、`userIcon` など                                                        |
| `UsersApi.updateUser()`                         | アカウント状態・設定の更新                     | `status`、`statusDescription`、`pronouns` など                                            |

`CurrentUser` から `bio`、`bioLinks`、`badges`、`userIcon`、`profilePicOverride` を読む実装は廃止する。`CurrentUser` の通常アイコンは `iconUrl` を使う。公開プロフィール由来のアイコンを優先する場面だけ `PublicProfile.userIcon` を使う。

## アプリ内の型と adapter

生成型を UI 全体へ直接流さず、以下の境界を設ける。

```text
getCurrentUser() ──> CurrentAccount
getUser() ─────────> UserCore
getPublicProfile() ─> PublicProfile
                         │
                         └──> UserPresentation (画面用の合成モデル)
```

### `CurrentAccount`

`CurrentUser` をそのまま返さない。`RequiresTwoFactorAuth` を型ガードで除外した後に、認証と現在状態に必要な値だけを保持する。

- 必須: `id`, `displayName`
- 任意: `iconUrl`, `currentAvatar`, `status`, `statusDescription`, `statusHistory`, `friends`, `offlineFriends`
- 永続化する表示値は `iconUrl ?? ""`、`displayName ?? ""` のように必ず文字列化する。

`requiresTwoFactorAuth` が存在する場合は `CurrentAccount` を作らず、ログイン処理は 2FA 画面へ移行する。`id` の存在だけを成功判定や型絞り込みに使わない。

### `UserPresentation`

カード・詳細画面用に `UserCore` と `PublicProfile` を合成する読み取り専用モデルを用意する。プロフィールが未取得でも基本カードは描画できるよう、公開プロフィール項目はすべて optional とする。

- アイコン優先順: `PublicProfile.userIcon` → `UserCore.iconUrl` / `CurrentAccount.iconUrl` → 既存の安全なプレースホルダー
- プロフィール画像: `PublicProfile` の avatar/profile 用 URL → プレースホルダー
- `bio`: `PublicProfile.bio ?? ""`
- `bioLinks`: `PublicProfile.bioLinks ?? []`
- `badges`: `PublicProfile.badges ?? []`

`UserLike` を生成型の大きな union として維持しない。画面コンポーネントは `UserPresentation` または用途別の狭い props 型を受け取る。これにより、型に存在しない旧フィールドへのアクセスを adapter のみに閉じ込める。

## API 呼び出しとキャッシュ設計

### Query key

アカウント固有データには、必ず認証済みの `accountId` を含める。

| データ                       | Query key                                  | staleTime | 永続化            |
| ---------------------------- | ------------------------------------------ | --------: | ----------------- | ----------- |
| 現在アカウント               | `['vrc', 'account', accountId, 'current']` |     60 秒 | しない            |
| 自己の公開プロフィール       | `['vrc', 'account', accountId, 'profile']` |      5 分 | しない            |
| 他ユーザーの基本情報         | `['vrc', 'user', userId, 'core']`          |   24 時間 | SQLite TTL と整合 | SQLite のみ |
| 他ユーザーの公開プロフィール | `['vrc', 'user', userId, 'profile']`       |     30 分 | しない            |
| フレンド一覧                 | `['vrc', 'account', accountId, 'friends']` |      5 分 | しない            |

`accountId` がまだ確定していない間は、アカウント固有 query を `enabled: false` にする。`['vrc', 'state', ...]` のようなアカウント非識別 key は新設しない。

TanStack Query の persister は、認証情報・現在ユーザー・フレンド・ノート・プロフィールなどの account-scoped query を dehydrating しない。既存の状態キャッシュは vrcapi 1.21.0 導入時に buster を更新し、古い形式の永続キャッシュを復元しない。旧キー `TANSTACK_STATE_CACHE` は移行時に一度削除する。

### ログイン

1. `getCurrentUser()` を呼ぶ。
2. `RequiresTwoFactorAuth` なら資格情報・Query を保存せず、2FA 入力へ遷移する。
3. `CurrentUser` なら、前アカウントの account-scoped query を cancel して削除する。
4. SecureStore に Cookie を、SQLite KV に `id`、`displayName`、`iconUrl ?? ""` を保存する。
5. `CurrentAccount` を AuthContext に設定する。
6. メイン画面へ遷移する。自己プロフィールはこの時点で先読みしない。

ログイン直後に Profile タブを開いたときだけ `getPublicProfile({ userId: accountId, asSelf: true })` を実行する。プロフィールを開かない利用者に追加リクエストを発生させない。

### 起動時の自動ログイン

1. SecureStore の Cookie と、SQLite KV の表示用アカウント情報を読む。
2. Cookie の検証後、`getCurrentUser()` を 1 回呼び、通常アカウントか 2FA/失効状態かを判定する。
3. 成功時は `CurrentAccount` と表示用 KV を更新する。失敗時は認証情報と account-scoped query を削除する。
4. 自己公開プロフィールは Profile タブの表示時まで取得しない。

ネットワーク障害を「認証済み」と推測して古い `CurrentAccount` を採用しない。画面は再試行可能な未確認状態として扱う。これは別アカウントのキャッシュを表示する事故を防ぐためである。

### 自己 Profile タブ

Profile タブでは並列に次を扱う。

- `useCurrentAccount()` はアカウント状態・現在アバター・ステータスを表示する。
- `usePublicProfile(accountId, { asSelf: true })` は自己紹介、リンク、バッジ、プロフィール画像を表示する。

現在アカウント取得中は全画面ローディングとする。公開プロフィール取得中は、基本カードを表示し、プロフィール部分だけ skeleton または loading indicator にする。取得エラー時は再試行 UI を出し、空のプロフィールで「値が存在しない」と偽装しない。

### 他ユーザー詳細画面

画面を開いた時点で、次を並列に取得する。

1. `useUserCore(userId)` はまず SQLite TTL キャッシュを返し、期限切れか未保存かつオンラインなら `getUser({ userId })` で更新する。
2. `usePublicProfile(userId)` は `getPublicProfile({ userId })` を呼ぶ。

基本情報の取得失敗時でも有効な SQLite キャッシュがあれば表示を継続する。公開プロフィールは端末 DB に保存せず、取得失敗時はプロフィール欄のみ再試行可能にする。`UserPresentation` は二つの query の値から組み立てる。

### 更新操作後

| 操作                           | 呼び出す API                                | 成功後に更新・失効する query                  |
| ------------------------------ | ------------------------------------------- | --------------------------------------------- |
| Bio 更新                       | `updateProfile({ bio })`                    | 自己 `profile` を応答で更新、失敗時は refetch |
| Bio Links 更新                 | `updateProfile({ bioLinks })`               | 自己 `profile` を応答で更新、失敗時は refetch |
| アイコン・プロフィール装飾更新 | `updateProfile()`                           | 自己 `profile` と `current` を invalidate     |
| ステータス更新                 | `updateUser({ status, statusDescription })` | 自己 `current` と自己 `profile` を invalidate |
| アバター切替                   | `selectAvatar()`                            | 自己 `current` と自己 `profile` を invalidate |
| バッジ更新                     | `updateBadge()`                             | 対象ユーザーの `profile` を invalidate        |

成功時に旧 API の `currentUser.refetch()` だけを呼ぶ方式は使わない。更新したデータの所有 query を更新または invalidate する。

### ログアウトとアカウント切替

1. account-scoped query を `cancelQueries` する。
2. account-scoped query を memory から削除する。
3. persister の旧 state を削除する。
4. SQLite KV の `auth_user_*`、SecureStore の Cookie・保存済み認証情報を削除する。
5. Pipeline 接続を停止してから AuthContext を未認証へ戻す。

ユーザー基本情報 SQLite キャッシュにはフレンド関係・ノートなどアカウント依存の値を含めない。保持が必要なら `ownerAccountId` を schema に追加して namespace を分離する。それまでの移行では既存 `users` キャッシュをログイン成功時とログアウト時に削除する。

## 実装対象

| 優先度 | 対象                                                        | 変更内容                                                                                        |
| ------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| P0     | `AuthContext.tsx`                                           | 2FA 型ガード、`iconUrl` への移行、`undefined` を保存しない、認証 lifecycle に沿った cache clear |
| P0     | `useCurrentUser.ts`                                         | `CurrentAccount` を返す hook へ置換。account ID を含む key に変更                               |
| P0     | `profile.tsx`                                               | `usePublicProfile(..., asSelf: true)` を追加し、プロフィール項目をそこから表示                  |
| P0     | `ChangeBioModal.tsx`, `ChangeBioLinksModal.tsx`             | `updateProfile()` を使用し自己 `profile` query を更新                                           |
| P1     | `ChangeStatusModal.tsx`, `ChangeAvatarModal.tsx`            | `CurrentAccount` を参照し、対応する query を invalidate                                         |
| P1     | `useUser.ts`, `details/user/[id]/index.tsx`                 | 基本情報と公開プロフィールを分けて取得・合成                                                    |
| P1     | `lib/vrchat.ts`, user card components, `db/schema/users.ts` | `UserPresentation` adapter と `iconUrl` ベースの画像選択へ移行                                  |
| P1     | `queryClient.ts`, `useCacheManager.ts`                      | account-scoped persistence の除外、buster、logout 用 clear helper                               |
| P2     | `generated/vrcpipline/type.ts`                              | `GroupLimitedMember` 廃止に合わせた Pipeline 型の再生成または上流仕様修正                       |
| P2     | vrcapi generator / OpenAPI 定義                             | `TransactionAgreement = TransactionAgreement                                                    | string` の自己参照生成を上流で修正し、再生成する |

## 移行順序

1. OpenAPI 生成物の自己参照型と Pipeline の古い型参照を、生成元または Generator 側で解消する。
2. `CurrentAccount`、`PublicProfile` hook、型ガード、Query key helper を追加する。
3. AuthContext とログイン・自動ログイン・ログアウトを移行する。
4. 自己 Profile と Bio/Bio Links 更新を移行する。
5. 他ユーザー詳細、カード、SQLite user cache を移行する。
6. 古い query key と永続 state を buster で無効化する。

各段階で生成型への `as CurrentUser` などの強制キャストは導入しない。レスポンス種別が増えた場合に再び実行時エラーを隠してしまうためである。

## 検証計画

- `getCurrentUser()` が `RequiresTwoFactorAuth` を返す fixture で、認証情報・表示用 KV・Query が保存されないこと。
- `iconUrl` が未指定の通常ユーザーで、SQLite へ空文字が保存され、ログイン成功となること。
- 自己 Profile タブで `PublicProfile` の bio、links、badges が表示されること。
- Bio / Bio Links 更新後、Profile を閉じずに新しい値が表示されること。
- アカウント A をログアウトしてアカウント B へログインしたとき、A の状態・フレンド・プロフィールが表示されないこと。
- オフライン時に有効期限内の他ユーザー基本情報を表示でき、公開プロフィール欄だけが再試行可能なエラーになること。
- `npx tsc --noEmit` が生成物を含めて成功すること。
