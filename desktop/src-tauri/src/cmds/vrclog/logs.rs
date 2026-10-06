use std::fs::File;
use std::io::BufWriter;

use crate::modules::watcher::LogPayload;
use crate::Ctx;

#[tauri::command]
#[specta::specta]
pub async fn get_logs(
    state: tauri::State<'_, Ctx>,
    start: Option<i64>,
    end: Option<i64>,
) -> Result<Vec<LogPayload>, String> {
    // db.get_logs の frontからの呼び出し
    state
        .db
        .logs()
        .get_session_expanded_logs(start.as_ref(), end.as_ref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_all_logs(state: tauri::State<'_, Ctx>) -> Result<(), String> {
    match state.db.delete_all_log_data().await {
        Ok(()) => {
            crate::logging::info("logs.delete_all", &[("status", "success")]);
            Ok(())
        }
        Err(error) => {
            let message = error.to_string();
            crate::logging::error(
                "logs.delete_all",
                &[("status", "failed"), ("error", &message)],
            );
            Err(message)
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn export_logs(state: tauri::State<'_, Ctx>, file_path: String) -> Result<usize, String> {
    // 1. 全ログを取得 (since=None, until=None で全期間)
    let logs = state
        .db
        .logs()
        .get_session_expanded_logs(None, None)
        .await
        .map_err(|error| {
            let message = error.to_string();
            crate::logging::error("logs.export", &[("status", "failed"), ("error", &message)]);
            message
        })?;
    let count = logs.len();

    // 2. ファイルを作成
    let file = File::create(&file_path).map_err(|error| {
        let message = error.to_string();
        crate::logging::error("logs.export", &[("status", "failed"), ("error", &message)]);
        message
    })?;
    let writer = BufWriter::new(file);

    // 3. JSONとして書き出し (Pretty Printで見やすく)
    serde_json::to_writer_pretty(writer, &logs).map_err(|error| {
        let message = error.to_string();
        crate::logging::error("logs.export", &[("status", "failed"), ("error", &message)]);
        message
    })?;

    crate::logging::info(
        "logs.export",
        &[("status", "success"), ("count", &count.to_string())],
    );
    Ok(count)
}
