# Desktop Session DB Migration 設計

## 目的

Desktop アプリは、VRChat の生ログを読むたびにセッション情報を組み立てる方式から、ログ受信時にセッション用テーブルへ投影する方式へ移行する。これにより履歴画面の検索負荷を下げ、異常終了を合成ログではなくスキーマ上の状態として表現する。

生ログの `logs` テーブルは引き続き原本として保持する。セッションテーブルは生ログから再生成できる派生データである。

## 対象と非対象

対象は `desktop/` の Rust バックエンド、Tauri の `get_sessions`、Desktop と Mobile の共有ログイベント型である。

今回の対象外は、VRChat プロセスの直接監視による即時クラッシュ検出である。ログ上の異常終了は、次の `AppStart` または既存の互換イベントを受信した時点で確定する。

## 互換性方針

`InvalidAppStop` は過去バージョンが保存した合成ログとの互換性のために、シリアライズ・デシリアライズ可能なイベント型として維持する。

- Watcher、CLI import、今後の新規ログでは `InvalidAppStop` を生成・保存しない。
- 既存の `logs` レコードは書き換えず、HTTP 出力とエクスポートでも保持する。
- 投影とバックフィルでは `InvalidAppStop` を終了イベントとして扱い、`is_graceful = false` でクローズする。
- 通常の `AppStop` は `is_graceful = true` でクローズする。
- Desktop / Mobile の共有型は移行期間中 `InvalidAppStop` を許容する。Rust 側の変更後は生成手順で Desktop bindings を更新する。

## データモデル

### `app_sessions`

| 列 | 型 | 説明 |
| --- | --- | --- |
| `id` | Integer PK | セッション ID |
| `start_time` | BigInt | `AppStart` の時刻（ms） |
| `end_time` | BigInt nullable | 終了時刻。未終了時は `NULL` |
| `last_event_time` | BigInt | この app session の最終確認ログ時刻 |
| `is_graceful` | Boolean nullable | 通常終了は `true`、異常終了は `false`、未終了は `NULL` |
| `user_id` | String nullable | `Login` で確定する自身のユーザー ID |
| `username` | String nullable | `Login` で確定する表示名 |
| `pending_world_name` | String nullable | 次の `InstanceJoin` に対応する、同一 app 内の最新 `WorldEnter` のワールド名 |

### `instance_sessions`

| 列 | 型 | 説明 |
| --- | --- | --- |
| `id` | Integer PK | セッション ID |
| `app_session_id` | Integer FK | 親の `app_sessions.id` |
| `world_name` | String | ワールド名 |
| `instance_id` | String | VRChat instance ID |
| `start_time` | BigInt | `InstanceJoin` の時刻（ms） |
| `end_time` | BigInt nullable | 終了時刻。未終了時は `NULL` |
| `last_event_time` | BigInt | この instance session の最終確認ログ時刻 |
| `is_graceful` | Boolean nullable | 正常な切替・終了は `true`、異常終了は `false`、未終了は `NULL` |

### `user_sessions`

| 列 | 型 | 説明 |
| --- | --- | --- |
| `id` | Integer PK | 区間 ID |
| `instance_session_id` | Integer FK | 親の `instance_sessions.id` |
| `user_id` | String | プレイヤー ID |
| `display_name` | String | 入室時の表示名 |
| `join_time` | BigInt | 入室時刻（ms） |
| `leave_time` | BigInt nullable | 退出時刻。未退出時は `NULL` |

外部キーは親削除時に `CASCADE` する。追加するインデックスは、`app_sessions(end_time, start_time)`、`instance_sessions(app_session_id, end_time, start_time)`、`user_sessions(instance_session_id, user_id, leave_time)` とする。

同時に未終了にできるレコードは、app 全体で 1 件、app ごとの instance で 1 件、instance と user の組ごとで 1 件とする。SQLite の部分ユニークインデックスでこれを保護する。また、`end_time >= start_time`、`leave_time >= join_time`、未終了時は `is_graceful IS NULL` という制約を DB レベルで持つ。

