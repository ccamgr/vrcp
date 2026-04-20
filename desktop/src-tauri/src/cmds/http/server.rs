

use local_ip_address::local_ip;
use crate::{Ctx, modules::http::SERVER_PORT};

#[tauri::command]
#[specta::specta]
pub async fn get_server_url(state: tauri::State<'_, Ctx>) -> Result<String, String> {
    let ip = local_ip().map_err(|e| e.to_string())?;

    let port = *state.srv.port.lock().unwrap();
    Ok(format!("http://{}:{}", ip, port))
}

#[tauri::command]
#[specta::specta]
pub async fn set_server_port(
    app: tauri::AppHandle,
    state: tauri::State<'_, Ctx>,
    port: u16,
) -> Result<(), String> {
    // 1. バリデーション (u16なので 0~65535 は保証されるが、0番ポートなどを弾くならここに書く)
    if port == 0 {
        return Err("Port 0 is not allowed".to_string());
    }
    let current_port = *state.srv.port.lock().unwrap();
    if port == current_port {
        return Ok(()); // 変更なし
    }
    state
        .srv
        .restart(state.db.clone(), port)
        .await
        .map_err(|e| format!("Failed to restart server: {}", e))?;
    println!("HTTP server restarted on port {}", port);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_server_port(state: tauri::State<'_, Ctx>) -> Result<u16, String> {
    let port = *state.srv.port.lock().unwrap();
    Ok(port)
}
