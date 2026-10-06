use crate::Ctx;
use local_ip_address::local_ip;

#[tauri::command]
#[specta::specta]
pub async fn get_server_url(state: tauri::State<'_, Ctx>) -> Result<String, String> {
    let ip = local_ip().map_err(|e| e.to_string())?;

    let port = state
        .srv
        .port
        .lock()
        .unwrap()
        .ok_or_else(|| "HTTP server is not running".to_string())?;
    Ok(format!("http://{}:{}", ip, port))
}

#[tauri::command]
#[specta::specta]
pub async fn set_server_port(state: tauri::State<'_, Ctx>, port: u16) -> Result<(), String> {
    // 1. バリデーション (u16なので 0~65535 は保証されるが、0番ポートなどを弾くならここに書く)
    if port == 0 {
        crate::logging::warn(
            "setting.change",
            &[("key", "http_port"), ("status", "invalid")],
        );
        return Err("Port 0 is not allowed".to_string());
    }
    let current_port = *state.srv.port.lock().unwrap();
    if current_port == Some(port) {
        crate::logging::info(
            "setting.change",
            &[
                ("key", "http_port"),
                ("value", &port.to_string()),
                ("status", "unchanged"),
            ],
        );
        return Ok(()); // 変更なし
    }
    if let Err(error) = state.srv.restart(state.db.clone(), port).await {
        crate::logging::error(
            "setting.change",
            &[
                ("key", "http_port"),
                ("value", &port.to_string()),
                ("status", "failed"),
                ("error", &error),
            ],
        );
        return Err(format!("Failed to restart server: {error}"));
    }
    crate::logging::info(
        "setting.change",
        &[
            ("key", "http_port"),
            ("value", &port.to_string()),
            ("status", "success"),
        ],
    );
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_server_port(state: tauri::State<'_, Ctx>) -> Result<u16, String> {
    state
        .srv
        .port
        .lock()
        .unwrap()
        .ok_or_else(|| "HTTP server is not running".to_string())
}
