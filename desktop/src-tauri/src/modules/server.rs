use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use local_ip_address::local_ip;
use serde::Deserialize;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

use super::db::LogDatabase;
use super::watcher::Payload;

const SERVER_PORT: u16 = 8727;

/// Query parameters for the /logs endpoint
#[derive(Deserialize)]
struct LogParams {
    /// Get logs occurred after this timestamp.
    /// Optional: if missing, returns all logs (or you can set a default limit).
    start: Option<String>,
    end: Option<String>,
}

/// Handler for GET /logs
async fn handle_get_logs(
    State(db): State<LogDatabase>,
    Query(params): Query<LogParams>,
) -> Result<Json<Vec<Payload>>, StatusCode> {
    match db.get_logs(params.start.as_deref(), params.end.as_deref()) {
        Ok(logs) => Ok(Json(logs)),
        Err(e) => {
            eprintln!("Failed to fetch logs from DB: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Start the HTTP server in a background task
pub fn spawn_server(db: LogDatabase) {
    tauri::async_runtime::spawn(async move {
        let port_str = db.get_setting("port").unwrap_or(SERVER_PORT.to_string());
        let port: u16 = port_str.parse().unwrap_or(SERVER_PORT);
        // Build the application router
        let app = Router::new()
            .route("/logs", get(handle_get_logs))
            .with_state(db) // Share the DB instance with handlers
            .layer(CorsLayer::permissive()); // Allow access from Mobile (different IP)

        // Listen on 0.0.0.0 to accept connections from LAN (Mobile)
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        println!("HTTP Server listening on http://{}", addr);

        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    });
}

#[tauri::command]
#[specta::specta]
pub fn get_server_url(db: tauri::State<'_, LogDatabase>) -> Result<String, String> {
    let ip = local_ip().map_err(|e| e.to_string())?;

    let port_str = db.get_setting("port").unwrap_or(SERVER_PORT.to_string());
    let port: u16 = port_str.parse().unwrap_or(SERVER_PORT);
    println!(
        "get_server_url: Providing server URL: http://{}:{}",
        ip, port
    );
    Ok(format!("http://{}:{}", ip, port))
}

#[tauri::command]
#[specta::specta]
pub fn set_server_port(
    app: tauri::AppHandle,
    db: tauri::State<'_, LogDatabase>,
    port: u16,
) -> Result<(), String> {
    // 1. バリデーション (u16なので 0~65535 は保証されるが、0番ポートなどを弾くならここに書く)
    if port == 0 {
        return Err("Port 0 is not allowed".to_string());
    }

    // 2. DBに保存 (文字列として保存)
    // map_err で DBのエラーを文字列化してフロントエンドに返せるようにする
    db.set_setting("port", &port.to_string())
        .map_err(|e| e.to_string())?;

    // 3. restart
    app.restart();
    // Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_server_port(db: tauri::State<'_, LogDatabase>) -> Result<u16, String> {
    let port_str = db.get_setting("port").unwrap_or(SERVER_PORT.to_string());
    let port: u16 = port_str.parse().unwrap_or(SERVER_PORT);
    Ok(port)
}
