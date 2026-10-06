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
        crate::logging::warn("api.invite_myself", &[("status", "invalid_request")]);
        return Err("A valid world and instance ID are required".to_string());
    }

    let config = state.vrcapi.config.lock().await;
    match invite_myself_to(&config, &world_id, &instance_id).await {
        Ok(_) => {
            crate::logging::info(
                "api.invite_myself",
                &[
                    ("world_id", &world_id),
                    ("instance_id", &instance_id),
                    ("status", "success"),
                ],
            );
            Ok(())
        }
        Err(error) => {
            let message = error.to_string();
            crate::logging::error(
                "api.invite_myself",
                &[
                    ("world_id", &world_id),
                    ("instance_id", &instance_id),
                    ("status", "failed"),
                    ("error", &message),
                ],
            );
            Err(format!("Failed to send self-invite: {error}"))
        }
    }
}
