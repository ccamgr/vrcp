# Desktop プロジェクト概要

`desktop/` は、VRChat API クライアント機能と VRChat ログの記録・分析を提供する PC 向けアプリケーションです。Tauri を基盤に、React 製の画面と Rust 製のネイティブ処理を組み合わせています。

## 技術スタック

| 領域 | 技術 | 用途 |
| --- | --- | --- |
| デスクトップ基盤 | Tauri 2 | ネイティブアプリケーションの起動、ウィンドウ・トレイ・プラグイン連携 |
| フロントエンド | React 19, TypeScript, Vite | アプリ画面とクライアント側の状態管理 |
| UI | Tailwind CSS, Framer Motion, Lucide React, Recharts | スタイル、アニメーション、アイコン、分析表示 |
| バックエンド | Rust, Tokio | ネイティブ処理と非同期タスク |
| データベース | SQLite, SeaORM, SeaORM Migration | ログ・設定などのローカル永続化 |
| HTTP 連携 | Axum, tower-http | モバイルアプリがログを取得する LAN 向け HTTP API |
| 型共有 | Specta, tauri-specta | Rust の Tauri コマンド・イベントから TypeScript バインディングを生成 |
| VRChat 連携 | `vrchatapi` Rust crate, Reqwest | VRChat API の呼び出しと認証状態の管理 |

## ディレクトリ構成

```text
desktop/
├── src/                         # React / TypeScript フロントエンド
│   ├── components/              # レイアウトと画面部品
│   ├── context/                 # React Context
│   ├── pages/                   # Monitor、Analytics、Settings 画面
│   ├── lib/                     # UI 側の共通処理
│   └── generated/               # Rust から生成される型定義（編集禁止）
├── src-tauri/                   # Rust / Tauri バックエンド
│   └── src/
│       ├── cmds/                # Tauri コマンド
│       ├── db/                  # SQLite、スキーマ、マイグレーション、リポジトリ
│       ├── modules/             # ログ監視、HTTP サーバー、トレイ、VRChat API
│       └── bin/vrcp_cli/        # バインディング生成などの開発用 CLI
├── public/                      # 静的ファイル
├── tools/                       # バージョン・バインディング用スクリプト
└── makefile                     # 開発コマンド
```

## 主な構成とデータの流れ

フロントエンドは `HashRouter` で Monitor、履歴・分析、Settings の画面を構成します。Rust 側は Tauri コマンドとイベントを公開し、フロントエンドは生成済みの TypeScript バインディングを通じて呼び出します。

Rust バックエンドでは、ログ監視サービスが VRChat のログを受け取り、SQLite に保存します。同時に Axum ベースの HTTP サーバーを起動し、`/logs` エンドポイントから保存済みログを LAN 内のモバイルアプリへ提供します。既定ポートは `8727` です。

```text
VRChat ログ
   │
   ▼
Watcher ──> SQLite (SeaORM) ──> Tauri コマンド / イベント ──> React UI
                    │
                    └──> Axum HTTP: /logs ──> Mobile
```

## 開発時の注意点

- `src/generated/` は自動生成ファイルです。直接編集しません。
- Rust の Tauri コマンドまたはイベントを変更した場合は、`make gen-bindings` で型定義を更新します。
- DB スキーマを変更する場合は SeaORM のマイグレーションを追加します。
- アプリ全体の起動は `make run`、フロントエンドのみの起動は `make run-front`、静的解析・整形は `make lint` を使用します。

## 関連設計

- [Session DB Migration 設計](./desktop-session-db-migration.md)
