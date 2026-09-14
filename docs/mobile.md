# Mobile プロジェクト概要

`mobile/` は、VRChat API のクライアント機能と Desktop アプリとの連携機能を提供するモバイルアプリケーションです。Expo を利用して Android・iOS を対象とし、画面は Expo Router のファイルベースルーティングで構成されています。

## 技術スタック

| 領域 | 技術 | 用途 |
| --- | --- | --- |
| アプリ基盤 | Expo 53, React Native, React 19 | Android・iOS 向けアプリケーション |
| 画面遷移 | Expo Router, React Navigation | ファイルベースルーティングとナビゲーション |
| データ取得・キャッシュ | TanStack Query | VRChat API データの取得、キャッシュ、永続化 |
| ローカル DB | Expo SQLite, Drizzle ORM, Drizzle Kit | ログやキャッシュデータの保存とマイグレーション |
| 認証・保存 | Expo Secure Store, Async Storage 用 persister | 認証・設定・クエリキャッシュの端末内保存 |
| 多言語化 | i18next, react-i18next, Expo Localization | 表示言語の切り替え |
| 端末機能 | Expo Camera, Notifications, Background Task, Task Manager | QR 読み取り、通知、バックグラウンド同期 |
| UI | Gesture Handler, Reanimated, Safe Area Context, SVG | タッチ操作、安全領域、アニメーション、描画 |

## ディレクトリ構成

```text
mobile/
├── src/
│   ├── app/                     # Expo Router の画面・レイアウト
│   │   ├── maintabs/            # ホーム、フレンド、プロフィール、設定などの主画面
│   │   ├── details/             # Avatar、World、User などの詳細画面
│   │   ├── others/              # 検索、通知、分析、カレンダーなど
│   │   └── settings/            # 外観、言語、DB、Desktop 連携の設定
│   ├── components/              # 機能別・共通 UI コンポーネント
│   ├── contexts/                # 認証、設定、VRChat、通知、連携状態の Context
│   ├── db/                      # Drizzle スキーマ、マイグレーション、DB 操作
│   ├── generated/               # API・パイプラインの生成コード（編集禁止）
│   ├── hooks/                   # VRChat を含む再利用可能な Hooks
│   ├── i18n/                    # 翻訳リソースと初期化
│   ├── tasks/                   # バックグラウンドタスク
│   └── lib/                     # API、同期、ストレージ、日付などの共通処理
├── src/assets/                  # 画像、SVG、フォント
├── app.config.ts                # Expo アプリ設定とビルドプロファイル
├── drizzle.config.ts            # Drizzle の SQLite マイグレーション設定
└── eas.json                     # EAS Build / Update 設定
```

## 主な構成とデータの流れ

アプリ起動時、ルートレイアウトで SQLite マイグレーション、認証状態の復元、TanStack Query の永続キャッシュ、テーマ・多言語化・各 Context を初期化します。認証状況によりログイン画面またはメイン画面へ遷移します。

Desktop アプリの URL が設定されている場合は、バックグラウンドタスクが Desktop の HTTP API からログを取得し、モバイル端末の SQLite へ同期します。また、VRChat 関連のリアルタイムメッセージは Pipeline Context で受信し、フレンド情報などのキャッシュへ反映します。

```text
VRChat API / Pipeline ──> TanStack Query / Context ──> Expo Router 画面
                                  │
                                  └──> 永続キャッシュ・SQLite

Desktop HTTP (/logs) ──> Background Task ──> SQLite
```

## 開発時の注意点

- `src/app/` では Expo Router のファイルベースルーティング規約に従います。
- DB スキーマの変更時は `make migrate/generate` でマイグレーションを生成します。
- `src/generated/` は OpenAPI または WebSocket 仕様から生成されます。変更が必要な場合は `make gen-vrcapi` または `make gen-vrcpipe` を実行します。
- 開発サーバーは `make run`、ネイティブディレクトリの再生成は `make prebuild`、静的解析・整形は `make lint` を使用します。
