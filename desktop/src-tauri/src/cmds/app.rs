use serde_json::json;

#[tauri::command]
#[specta::specta]
pub fn log_direct_launch_failure(
    world_id: String,
    instance_id: String,
    launch_url: String,
    error_name: String,
    error_message: String,
    error_stack: Option<String>,
) -> Result<(), String> {
    crate::append_error_log(
        json!({
            "event": "direct_instance_launch_failed",
            "worldId": world_id,
            "instanceId": instance_id,
            "launchUrl": launch_url,
            "errorName": error_name,
            "errorMessage": error_message,
            "errorStack": error_stack,
        })
        .to_string()
        .as_str(),
    );
    Ok(())
}
