use std::fs::File;
use std::io::BufWriter;

use crate::db::DB;
use crate::modules::watcher::LogPayload;

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