`last_event_time` を持つことで、クラッシュした未終了レコードを UI へ返すときに「現在時刻」ではなく、そのセッションで実際に記録された最終ログ時刻を終了時刻として使える。

## ログ投影

### 共通の書き込み入口

Watcher と CLI import は、共通の `record_log` 相当の DB API を使用する。Watcher はこれに加え、セッション状態を変えないタイムスタンプ付きログ行を受けたときだけ、現在のセッションの最終確認時刻を更新する。この API は次を単一トランザクションで実行する。

1. `logs` へ挿入する。ハッシュ重複なら後続処理を行わない。
2. 新規ログをセッション投影へ適用する。
3. 投影進捗を更新して commit する。

生ログだけが保存され、セッション投影だけが失敗する部分成功を許容しない。`ON CONFLICT DO NOTHING` の結果は、`last_insert_id` の値に依存せず、影響行数で新規挿入かどうかを判定する。重複ログではセッションを二重更新しない。

この API とバックフィルは単一の投影 writer queue を共有する。SQLite の transaction はデータ原子性を保証するが、論理的なイベント順序までは保証しないためである。短い transaction、SQLite の busy timeout、および `BUSY` 時の限定回数リトライを実装する。投影失敗を Watcher で握りつぶさず、診断ログと再試行または再構築要求を残す。

### イベントごとの状態遷移

| イベント | 処理 |
| --- | --- |
| `AppStart` | 未終了の現在 app session を `last_event_time`・`is_graceful = false` で閉じ、配下の未終了 instance / user session も異常終了として閉じる。次に新しい app session を開始する。 |
| `Login` | 未終了の現在 app session に `user_id` と `username` を設定し、`last_event_time` を更新する。 |
| `WorldEnter` | 現在 app session の `pending_world_name` を更新する。別 app のログを検索してワールド名を取得しない。 |
| `InstanceJoin` | 現在の app session に属する未終了 instance session だけを正常終了として閉じ、新しい instance session を開始する。 |
| `PlayerJoin` | 現在の instance session に属する同一ユーザーの未終了区間があれば、開始時刻は維持し表示名だけを最新値へ更新する。なければ新しい user session を開始する。 |
| `PlayerLeft` | 現在の instance session に属する該当ユーザーの未終了区間だけを閉じる。 |
| `AppStop` | 現在の app session と配下の未終了 instance / user session を、イベント時刻・`is_graceful = true` で閉じる。 |
| `InvalidAppStop` | 既存ログの再生時のみ `AppStop` と同様に閉じるが、`is_graceful = false` を記録する。 |

`InstanceJoin` は `pending_world_name` を採用後にクリアし、値がなければ `Unknown World` を使用する。すべての更新は「現在の app session」またはその子孫に絞る。未終了レコードをテーブル全体で一括クローズしてはならない。

対応する未終了親がない `InstanceJoin`、`PlayerJoin`、`PlayerLeft`、`AppStop`、`InvalidAppStop` は、投影では no-op として診断する。生ログは削除しない。`SelfLeft` は既存 `SessionBuilder` と同じく instance 終了に使わず、投影上も no-op とする。終了時刻が開始時刻より前になるログは、その状態変更を行わず診断する。

### 時系列と並行処理

投影順は `(timestamp, logs.id)` の昇順とする。進捗には同じ組を保存し、同時時刻のログも安定して再生する。各受理イベントで、現在の app session と instance session の `last_event_time` を単調に更新する。さらに Watcher は、セッション状態を変えないタイムスタンプ付きログ行でも、現在の app session と instance session の `last_event_time` を単調に更新する。これにより、異常終了時に別 session のログ時刻を誤用せず、最後に確認できたログ時刻を終了時刻として使える。

CLI import やログローテーションにより、既に投影したログより古いログが新規挿入される場合がある。その場合は差分適用せず、投影を `rebuild_required` にし、全生ログから再構築する。これにより時系列が逆転した状態を永続化しない。

バックフィル中と通常のログ投影は、同一の非同期排他制御下で実行する。バックフィル中の新規ログは書き込み入口で待機させ、バックフィル完了後に時系列どおりに投影する。UI スレッドは待機させない。

