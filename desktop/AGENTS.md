# Desktop (Tauri App) Development Rules

## Architecture
- **Backend**: Rust (`src-tauri/` 以下のコード)．
- **Frontend**: React / TypeScript (`src/` 以下のコード)．
- バックエンドのロジックとフロントエンドのUIの責務を明確に分けること．

## Generated Files (DO NOT EDIT)
- `src/generated/` 以下のファイルは自動生成されるため，絶対に手動で編集しないでください．
- Rust側のコマンドやイベント（`src-tauri/src/`）を変更した場合は，必ず `make gen-bindings` を実行してフロントエンドの型定義を更新すること．

## Deploy
- ビルド，リリースおよびバージョンアップは， GitHub Actions を通じて行うため勝手に実行しないこと

## Code Rules
- 時間は原則ms単位(unix time) で管理し，ロケール等によるずれが生じないように

## Commands
開発タスクはルートディレクトリ内で以下の `make` コマンドを使用してください．
- `make run`: アプリケーションの起動（バックエンド＋フロントエンド）
- `make run-front`: フロントエンドのみの起動
- `make lint`: コードの静的解析とフォーマット（Rust, TypeScript 両方）
