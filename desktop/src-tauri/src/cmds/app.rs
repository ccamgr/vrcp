#[tauri::command]
#[specta::specta]
pub fn log_direct_launch_result(
    world_id: String,
    instance_id: String,
    launch_url: String,
    status: String,
    error: Option<String>,
) -> Result<(), String> {
    let mut fields = vec![
        ("world_id", world_id.as_str()),
        ("instance_id", instance_id.as_str()),
        ("launch_url", launch_url.as_str()),
        ("status", status.as_str()),
    ];
    if let Some(error) = error.as_deref() {
        fields.push(("error", error));
    }
    if status == "failed" {
        crate::logging::error("vrchat.launch", &fields);
    } else {
        crate::logging::info("vrchat.launch", &fields);
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn log_autostart_change(enabled: bool) -> Result<(), String> {
    crate::logging::info(
        "setting.change",
        &[
            ("key", "autostart"),
            ("value", if enabled { "true" } else { "false" }),
            ("status", "success"),
        ],
    );
    Ok(())
}
