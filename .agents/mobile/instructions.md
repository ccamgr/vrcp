# Mobile Rules

対象は `mobile/` 配下です。

- Expo Router のファイルベースルーティング、タッチ操作、セーフエリアを守ります。
- DB 操作は `mobile/src/db/` の Drizzle ORM を通し、スキーマ変更には正規のマイグレーション生成手順を使います。
- `mobile/src/generated/` は手動編集しません。VRChat API または Pipeline の型更新は正規の生成コマンドで反映します。
- 非同期の更新操作では、送信中状態を明示し、二重実行を防ぎます。
- ビルド、リリース、バージョン更新は GitHub Actions の責務です。明示的な依頼なしに実行しません。

## Development Commands

`mobile/` を作業ディレクトリとして、次の `make` コマンドを使います。

- `make run`: Expo 開発サーバーを起動します。
- `make prebuild`: Expo のネイティブディレクトリを再構築します。
- `make lint`: 静的解析と整形を実行します。
