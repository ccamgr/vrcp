# VRCP プロジェクト概要

VRCP は、VRChat API を利用する非公式クライアントアプリケーション群です。用途ごとに、デスクトップアプリ、モバイルアプリ、紹介・ドキュメントサイトの 3 つのサブプロジェクトで構成されています。

## リポジトリ構成

```text
vrcp/
├── desktop/  # VRChat ログの記録・閲覧と API クライアント機能を持つ Tauri アプリ
├── mobile/   # VRChat API とデスクトップ連携を提供する Expo モバイルアプリ
├── pages/    # プロジェクトサイトおよび公開ドキュメント
├── docs/     # このリポジトリの開発者向けドキュメント
│   ├── desktop/    # Desktop の概要と設計資料
│   ├── mobile/     # Mobile の概要と継続的に参照する手順
│   ├── pages/      # Pages の概要
│   └── migrations/ # 完了済みの移行設計・記録
└── .github/  # 各サブプロジェクトのビルド・リリース用ワークフロー
```

## サブプロジェクト一覧

| 対象    | 役割                                                       | 主な技術                                     | 詳細                       |
| ------- | ---------------------------------------------------------- | -------------------------------------------- | -------------------------- |
| Desktop | PC 向けクライアント、VRChat ログ監視・分析、モバイル連携   | Tauri 2, Rust, React, Vite, SQLite           | [概要](./desktop/README.md) |
| Mobile  | モバイル向け VRChat API クライアント、デスクトップとの連携 | Expo, React Native, Expo Router, Drizzle ORM | [概要](./mobile/README.md)  |
| Pages   | 紹介ページ、利用規約、プライバシーポリシーなどの公開サイト | Astro, Starlight                             | [概要](./pages/README.md)   |

## サブプロジェクト間の関係

Desktop は VRChat のログをローカル SQLite に保存し、LAN 内で HTTP サーバーを公開します。Mobile は必要に応じてこのサーバーからログを取得し、端末内の SQLite データベースへ同期します。Pages はアプリ本体とは独立して、公開情報を静的サイトとして配信します。

```text
VRChat / VRChat API
        │
        ├── Desktop: ログ監視・ローカル保存 ── HTTP (LAN) ──> Mobile: ログ同期・閲覧
        │
        └── Mobile: VRChat API の利用

Pages: アプリ群の紹介・公開ドキュメントを静的配信
```

## 開発時の共通事項

- 各サブプロジェクトには個別の `AGENTS.md` があり、変更前に内容を確認します。
- 生成済みの `src/generated/` は直接編集しません。
- ビルド、リリース、バージョン更新は GitHub Actions を通じて行います。
- 時刻データは原則として Unix time のミリ秒単位で扱います。

AI エージェントによる作業では、[`.agent/README.md`](../.agent/README.md) にある共通の作業規約とルーティングを参照してください。

## 関連ドキュメント

- [Mobile VRChat API / Pipeline 型生成の互換調整](./mobile/vrchat-api-generation.md)

完了済みの移行設計は [migrations/](./migrations/) に保存します。

- [Session Participant User ID 移行設計](./migrations/session-player-user-id-migration.md)
- [Mobile vrcapi 1.21.0 移行設計](./migrations/mobile-vrcapi-1.21-migration.md)
- [Desktop Session DB Migration 設計](./migrations/desktop-session-db-migration.md)
