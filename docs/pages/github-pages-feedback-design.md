# GitHub Pages フィードバックフォーム設計

## 目的

GitHub Pages に配信する公開サイトへフィードバックフォームを追加する。Desktop と Mobile は Discord Webhook を直接呼び出さず、OS・platform・アプリ版・発生日時・エラー概要を URL パラメーターへ付与して、このフォームを外部ブラウザで開く。

フォームは利用者の自由記述と任意の返信先メールアドレスを入力させ、Discord Incoming Webhook へ直接送信する。現時点では Webhook URL が配信済みの静的 JavaScript から取得可能であることを許容する。

## 背景と制約

GitHub Pages は静的 HTML、CSS、JavaScript のホスティングであり、任意のサーバーサイド API や Secret を実行・保持できない。このため、GitHub Pages だけで Discord Webhook URL を秘匿することは不可能である。

Webhook URL をブラウザが復号して送信する以上、難読化しても利用者は URL を取得できる。文字列の分割・Base64・軽い暗号化は、リポジトリやページの単純検索を避ける効果に限られ、認可・送信元検証・濫用防止にはならない。

この制約を受容する間は、Webhook が漏えいした場合に再発行できる運用と、Webhook 専用チャンネルを用意することが必須である。Webhook URL を秘匿したい、送信元を検証したい、またはレート制限を強制したい場合は、Cloudflare Workers 等のサーバーサイド中継へ移行する。

## 対象と対象外

対象:

- GitHub Pages 上の `/feedback/` ページ
- URL パラメーターによるアプリ情報・エラー概要の事前表示
- 自由記述、任意の返信先メールアドレス、診断コンテキストの Discord Webhook への転送
- Desktop/Mobile のフィードバック導線をページ URL に集約する変更
- 静的成果物に埋め込む Webhook URL の軽い難読化
- プライバシーポリシーと開発者向けドキュメントの更新

対象外:

- Webhook URL の秘匿、送信者認証、サーバー側のレート制限
- Discord 以外への保存、チケット管理、返信機能
- ログファイル、VRChat Cookie、認証情報、ユーザー ID の自動送信
- GitHub Pages の配信先・ドメイン・既存 `/vrcp` base の変更

## 構成

```text
Desktop / Mobile
       │  Open external browser with context query
       ▼
GitHub Pages: /vrcp/feedback/
       │  Browser fetch (Discord Webhook URL is recoverable)
       ▼
Discord Incoming Webhook
       │
       ▼
Dedicated feedback channel
```

GitHub Pages のサイト URL は引き続き `https://ccamgr.github.io/vrcp/` とする。`astro.config.mjs` の `base: '/vrcp'` は変更しない。

## フィードバック画面

### URL 契約

アプリは次の URL を外部ブラウザで開く。値は必ず URL エンコードする。

```text
https://ccamgr.github.io/vrcp/feedback/
  ?app=desktop
  &version=0.0.2
  &platform=windows
  &occurredAt=2026-09-24T12%3A34%3A56.000Z
  &error=Unable%20to%20sync%20sessions
```

受け付ける query は以下だけである。未知の query は無視する。

| Query | 値 | 用途 |
| --- | --- | --- |
| `app` | `desktop` / `mobile` / `web` | 発生元アプリの表示 |
| `version` | 最大 128 文字 | アプリ版の表示 |
| `platform` | 最大 128 文字 | OS・platform の表示 |
| `occurredAt` | ISO 8601 または Unix milliseconds | アプリ側で記録した発生日時の表示 |
| `error` | 最大 1,000 文字 | マスク済みエラー概要の表示 |
| `errorCode` | 最大 128 文字 | アプリが定義したエラー種別の表示 |
| `errorFingerprint` | 英数字・`-`・`_`、最大 128 文字 | 同一エラーの集約用識別子の表示 |
| `screen` | 最大 128 文字 | エラー発生時の画面または機能名の表示 |
| `channel` | `production` / `preview` / `development` | 配布チャネルの表示 |
| `locale` | BCP 47 language tag、最大 35 文字 | アプリ表示言語の表示 |
| `timeZone` | IANA time zone name、最大 64 文字 | 利用端末のタイムゾーンの表示 |
| `schemaVersion` | 整数 | 関連するローカルまたは同期データ形式の版の表示 |

