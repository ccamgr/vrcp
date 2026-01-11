use std::fs::File;
use std::io::BufWriter;

use crate::db::schema::logs;
use crate::db::DB;
use crate::modules::watcher::{LogPayload, VrcLogEvent};
use sea_orm::*; // 既存の型をインポート

pub struct LogsRepository {
    db: DatabaseConnection,
}

impl LogsRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn insert_log(&self, payload: &LogPayload) -> Result<i32, DbErr> {
        // Event Type抽出ロジック (既存コード踏襲)
        let event_type_str = format!("{:?}", payload.event)
            .split_whitespace()
            .next()
            .unwrap_or("Unknown")
            .to_string()
            .replace(" {", "")
            .replace("}", "");

        let data_json =
            serde_json::to_string(&payload.event).map_err(|e| DbErr::Custom(e.to_string()))?;

        let new_log = logs::ActiveModel {
            timestamp: Set(payload.timestamp.clone()),
            event_type: Set(event_type_str),
            data: Set(data_json),
            hash: Set(payload.hash),
            ..Default::default()
        };

        // INSERT OR IGNORE は SeaORM の insert 失敗時のハンドリングで行うか、
        // on_conflict_do_nothing を使う
        let res = logs::Entity::insert(new_log)
            .on_conflict(
                sea_orm::sea_query::OnConflict::column(logs::Column::Hash)
                    .do_nothing()
                    .to_owned(),
            )
            .exec(&self.db)
            .await;

        match res {
            Ok(res) => Ok(res.last_insert_id as i32),
            Err(e) => Err(e),
        }
    }

    /// 複雑なサブクエリを含むログ取得
    pub async fn get_session_expanded_logs(
        &self,
        start_timestamp: Option<&str>,
        end_timestamp: Option<&str>,
    ) -> Result<Vec<LogPayload>, DbErr> {
        let start = start_timestamp.unwrap_or("1970-01-01 00:00:00");
        let end = end_timestamp.unwrap_or("9999-12-31 23:59:59");

        // 元のRusqliteのSQLを移植
        // SQLx/SeaORMのプレースホルダーは '?' が使える
        // ※値はバインド順に渡す必要があるため、start/endを複数回渡している点に注意
        let sql = r#"
            SELECT *
            FROM logs
            WHERE timestamp >= (
                SELECT COALESCE(
                    (SELECT timestamp FROM logs
                     WHERE timestamp < ?
                       AND timestamp > datetime(?, '-24 hours')
                       AND event_type = 'AppStart'
                     ORDER BY timestamp DESC LIMIT 1),
                    ?
                )
            )
            AND timestamp <= (
                SELECT COALESCE(
                    (SELECT timestamp FROM logs
                     WHERE timestamp > ?
                       AND timestamp < datetime(?, '+24 hours')
                       AND event_type IN ('AppStop', 'InvalidAppStop')
                     ORDER BY timestamp ASC LIMIT 1),
                    ?
                )
            )
            ORDER BY timestamp ASC, id ASC
        "#;

        // パラメータバインド:
        // 1: < ? (start)
        // 2: datetime(?, ...) (start)
        // 3: COALESCE(..., ?) (start)
        // 4: > ? (end)
        // 5: datetime(?, ...) (end)
        // 6: COALESCE(..., ?) (end)
        let query_res = logs::Entity::find()
            .from_raw_sql(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                sql,
                vec![
                    start.into(),
                    start.into(),
                    start.into(),
                    end.into(),
                    end.into(),
                    end.into(),
                ],
            ))
            .all(&self.db)
            .await?;

        // Model -> Payload 変換
        let mut payloads = Vec::new();
        for row in query_res {
            let event: VrcLogEvent = serde_json::from_str(&row.data)
                .map_err(|e| DbErr::Custom(format!("JSON Parse Error: {}", e)))?;

            payloads.push(LogPayload {
                event,
                timestamp: row.timestamp,
                hash: row.hash,
            });
        }

        Ok(payloads)
    }

    pub async fn delete_all_logs(&self) -> Result<(), DbErr> {
        // 全削除
        logs::Entity::delete_many().exec(&self.db).await?;

        // VACUUM (カスタム実行)
        self.db
            .execute(Statement::from_string(
                DatabaseBackend::Sqlite,
                "VACUUM;".to_owned(),
            ))
            .await?;

        Ok(())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_logs(
    db: tauri::State<'_, DB>,
    start: Option<String>,
    end: Option<String>,
) -> Result<Vec<LogPayload>, String> {
    // db.get_logs の frontからの呼び出し
    db.logs()
        .get_session_expanded_logs(start.as_deref(), end.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_all_logs(db: tauri::State<'_, DB>) -> Result<(), String> {
    db.logs()
        .delete_all_logs()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn export_logs(db: tauri::State<'_, DB>, file_path: String) -> Result<usize, String> {
    // 1. 全ログを取得 (since=None, until=None で全期間)
    let logs = db
        .logs()
        .get_session_expanded_logs(None, None)
        .await
        .map_err(|e| e.to_string())?;
    let count = logs.len();

    // 2. ファイルを作成
    let file = File::create(file_path).map_err(|e| e.to_string())?;
    let writer = BufWriter::new(file);

    // 3. JSONとして書き出し (Pretty Printで見やすく)
    serde_json::to_writer_pretty(writer, &logs).map_err(|e| e.to_string())?;

    Ok(count)
}
