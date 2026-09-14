# Desktop review issues

2026-09-14 に、Desktop（Tauri/Rust/React）のコード規約、セキュリティ、DB/API 設計、ロジックおよびパフォーマンスを読み取り専用でレビューした記録です。優先度は P1（優先対応）、P2（早期対応）、P3（改善候補）です。

## 対応状況

- 対応済み: session projection の破損ログ耐性・読み取り準備待ち、HTTP port の起動／切替失敗処理、HTTP log paging、session 取得の N+1、watcher と UI のログ整合性、Monitor の表示上限、Settings の command 結果判定、session/log 検索 index、CSP/capability 最小化、OS 資格情報ストアへの Cookie 移行、CLI import 件数。
- 保留: LAN API 認証、export のストリーミング、Windows の実機資格情報ストア検証、旧 raw-log 書込み API の整理。

## 保留（仕様検討が必要）

| 観点 | 指摘 | 方針 |
| --- | --- | --- |
| Security / API | LAN 向け HTTP API の無認証アクセス | 現状の Mobile との互換性を維持するため、現時点では変更しない。QR による token pairing、token の失効・再発行、旧 Mobile の移行方針を決めた後に対応する。 |
| Security / Test | Windows Credential Manager の実機確認 | Linux 上では keyring 保存層の compile/test までを確認する。Windows runner または実機で、Cookie の保存・再起動後の読出し・logout 時の削除・旧 `cookies.json` からの移行を確認して完了とする。 |

## P1

| 観点 | 指摘 | 対象 |
| --- | --- | --- |
| Security | VRChat の認証 Cookie を平文の `cookies.json` として保存しており、明示的な所有者限定パーミッションもない。端末の他ユーザーやバックアップ経由で露出した場合、セッション悪用につながる。 | `src-tauri/src/modules/vrcapi.rs:60` |
| DB / Reliability | 保存済みログに壊れた JSON・未知のイベントが 1 件あると、session projection のバックフィルがその行で永続的に停止する。checkpoint は進まず、部分投影を UI が正常データとして読み得る。 | `src-tauri/src/db/repositories/sessions.rs:68`, `src-tauri/src/db/repositories/sessions.rs:109` |
| API / Reliability | 保存済み port で HTTP サーバーを起動しても、メモリ上の port は常に `8727` で初期化されるため、再起動後に実際の listen port とモバイルへ返す URL が不一致になる。 | `src-tauri/src/modules/http.rs:25`, `src-tauri/src/cmds/http/server.rs:9` |
| Logic | 初回バックフィルは起動後に非同期開始されるため、Analytics が空または部分結果を読み、その後完了しても再取得されない競合がある。 | `src-tauri/src/lib.rs:70`, `src/pages/Analytics.tsx:19` |

## P2

| 観点 | 指摘 | 対象 |
| --- | --- | --- |
| API / Reliability | port 切替は新 port の bind 成功を確認する前に旧 server を停止する。bind 失敗は task 内の panic となり、設定 API は成功として返る。 | `src-tauri/src/modules/http.rs:34`, `src-tauri/src/modules/http.rs:115` |
| Security | CSP が無効で、広い Tauri 権限と任意 path への log export が組み合わさっている。WebView の侵害時にローカルファイル上書きへ影響が広がる。 | `src-tauri/tauri.conf.json:18`, `src-tauri/capabilities/default.json:10`, `src-tauri/src/cmds/vrclog/logs.rs:47` |
| Performance | `/logs` と export が件数・期間・応答サイズの上限なしに全ログをメモリへ展開する。大規模 DB や LAN からの繰返し要求で DoS になり得る。 | `src-tauri/src/db/repositories/logs.rs:99` |
| Performance / DB | `get_sessions` は instance ごとに app と user sessions を問い合わせる N+1 クエリで、projection lock 中に実行される。Analytics 読込みが watcher の保存を待たせる。 | `src-tauri/src/db/repositories/sessions.rs:177`, `src-tauri/src/db/core.rs:81` |
| Logic | watcher が DB 保存成功前に frontend へログを emit する。DB 保存失敗時、Monitor と Analytics/export の内容が不整合になる。 | `src-tauri/src/modules/watcher.rs:353` |
| Performance | Monitor のログ state が無制限に増加し、長時間実行でメモリ使用量と再描画コストが増え続ける。 | `src/context/LogContext.tsx:40` |
| API / UI | Settings が Tauri command の `Result` を確認せず、port 保存・全削除が失敗しても成功表示になる。export 成功メッセージも表示されない。 | `src/pages/Settings.tsx:61`, `src/pages/Settings.tsx:83`, `src/pages/Settings.tsx:113` |

## P3

| 観点 | 指摘 | 対象 |
| --- | --- | --- |
| DB / Performance | session 期間検索の条件に適した index がなく、履歴増加時に全表走査になりやすい。 | `src-tauri/src/db/migrator/m20260914_000000_extend_session_projection.rs:46` |
| CLI / API | CLI import は重複を含め常に Imported 件数として数えるため、実際の挿入件数と表示がずれる。 | `src-tauri/src/bin/vrcp_cli/import_logs.rs:64` |
| DB Design | 生ログのみを操作する旧 repository API が残っており、将来の呼び出しで logs と session projection の整合性を壊し得る。 | `src-tauri/src/db/repositories/logs.rs:14` |
| Logic | Analytics の日付を速く切り替えると、古い非同期応答が新しい state を上書きし得る。 | `src/pages/Analytics.tsx:40` |
