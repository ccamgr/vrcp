# Pages プロジェクト概要

`pages/` は、VRCP の紹介ページと公開ドキュメントを配信する静的サイトです。Astro と Starlight を使用しており、現在は日本語を既定ロケールとして設定しています。

## 技術スタック

| 領域 | 技術 | 用途 |
| --- | --- | --- |
| 静的サイト生成 | Astro 5 | コンテンツ中心の高速な静的サイト生成 |
| ドキュメント UI | Starlight | ナビゲーション、ドキュメントレイアウト、コンテンツスキーマ |
| 画像処理 | Sharp | ビルド時の画像最適化 |
| 配信 | GitHub Pages | `https://ccamgr.github.io/vrcp` への静的サイト配信 |

## ディレクトリ構成

```text
pages/
├── src/
│   ├── assets/                  # ロゴなどビルド対象のアセット
│   ├── content/
│   │   └── docs/                # Starlight で公開する MD / MDX ドキュメント
│   │       ├── index.mdx        # トップページ
│   │       ├── terms-of-use.mdx # 利用規約
│   │       └── privacy-policy.mdx # プライバシーポリシー
│   └── content.config.ts        # Starlight コンテンツコレクションの定義
├── public/                      # そのまま配信する静的アセット
├── astro.config.mjs             # Astro・Starlight・サイト設定
└── package.json                 # 開発・ビルドスクリプト
```

## コンテンツと公開設定

Starlight は `src/content/docs/` 配下の Markdown（`.md`）と MDX（`.mdx`）を読み込み、ファイル名に応じた URL を作成します。サイトのタイトルは `VRCP`、ベースパスは `/vrcp` に設定されています。サイドバーには利用規約とプライバシーポリシーを表示します。

GitHub Actions の Pages ワークフローは、依存関係を `npm ci` で導入後に `npm run build` を実行し、生成された `pages/dist` を GitHub Pages にデプロイします。

## 開発時の注意点

- ページ、コンポーネント、コンテンツは `src/` 配下に配置します。
- ドキュメントの追加は、通常 `src/content/docs/` に MD または MDX ファイルを作成して行います。
- ローカル開発には `npm run dev` を使用します。
- 公開デプロイは GitHub Actions から行います。
