use crate::contracts::sessions::SessionPayload;
use crate::Ctx;

#[tauri::command]
#[specta::specta]
pub async fn get_sessions(
    state: tauri::State<'_, Ctx>,
    start: Option<i64>,
    end: Option<i64>,
) -> Result<Vec<SessionPayload>, String> {
    state
        .db
        .get_sessions(start, end)
        .await
        .map_err(|error| error.to_string())
}
