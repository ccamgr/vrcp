

use local_ip_address::local_ip;
use crate::{Ctx, modules::http::SERVER_PORT};

#[tauri::command]
#[specta::specta]
pub async fn get_server_url(state: tauri::State<'_, Ctx>) -> Result<String, String> {
    let ip = local_ip().map_err(|e| e.to_string())?;

    let port_str = state.db
        .settings()
        .get_setting("port")
        .await
        .map_err(|e| e.to_string())?;
    let port: u16 = port_str
        .as_deref()
        .unwrap_or(&SERVER_PORT.to_string())
        .parse()
        .unwrap_or(SERVER_PORT);
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

    // 2. DBに保存 (文字列として保存)
    // map_err で DBのエラーを文字列化してフロントエンドに返せるようにする
    state.db.settings()
        .set_setting("port", &port.to_string())
        .await
        .map_err(|e| e.to_string())?;

    // 3. restart
    app.restart();
    // Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_server_port(state: tauri::State<'_, Ctx>) -> Result<u16, String> {
    let port_str = state.db
        .settings()
        .get_setting("port")
        .await
        .map_err(|e| e.to_string())?;
    let port: u16 = port_str
        .as_deref()
        .unwrap_or(&SERVER_PORT.to_string())
        .parse()
        .unwrap_or(SERVER_PORT);
    Ok(port)
}
