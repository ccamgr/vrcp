# Mobile (Expo App) Development Rules

## Architecture
- **Stack**: React Native, Expo Router, Drizzle ORM
- モバイル特有のUI/UX（タッチ領域，セーフエリアなど）を意識すること．
- ルーティングは `src/app/` の Expo Router のファイルベースルーティング規約に従うこと．
- データベース操作は `src/db/` で Drizzle ORM を使用すること．スキーマ変更を伴う場合は `make migrate/generate` を実行すること．

## Deploy
- ビルド，リリースおよびバージョンアップは， GitHub Actions を通じて行うため勝手に実行しないこと

## Generated Files (DO NOT EDIT)
- `src/generated/` 以下のファイルは OpenAPI や WebSocket 仕様から自動生成されます．手動編集は禁止です．
- API仕様が変更された場合は `make gen-vrcapi` または `make gen-vrcpipe` を実行すること．

## Code Rules
- 時間は原則ms単位(unix time) で管理し，ロケール等によるずれが生じないように

## Commands
開発タスクはルートディレクトリ内で以下の `make` コマンドを使用してください．
- `make run`: Expoアプリケーションの開発サーバー起動
- `make prebuild`: Expoのネイティブディレクトリ(`android/`, `ios/`)の再構築
- `make lint`: コードの静的解析とフォーマット
