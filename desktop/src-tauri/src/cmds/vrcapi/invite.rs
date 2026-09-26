use tauri::State;
use vrchatapi::apis::invite_api::invite_myself_to;

use crate::Ctx;

#[tauri::command]
#[specta::specta]
pub async fn invite_myself(
    world_id: String,
    instance_id: String,
    state: State<'_, Ctx>,
) -> Result<(), String> {
    if !world_id.starts_with("wrld_") || instance_id.trim().is_empty() {
        return Err("A valid world and instance ID are required".to_string());
    }

    let config = state.vrcapi.config.lock().await;
    invite_myself_to(&config, &world_id, &instance_id)
        .await
        .map(|_| ())
        .map_err(|error| format!("Failed to send self-invite: {error}"))
}