URL に含めてはならない情報は、VRChat Cookie、access token、パスワード、メールアドレス、ユーザー ID、IP アドレス、完全なログ、ローカルファイルパス、URL query 中の認証情報である。メールアドレスは URL ではなく、利用者がフォーム上で直接入力する。

Desktop/Mobile は URL を生成する専用アダプターへ集約する。各 UI コンポーネントは query の名称やマスク規則を持たない。通常の意見送信では `error` と `occurredAt` を省略してよい。

### UI と送信内容

- 入力欄は自由記述の `message` と、任意の返信先 `email` だけとする。メールアドレスは返信を希望する利用者だけが入力し、ログ添付や任意の metadata 入力欄は設けない。
- `email` は trim 後 254 文字以下とし、HTML の email validation と簡潔な構文検査を通る値だけを送る。空欄は送信できる。
- `app`、`version`、`platform`、`occurredAt`、`error`、`errorCode`、`errorFingerprint`、`screen`、`channel`、`locale`、`timeZone`、`schemaVersion` は read-only の「送信される診断情報」として表示する。URL にない値は表示しない。
- `message` は trim 後 1–2,000 文字を許可する。空文字・過長は送信しない。
- URL の `error` はページへ表示する前に文字列として扱い、HTML として挿入しない。
- 送信内容には、送信時点の UTC 時刻を `submittedAt` として追加する。

