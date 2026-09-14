# Desktop Session DB Migration Plan

## 1. 目的と方針
現在、ログデータ（生ログ）からフロントエンド向けにセッション情報を都度構築して返却していますが、これをやめ、バックエンド側でログのパース時に専用の「セッションテーブル」に書き出すように変更します。
これにより、フロントエンド・モバイルからのクエリパフォーマンスが向上し、クラッシュ等の状態異常もスキーマレベルで綺麗に表現できるようになります。

特に、以前から課題であった `InvalidAppStop`（クラッシュ時に無理やりダミーのAppStopを挿入する仕組み）を廃止し、正規の DB スキーマ (`is_graceful`) でクラッシュ判定を行います。

## 2. スキーマ設計の変更 (SeaORM)

`desktop/src-tauri/src/db/schema/` に以下の3つのテーブルを追加し、マイグレーション (`src-tauri/src/db/migrator/`) を作成します。

### `app_sessions`
VRChatの起動から終了までのセッション。
- `id`: Integer, Primary Key
- `start_time`: BigInt (起動時刻 ms)
- `end_time`: BigInt, Nullable (終了時刻 ms)
- `is_graceful`: Boolean, Nullable (正常終了(`AppStop`)した場合は `true`、クラッシュと判定された場合は `false`)

### `instance_sessions`
各インスタンスへの滞在。
- `id`: Integer, Primary Key
- `app_session_id`: Integer, Foreign Key (`app_sessions.id`)
- `world_name`: String
- `instance_id`: String
- `start_time`: BigInt
- `end_time`: BigInt, Nullable
- `is_graceful`: Boolean, Nullable (正常に退出した場合は `true`、クラッシュなど異常終了で退出した場合は `false`)

### `user_sessions`
インスタンスに同席したプレイヤー（Join/Leaveごとの区間）。
- `id`: Integer, Primary Key
- `instance_session_id`: Integer, Foreign Key (`instance_sessions.id`)
- `user_id`: String
- `display_name`: String
- `join_time`: BigInt
- `leave_time`: BigInt, Nullable

## 3. 実装のステップ

### Step 1: `InvalidAppStop` の新規生成廃止と互換維持
- Watcher と CLI import にある `InvalidAppStop` の新規挿入ロジックを削除します。
- 既存 DB の読み取り互換のため、イベント型と共有 bindings には `InvalidAppStop` を残し、既存レコードを正常にデシリアライズできるようにします。
- 既存の `InvalidAppStop` はセッション投影時に異常終了として扱います。ログファイルが新たに途切れた場合は、単に `AppStop` が存在しない生ログとして記録されます。

### Step 2: セッションテーブルの作成とマイグレーション
- SeaORM を用いてエンティティ（モデル）を定義します。
- `migrator` に新しいマイグレーションスクリプトを追加し、上記3テーブルを作成します。

### Step 3: ウォッチャー (ログ書き込み側) の更新
ログファイルから新しい行が読み込まれたタイミング（`watcher.rs` や `repositories::logs`）で、セッションテーブルも逐次更新します。
- **AppStart**: 新しい `app_sessions` を挿入。
  - *クラッシュ判定*: この時、終了していない既存の `app_sessions` があれば、クラッシュしていたと判定し `is_graceful = false` とします。また、そのセッションの `end_time` には必ず**「そのセッション内で記録された最後のログの時刻」**を設定します（決して新しいAppStartの時刻にはしません）。
- **AppStop**: 現在の `app_sessions` を閉じ、`is_graceful = true` とします。
- **InstanceJoin**: 前の `instance_sessions` を閉じ、新しい `instance_sessions` を開始します。
- **PlayerJoin / PlayerLeft**: 該当するユーザーの `user_sessions` を追加・クローズします。

### Step 4: `get_sessions` API の書き換え
現在生ログを元にオンザフライで生成している `desktop/src-tauri/src/cmds/vrclog/sessions.rs` の `get_sessions` コマンドを、**新しいDBテーブルから SELECT して構築する**ように変更します。
- 出力形式 (`SessionPayload` の型) は完全に維持します。
- UI側での日付またぎのレンダリング等のロジックは、そのまま動作するように出力データのフォーマット・構造を保証します。これにより、フロントエンド側のコンポーネント（HistoryTimelineなど）には影響が出ません。

### Step 5: 既存データのバックフィル（データ移行）
すでに保存されている大量の生ログから、新しいセッションテーブルを構築するバックフィル処理を実装します。
- **実行タイミング**: 起動時のDBマイグレーション処理内ではなく、**DB初期化後の非同期タスク**としてバックグラウンドで実行します。（ログが多いユーザーのアプリ起動フリーズを防ぐため）
- **処理ロジック**: セッションテーブルが空の場合のみ、`logs` テーブルから古い順にチャンク（ストリーム）で読み出し、`SessionBuilder` のロジックを用いてセッションを構築し、クローズされる度にDBへ `INSERT` します。
- **最適化**: 何万件もの単一 `INSERT` を避けるため、トランザクションや一括挿入（バルクインサート）を用いて数秒以内で完了するようにします。処理が中断されても最初からやり直せる「べき等性」を持たせます。

## 4. 懸念点とエッジケースへの対応
- **クラッシュ中・非起動時の UI 表示**: VRChatがクラッシュして放置されている間など、DB上で `end_time = NULL` となっている進行中セッションをフロントエンドに返す際、`SessionPayload` の `endTime` には暫定的に**「そのセッションの最後のログの時刻」**をセットして返します。これにより、非起動時にUI上で「現在時刻までずっとセッションが続いている」と誤表示されるのを防ぎます。
- **日付をまたぐセッション**: DBには単純な Unix Timestamp (ms) として記録され、`get_sessions` はそれをそのまま返却するため、今まで通りフロントエンドの既存ロジックが日付ごとのグルーピングを担当します。表示のバグは生じません。

## 5. 将来の拡張性（プロセス監視によるリアルタイムクラッシュ検知）
現在は「ログファイルの読み取り」のみで状態を判定しているため、VRChatがクラッシュした際は「次の起動時」までクラッシュ判定が遅延します（UI表示は最後のログ時刻で仮止めされます）。
もしこの「表示上のタイムラグ」が今後ユーザー体験の課題となった場合は、将来的な拡張として以下のような**「VRChatプロセスの直接監視機能」**の追加を検討します。
- **仕組み**: `sysinfo` クレート等を利用してOSの稼働プロセスを定期ポーリングし、`VRChat.exe` の消失を検知する。
- **クラッシュ判定**: プロセスが消失し、かつログに `AppStop` が数秒間書き込まれなかった場合、その瞬間に即座にセッションを `is_graceful = false` でクローズする。
- **導入の壁**: EAC（Easy Anti-Cheat）への影響調査や、正常終了時のログ書き込み遅延との競合（レースコンディション）を防ぐためのバッファ処理の実装が必要となるため、今回は一旦見送ります。
