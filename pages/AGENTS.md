# Pages (Astro Docs/Web) Development Rules

## Architecture
- **Stack**: Astro
- 静的サイトジェネレータとしてのパフォーマンスと，クリーンなマークアップを意識すること．
- コンポーネントとページは `src/` 以下に配置すること．

## Deploy
- デプロイは，GitHub Actions を通じて行うため勝手に実行しないこと

## Commands
開発タスクはルートディレクトリ内で以下の `npm` スクリプトを使用してください．
- `npm run dev`: Astro開発サーバーの起動
<!-- - `npm run build`: プロダクションビルドの実行 -->
<!-- - `npm run preview`: ビルドしたサイトのローカルプレビュー -->
