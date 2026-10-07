# Pages Rules

対象は `pages/` 配下です。

- Astro の静的サイトとして、ページとコンポーネントは `pages/src/` 配下に配置します。
- 表示・配布用のコンテンツとサイト実装を混在させず、既存の情報設計とナビゲーションを維持します。
- デプロイは GitHub Actions の責務です。明示的な依頼なしに実行しません。

## Development Commands

`pages/` を作業ディレクトリとして、`npm run dev` で Astro 開発サーバーを起動します。
