# Mobile review issues

2026-09-14 に、Mobile（Expo/React Native/Drizzle）のコード規約、セキュリティ、DB/API 設計、ロジックおよびパフォーマンスを読み取り専用でレビューした記録です。優先度は P1（優先対応）、P2（早期対応）、P3（改善候補）です。

## P1

| 観点 | 指摘 | 対象 |
| --- | --- | --- |
| Security | Pipeline の認証 token と、不正な受信メッセージ本文を console にそのまま出力する。端末ログから token が回収・再利用され得る。 | `src/contexts/VRChatContext.tsx:113`, `src/contexts/VRChatContext.tsx:151` |
| Security | logout が Cookie だけを削除し、保存済み username/password を残す。次回起動時に自動ログインされ、ログアウトした利用者の意図と一致しない。 | `src/contexts/AuthContext.tsx:179`, `src/contexts/AuthContext.tsx:200` |
| Security | フィードバック用 Discord webhook を `EXPO_PUBLIC_*` から取得している。public 環境変数は配布 bundle に含まれるため、webhook は抽出・悪用可能である。 | `src/lib/funcs/sendFeedbackToDevelopper.ts:5`, `src/lib/funcs/sendFeedbackToDevelopper.ts:35` |
| API / Sync | background task は JSON 文字列化されて保存された Desktop URL を JSON 復元せず、そのまま axios へ渡す。通常は引用符を含む URL となり、定期同期に失敗する。 | `src/contexts/SettingContext.tsx:72`, `src/tasks/desktopLogSyncTask.ts:15` |
| Data Integrity | 差分同期の checkpoint に Mobile の `Date.now()` を保存するため、Desktop との時計ずれ、遅延書込み、取得中の追加ログにより永久的な取り逃がしが起き得る。Desktop の cursor、または source timestamp と overlap を用いる必要がある。 | `src/lib/funcs/syncDesktopLogs.ts:24`, `src/lib/funcs/syncDesktopLogs.ts:43` |
| Security / API | QR・手入力の任意 URL を無検証で HTTP GET し、iOS/Android で全宛先の cleartext 通信を許可している。悪意ある QR による任意到達可能 host へのアクセス、MITM、ログ注入が可能になる。 | `src/app/settings/desktopapp.tsx:41`, `src/lib/funcs/syncDesktopLogs.ts:32`, `app.config.ts:91`, `app.config.ts:126` |
| Logic | 日別 Analytics はその日の生ログだけから session を再構築するため、前日から日付を跨いだ session の開始状態を失い、当日分の利用履歴が欠落する。 | `src/app/others/analytics.tsx:38`, `src/lib/funcs/analizeSessions.ts:107` |
| Logic | ローカルログ削除時に同期 checkpoint を削除しないため、通常同期では削除済みの過去ログを復元できない。 | `src/hooks/useLogManager.ts:28`, `src/lib/funcs/syncDesktopLogs.ts:8` |

## P2

| 観点 | 指摘 | 対象 |
| --- | --- | --- |
| Privacy | friend list/location や Pipeline 更新情報を含む TanStack Query state を、暗号化されていない SQLite KV store に永続化している。保持対象の縮小・logout 時の消去・暗号化を検討する。 | `src/lib/queryClient.ts:4`, `src/lib/queryClient.ts:31`, `src/contexts/PipelineContext.tsx:63` |
| DB / Performance | `logs.timestamp` に index がなく、日付範囲検索と Analytics がログ全表走査になる。 | `src/db/migration/0000_flaky_stranger.sql:51`, `src/db/repogitories/logs.ts:28` |
| API Contract | Desktop の signed i64 hash を Mobile で JavaScript `number` として扱う。安全整数範囲外で丸められ、一意制約に使う識別子が壊れ得る。文字列または safe range の契約が必要。 | `src/generated/desktopapi/type.ts:52`, `src/db/schema/logs.ts:8` |
| Concurrency | Analytics、設定画面、background task が同時に同期できる。共有 single-flight lock や同期メタデータがないため、重複ダウンロード・DB transaction・checkpoint 更新が競合する。 | `src/hooks/useLogManager.ts:40`, `src/tasks/desktopLogSyncTask.ts:9`, `src/app/others/analytics.tsx:77` |
| WebSocket | 通常の `onclose` では再接続せず、旧 socket の reconnect timer は logout/新接続後も残り得る。接続世代・timer の一元管理が必要。 | `src/contexts/VRChatContext.tsx:119`, `src/contexts/VRChatContext.tsx:158`, `src/contexts/VRChatContext.tsx:180` |
| Logic | `analyzeSessions` は self が複数回出入りした場合、最初の interval で終了時刻を固定して以後の滞在を切り捨てる。 | `src/lib/funcs/analizeSessions.ts:62` |
| Background task | Desktop sync task はすべての失敗を `Success` と返すため、OS の再試行と障害の観測性を失う。通知 task も通知送信前に watermark を更新し、送信失敗した通知を取り逃がす。 | `src/tasks/desktopLogSyncTask.ts:31`, `src/tasks/notificationsTask.ts:48`, `src/tasks/notificationsTask.ts:68` |
| DB Reliability | `resetDB` は backup・回復手順なしに全 table を drop し、migration 失敗時に不完全な DB を残し得る。 | `src/db/index.ts:22` |

## P3

| 観点 | 指摘 | 対象 |
| --- | --- | --- |
| Performance | Analytics の同期間隔がコメントの 5 分ではなく 10 秒であり、画面フォーカス中にログ取得・日次解析を繰り返す。 | `src/app/others/analytics.tsx:15`, `src/app/others/analytics.tsx:71` |
| Concurrency | Calendar の月切替時に先行 request を取消・識別しないため、古い応答が新しい月の state へ混入し得る。 | `src/app/others/calendar.tsx:65` |
| Security | 外部プロフィール link を scheme 検証なしで開くため、任意の custom scheme を起動し得る。 | `src/components/view/chip-badge/LinkChip.tsx:17` |
| Maintainability | WebSocket constructor の型不一致を `@ts-ignore` で隠している。platform 別実装または互換 adapter が必要。 | `src/contexts/VRChatContext.tsx:124` |
| Test | 差分同期境界、跨日 session、重複ログ、WebSocket reconnect、Calendar の競合を検証する unit/integration test がない。 | `mobile/` |