Discord payload の詳細は [Discord payload](#discord-payload) に定義する。ユーザー入力に応じた `username`、avatar URL、Webhook URL の書き換えは許可しない。`allowed_mentions.parse` を空にして、本文・エラー概要からの `@everyone`、ロール、ユーザーメンションを無効にする。Discord embed の文字数上限を超える値は送信前に拒否し、黙って切り詰めない。

### 送信結果の扱い

通常は `fetch` で Discord Webhook の成功応答を確認してから、送信完了を表示する。Discord の CORS 応答は GitHub Pages からの実ブラウザ検証で確認してから採用する。

CORS により応答を読めない場合、`mode: 'no-cors'` へ安易に切り替えない。これは結果が opaque になり、画面が配信成功を確認できないためである。その場合は以下のいずれかを選ぶ。

1. フォームを公開しないで、Discord の問い合わせ導線へ遷移する。
2. フィードバック専用のサーバーサイド中継（Cloudflare Workers 等）へ移行する。

送信失敗時は自由記述を保持し、再試行できるようにする。Discord のエラー詳細や Webhook URL は表示・ログ出力しない。

## 詳細設計

### ファイルと責務

実装時は次の境界で分割する。`feedback.astro` に入力検証・Discord 通信・URL parse を混在させない。

```text
pages/
├── scripts/
│   └── generate-feedback-webhook-config.mjs
├── src/
│   ├── generated/
│   │   └── feedback-webhook-config.ts   # build 時生成、Git 管理しない
│   ├── lib/
│   │   ├── feedback-contract.ts         # 型、制約、純粋な query parse/validation
│   │   ├── feedback-payload.ts          # Discord embed の組み立て
│   │   └── feedback-webhook.ts          # URL 復元と POST
│   ├── scripts/
│   │   └── feedback-form.ts             # DOM と画面状態だけを扱う
│   └── pages/
│       └── feedback.astro               # フォームの静的マークアップ
└── package.json                          # build script の先頭で生成器を呼ぶ
```

`src/generated/feedback-webhook-config.ts` は `.gitignore` に追加する。生成器は Secret を出力しない。`FEEDBACK_DISCORD_WEBHOOK_URL` がないローカル開発では `{ enabled: false }` を生成して送信操作を無効化する。GitHub Actions の Pages deploy では Secret 未設定を build failure とし、無効な本番フォームを配信しない。

### データ型と query parse

`feedback-contract.ts` は以下を唯一の URL 契約とする。個別の query 値は trim、許可文字・長さ・形式を検証し、無効値は例外にせず `undefined` として破棄する。

```ts
type FeedbackApp = 'desktop' | 'mobile' | 'web';
type FeedbackChannel = 'production' | 'preview' | 'development';

type FeedbackContext = {
  app?: FeedbackApp;
  version?: string;
  platform?: string;
  channel?: FeedbackChannel;
  occurredAt?: string;
  screen?: string;
  locale?: string;
  timeZone?: string;
  schemaVersion?: number;
  errorCode?: string;
  errorFingerprint?: string;
  error?: string;
};

type FeedbackFormInput = {
  email: string;
  message: string;
};
```

`parseFeedbackContext(search: string): FeedbackContext` は allowlist にない query を参照しない。`occurredAt` は妥当な日時として解釈できる場合だけ ISO 8601 UTC へ正規化する。`schemaVersion` は安全な非負整数だけを受け入れる。ページは正規化後の値だけを表示・送信する。

query 全体は 2,048 文字以下、`error` は 800 文字以下とする。これによりアプリが長大な例外を URL に埋め込むことを防ぐ。上限を超える context は URL 作成側で `error` を省略し、フォームは残りの有効な情報を表示する。

### フォーム状態と操作

フォームは次の状態遷移だけを持つ。

```text
ready --invalid submit--> ready (field error)
ready --valid submit--> submitting
submitting --Discord success--> succeeded
submitting --network/Discord failure--> failed
failed --retry--> submitting
```

- `ready` / `failed` では送信ボタンを有効にする。
- `submitting` では二重送信を防ぐため、送信ボタンとメール・本文入力を無効にする。
- `succeeded` では成功表示を出し、同じページから再送信しない。ページ再読み込みで `ready` に戻る。
- `failed` ではメールアドレスと本文を保持する。失敗理由は「送信できませんでした。時間をおいて再試行してください。」に統一し、Discord 応答本文は表示しない。
- 診断情報は `<dl>` に text node として描画する。`innerHTML`、Markdown レンダリング、URL 由来の class / style / link は使用しない。

email は `input[type=email]`、`autocomplete=email`、`maxlength=254` とする。本文は `textarea`、`maxlength=2000` とする。送信前に trim した本文が空なら本文欄にエラーを表示する。返信先メールが空の場合は送信を許可する。

### Discord payload

送信先は固定の execute-webhook URL に限定する。URL query やフォーム入力から送信先を受け取らない。`sendFeedback` は `POST`、`Content-Type: application/json`、`wait=true` を用いる。HTTP 2xx だけを成功として扱う。

```ts
type DiscordFeedbackPayload = {
  allowed_mentions: { parse: [] };
  embeds: [{
    title: 'VRCP feedback';
    description: string;
    color: 0x5865f2;
    timestamp: string;
    fields: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }];
};
```

payload は 1 embed だけを送り、次の固定順で field を追加する。値がない field は追加しない。本文は `description` に入れ、利用者入力が field 名、URL、username、avatar、thread、component を変更することはない。

| field | 値 | 上限 |
| --- | --- | --- |
| Reply email | `email` | 254 |
| Application | `app` / `version` / `channel` | 320 |
| Platform | `platform` / `locale` / `timeZone` | 320 |
| Occurred | `occurredAt` / `screen` | 320 |
| Compatibility | `schemaVersion` | 64 |
| Error | `errorCode` / `errorFingerprint` / `error` | 1,024 |

payload 作成前に Discord embed の field 値 1,024 文字、description 4,096 文字、embed 合計 6,000 文字を検証する。VRCP の入力上限内であっても Discord の上限を超える場合は送信しない。`allowed_mentions: { parse: [] }` は常に含める。

### アプリ側アダプター

Desktop と Mobile は共通の概念を実装するが、ソースを共有しない。各アプリに `createFeedbackUrl(context)` と `openFeedback(context)` を置く。

```ts
function createFeedbackUrl(context: FeedbackContext): string;
function openFeedback(context: FeedbackContext): Promise<void>;
```

`createFeedbackUrl` は固定の `https://ccamgr.github.io/vrcp/feedback/` だけを base URL とし、`URL` / `URLSearchParams` で allowlist の context を付与する。文字列連結、任意 URL、利用者入力の pathname / host は使わない。`openFeedback` はプラットフォームの外部ブラウザ API だけを呼び、失敗時は URL を UI に表示またはコピーできるようにする。

Mobile は既存 Settings の feedback Modal を外部ブラウザ起動へ置き換える。現在の `sendFeedbackToDevelopper`、ログ添付、`EXPO_PUBLIC_DISCORD_WEBHOOK_URL` の型定義・CI 注入を削除する。Mobile の `constants.version` と Expo build profile を `version` / `channel` に使い、`Platform.OS` と OS version を `platform` に使う。

Desktop は UI 層の外部リンクアダプターから外部ブラウザを開く。Rust backend に feedback URL 組み立てや Discord 送信を置かない。Desktop の version、OS、発生画面、関係する session schema version を渡す。

### エラー整形と fingerprint

エラー context を渡す呼び出し元は、利用者に表示してもよい短いエラー種別を `errorCode` に設定する。例えば session sync では `desktop-session-sync-failed` のような固定値を用いる。

`error` は次の順で整形する。

1. `String(error)` を取得する。
2. 改行と連続空白を 1 個の空白へ正規化する。
3. Cookie、Bearer token、Authorization header、password、email address、file path、URL query の値を `[redacted]` へ置換する。
4. 800 文字以内なら採用し、それを超える場合は省略する。

`errorFingerprint` は、`errorCode`、`screen`、整形後 error の先頭 256 文字から SHA-256 を計算し、先頭 16 byte を URL-safe Base64 で表す。これは同じ障害の集約用であり、認証・追跡 ID・端末識別子には使わない。Web Crypto を使えない呼び出し元は fingerprint を省略してよい。

### ビルド時の Webhook 難読化

`generate-feedback-webhook-config.mjs` は `FEEDBACK_DISCORD_WEBHOOK_URL` を入力とし、UTF-8 Base64 を 4 個以上の断片に分割したモジュールを生成する。生成ファイルは `decodeWebhookUrl(): string | undefined` だけを export する。

```text
CI Secret
  -> build script (no stdout)
  -> base64 fragments in generated TypeScript
  -> Vite bundle
  -> browser joins fragments and decodes only when Send is pressed
```

これは難読化であり暗号化ではない。断片数、変数名、順序は運用上の軽い検索避けであり、アクセス制御としてレビューしてはならない。source map は Pages build で生成・公開しない。

### GitHub Actions と設定

Pages deploy workflow の `Build` step には `FEEDBACK_DISCORD_WEBHOOK_URL: ${{ secrets.FEEDBACK_DISCORD_WEBHOOK_URL }}` だけを渡す。Mobile build から `EXPO_PUBLIC_DISCORD_WEBHOOK_URL` を削除する。Secret を command line argument、`echo`、artifact、cache key、環境ダンプへ渡さない。

GitHub Pages は任意の response header を設定できない。Starlight の現在の標準レイアウトはこのページ専用の `<head>` 挿入点を提供していないため、効かない body 内 CSP meta は置かない。CSP を導入する場合は、head 拡張を持つ Starlight レイアウトへ変更するか、header を管理できる配信先へ移行し、既存の script/style が壊れないことを browser で確認する。

## Webhook URL の扱い

### 推奨する暫定方式

Webhook URL はリポジトリへ平文でコミットせず、GitHub Actions Secret `FEEDBACK_DISCORD_WEBHOOK_URL` から Pages ビルド時にだけ渡す。Astro/Vite の `PUBLIC_` 環境変数として直接置き換えるのではなく、ビルド時に URL を複数の Base64 断片へ変換して、クライアント側で連結・復号する小さなモジュールを生成する。

この方式は静的成果物からの抽出を少し面倒にするだけであり、秘密情報保護ではない。実装・レビュー・運用時には常に公開値として扱う。URL 断片を生成するスクリプト、`dist/`、ソースマップ、workflow のログに URL 全文を出力してはならない。

### 採用しない方式

- Base64 だけを `PUBLIC_*` 変数としてソースへ埋め込むこと: 復号が自明で、難読化の意味がない。
- クライアントに復号鍵を持たせること: 鍵も同じ成果物から取得できる。
- URL を CSS、画像 metadata、HTML コメントへ隠すこと: 保守性を下げるだけである。
- GitHub Actions Secret を利用していることを秘匿の根拠にすること: ビルド後の JavaScript は公開される。

### 事故時の対応

Webhook のスパム、漏えい、または Discord 側の異常を検知した場合は、Discord で当該 Webhook を削除または再生成し、GitHub Actions Secret を更新して Pages を再デプロイする。旧 URL は無効化される。

Webhook は feedback 専用の Discord channel に限定し、投稿者ロールに不要な権限を与えない。Webhook が濫用されたときに主要な通知チャンネルや運用権限へ影響しない構成にする。

## Desktop/Mobile の変更方針

現在 Mobile は `EXPO_PUBLIC_DISCORD_WEBHOOK_URL` を用い、アプリ内 Modal から直接 Webhook へ投稿している。新方式ではこれを廃止する。

| 対象 | 現在 | 変更後 |
| --- | --- | --- |
| Mobile | Expo public 環境変数から Webhook URL を取得し、フォーム・ログ添付を直接投稿 | feedback URL を生成して外部ブラウザを開く。アプリは Webhook を保持しない |
| Desktop | feedback 導線なし | feedback URL を生成して既存の外部リンク API で開く |
| Pages | feedback 画面なし | query を read-only 表示し、自由記述を Discord へ送信 |
| CI | `EXPO_PUBLIC_DISCORD_WEBHOOK_URL` を Mobile build に注入 | Mobile build から削除し、Pages build 専用 Secret へ移す |

Mobile の既存「バグ報告時に最近のログを添付する」機能は削除する。ローカルログにはプライバシー情報が含まれ得るため、静的フォームで自動送信・URL 送信・添付送信しない。

Desktop/Mobile は `error` を設定する前に、少なくとも Cookie 名と値、`Authorization`、token、password、メールアドレス、ローカルパスを `[redacted]` に置換する。マスク不能または過長な例外はエラー概要を省略し、利用者の自由記述だけを送る。

### 自動付与する診断コンテキスト

以下はユーザー操作なしに取得して URL へ設定してよい。すべて利用者入力と同様に信用せず、フォーム上で確認可能にする。

| 値 | 取得元 | 用途 |
| --- | --- | --- |
| `app`、`version`、`channel` | アプリのビルド定数 | 問題が発生した配布物の特定 |
| `platform` | Desktop の OS、Mobile の `Platform.OS` と OS version | OS 固有の不具合の切り分け |
| `locale`、`timeZone` | アプリの i18n 設定、端末のタイムゾーン | 表示・日付・翻訳の不具合の切り分け |
| `screen` | エラーを扱った画面または機能の固定名 | 再現箇所の特定 |
| `occurredAt` | エラーを捕捉した時刻 | 他の利用者報告やローカル診断との照合 |
| `errorCode`、`errorFingerprint` | アプリが定義した種別と、マスク済みエラーから計算した短い安定識別子 | 同一障害の集約 |
| `schemaVersion` | session sync など影響を受ける機能のデータ形式版 | Desktop/Mobile 間の同期互換性の切り分け |

アプリ版だけでは OTA update や preview build を特定できない場合があるため、`channel` と公開してよい build identifier を追加する。commit hash、完全な update URL、内部 release URL は外部送信しない。

次は自動送信しない。端末 ID、広告 ID、VRChat user ID、VRChat 表示名、接続中の world/instance、friend list、Desktop 接続 URL、IP アドレス、Wi-Fi SSID、端末モデル、CPU/メモリ容量、スタックトレース全文、アプリログ、生データベースである。これらが必要な調査では、利用者に内容を説明して任意の追加提供を依頼する。

## セキュリティとプライバシー

### 受容するリスク

公開された静的 JavaScript から Webhook URL を抽出して、誰でも Discord へ投稿できる。送信元の真正性・送信回数・本文の完全性を GitHub Pages 側で検証することはできない。Discord のレート制限は、通知チャンネルのスパム防止を保証しない。

これは外部アクターが feedback channel へ投稿できるという実害を持つ、受容済みのリスクである。投稿内容を信頼して操作したり、bot に管理コマンドとして処理させたりしてはならない。

### 緩和策

- 専用 Webhook と専用 channel を使用し、Webhook の権限・影響範囲を限定する。
- クライアントの入力上限、固定 payload、`allowed_mentions: { parse: [] }` を適用する。
- app/version/platform/error は信用できない利用者入力として表示する。
- アプリの認証情報・生ログ・添付ファイルを送らない。
- Webhook URL のビルド成果物への平文混入を避ける。ただし難読化を機密対策と扱わない。
- 不正利用時の Webhook 再発行手順を運用ドキュメント化する。

### プライバシーポリシー

実装時にプライバシーポリシーを更新し、利用者が送信を選んだ場合に限り、自由記述、任意の返信先メールアドレス、表示された診断情報が Discord へ転送・保存されることを明記する。自動送信しないこと、送信しない情報、Discord channel の保持・閲覧方針、問い合わせ窓口も追記する。

## 実装手順

1. Pages に `/feedback/` を追加し、query の parse・表示・入力検証を実装する。
2. Webhook payload を生成するクライアントモジュールと、難読化された build-time configuration を追加する。
3. GitHub Actions の Pages build に専用 Secret を渡す。Secret 値を出力する command や debug log は追加しない。
4. ブラウザ上で Discord Webhook への POST と CORS 成功応答を検証する。失敗する場合はフォームの公開を止め、Worker 方式へ戻る。
5. Mobile の直接送信・ログ添付・`EXPO_PUBLIC_DISCORD_WEBHOOK_URL` を削除し、外部ブラウザ起動へ切り替える。
6. Desktop に同じ feedback URL アダプターと導線を追加する。
7. プライバシーポリシーと設定画面の文言を更新する。
8. Discord channel の権限、Webhook 再発行、スパム時の一次対応を確認する。

## 検証計画

- `npm run build` が GitHub Pages の `/vrcp` base で成功し、`/feedback/` の CSS・画像・リンクが正しく解決されること。
- Desktop、Android、iOS それぞれで、外部ブラウザに正しい query 付き URL が開くこと。
- 空・過長 message、無効・過長 email、未知 query、HTML を含む error、無効日時で画面が安全に表示・拒否されること。
- 正常送信が Discord の専用 channel に 1 回だけ届き、メンションを発生させないこと。
- 実ブラウザから Discord response を読めることを検証する。CORS が満たせない場合はリリースしない。
- Pages の成果物、Mobile の Expo bundle、GitHub Actions ログ、repository history に Webhook URL の平文が残らないこと。ただしブラウザ実行時に復元できる以上、URL 自体は公開値として扱うこと。
- Webhook を再発行した場合、旧 URL が機能せず、新 URL に再デプロイ後のフォームだけが送信できること。

## 実装前に決めること

- 軽い難読化を採用するか。採用する場合は「平文の単純検索を避けるためだけ」と明記して、Base64 断片方式を使う。
- Discord のブラウザ CORS 検証が失敗した場合、Worker 方式へ切り替えることを承認するか。
- feedback 専用 Discord channel の保持期間・閲覧権限・スパム対応担当。
- フォームをサイトのナビゲーションに常設するか、Desktop/Mobile からの遷移専用にするか。
