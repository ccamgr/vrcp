# VRCP AI Agent Guide

このディレクトリは、VRCP を扱う AI エージェントの共通入口です。Codex、Claude Code、GitHub Copilot など、利用するエージェントにかかわらず同じ規約と資料を参照します。

## 読む順序

1. このファイルで対象サブプロジェクトと参照資料を特定します。
2. [calling-conventions.md](./calling-conventions.md) で作業・連携の共通規約を確認します。
3. 対象の `AGENTS.md` を読みます。ルートのルールに加えて、対象サブプロジェクトのルールを必ず適用します。
4. 必要に応じて `docs/` の概要資料を参照します。

## ルーティング

| 作業対象 | 必須ルール | 概要ドキュメント |
| --- | --- | --- |
| リポジトリ全体 | [`AGENTS.md`](../AGENTS.md) | [`docs/README.md`](../docs/README.md) |
| Desktop | [`desktop/AGENTS.md`](../desktop/AGENTS.md) | [`docs/desktop.md`](../docs/desktop.md) |
| Mobile | [`mobile/AGENTS.md`](../mobile/AGENTS.md) | [`docs/mobile.md`](../docs/mobile.md) |
| Pages | [`pages/AGENTS.md`](../pages/AGENTS.md) | [`docs/pages.md`](../docs/pages.md) |

## エージェント別の入口

| エージェント | 入口ファイル | 共通資料 |
| --- | --- | --- |
| Codex | [`AGENTS.md`](../AGENTS.md) | この `.agent/` |
| Claude Code | [`CLAUDE.md`](../CLAUDE.md) | この `.agent/` |
| GitHub Copilot | [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) | この `.agent/` |

これらの入口ファイルは、エージェント固有の設定を持たず、このディレクトリへ誘導するためだけに使用します。共通ルールを変更する場合は、入口ファイルを複製せず `.agent/` または対象の `AGENTS.md` を更新してください。
