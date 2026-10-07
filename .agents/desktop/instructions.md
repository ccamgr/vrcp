# Desktop Rules

対象は `desktop/` 配下です。

- Rust バックエンドは `desktop/src-tauri/`、React / TypeScript UI は `desktop/src/` に置き、UI とネイティブ処理の責務を分離します。
- `desktop/src/generated/` は手動編集しません。Rust の Tauri コマンドまたはイベントを変更した場合は `make gen-bindings` を実行します。
- SQLite スキーマの変更には SeaORM の新規マイグレーションを追加し、既存マイグレーションを書き換えません。
- 時刻は原則 Unix epoch のミリ秒で扱い、表示時にだけロケールへ変換します。
- ビルド、リリース、バージョン更新は GitHub Actions の責務です。明示的な依頼なしに実行しません。

## Development Commands

`desktop/` を作業ディレクトリとして、次の `make` コマンドを使います。

- `make run`: アプリケーションを起動します。
- `make run-front`: フロントエンドだけを起動します。
- `make lint`: Rust と TypeScript の静的解析・整形を実行します。