## バックフィルと進捗管理

投影の状態は既存の `settings` テーブルに保存する。少なくとも、投影バージョン、状態（`pending` / `running` / `complete` / `rebuild_required` / `failed`）、最後に投影した `(timestamp, log_id)`、世代番号を持つ。

起動後にバックグラウンドタスクとして以下を実行する。

1. 状態が `complete` で投影バージョンが一致すれば終了する。
2. `pending`、`rebuild_required`、または投影バージョン不一致なら、派生テーブルと進捗をリセットして新しい世代を開始する。
3. `running` または `failed` の同一世代では、最後に commit 済みの `(timestamp, log_id)` から再開する。アクティブな親子状態は投影テーブルに残っているため、同じ順序で継続できる。
4. 生ログを `(timestamp, id)` 昇順でチャンク取得し、各チャンクをトランザクションで投影して進捗を更新する。
5. 最終チャンクの commit 後にのみ `complete` とする。

途中で停止した場合、未 commit のチャンクはロールバックされ、最後に commit 済みの進捗から再開する。投影中に古いログが追加された場合は `rebuild_required` として次回または直後に再構築する。ログ全削除は writer queue の排他下で世代番号を進め、進行中の古いバックフィルが削除済みのデータを書き戻せないようにする。

## `get_sessions` の取得仕様

`get_sessions(start, end)` は生ログを読み直さず、セッションテーブルを使用する。

- 指定範囲と重なる instance session を取得する。
- `end_time = NULL` の instance session は `last_event_time` を実効終了時刻として扱う。
- 返却する `startTime` と `endTime` は実際のセッション境界を保ち、指定日で切り詰めない。これは既存 Desktop UI の日付またぎ表示を維持するためである。
- `user_sessions` は同じ `user_id` ごとに区間を集約し、合計滞在時間の降順に並べる。
- 親 `app_sessions` のユーザー ID と一致する区間は `players` から除外する。
- `username` は親 `app_sessions` から返す。

この変換結果は既存の `SessionPayload` 形式を維持するため、Desktop UI の History List / Timeline は変更しない。

## 周辺操作

- `delete_all_logs` は writer queue の排他下で、全セッションデータ、投影進捗、`logs` を一つの transaction で削除する。`VACUUM` は削除 transaction の commit 後に行う。
- `/logs` とログエクスポートは、生ログを返し続ける。過去の `InvalidAppStop` も返却対象に含める。
- `get_sessions` の範囲検索と、`/logs`・Tauri `get_logs`・エクスポートの生ログ検索は別の契約として維持する。後者の既存の範囲拡張は、Mobile の増分同期と hash 重複除去に依存しているため、この移行だけでは変更しない。
- Desktop の生成済み bindings は手編集せず、Rust の共有イベント型変更後に `make gen-bindings` で再生成する。
- Mobile の Desktop API 型は手動定義であるため、Desktop のイベント型と同時に互換性テストで検証する。

## 検証方針

一時 SQLite DB を用いたリポジトリテストで、少なくとも以下を検証する。

1. 通常の AppStart / Login / InstanceJoin / PlayerJoin / PlayerLeft / AppStop。
2. 次の AppStart で前回 session が異常終了として閉じること。
3. 既存の `InvalidAppStop` が異常終了として投影され、生ログとしても読めること。
4. 日付またぎと未終了 session が `last_event_time` で正しく返ること。
5. 同一ハッシュの重複ログで二重の player interval が作られないこと。
6. 同時時刻のログ、順序外 import、バックフィル途中停止と再開。
7. ログ全削除後に session と進捗が残らないこと。
8. `SessionPayload` の world、instance、username、players、intervals、duration が既存形式と一致すること。
9. `get_logs`、`export_logs`、HTTP `/logs` が既存 JSON の `InvalidAppStop` を返せること。
10. `start > end`、範囲境界ちょうど、DST 日、親不在イベント、重複 Join / Left が安全に扱われること。
11. セッション状態を変えないタイムスタンプ付きログ行の後、次の `AppStart` による異常終了の終了時刻が、その最終ログ時刻になること。
