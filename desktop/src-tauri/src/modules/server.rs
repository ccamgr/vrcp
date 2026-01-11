use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use local_ip_address::local_ip;
use serde::Deserialize;
use std::net::SocketAddr;
use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;
use tower_http::cors::CorsLayer;

use crate::db::DB;

use super::watcher::LogPayload;

const SERVER_PORT: u16 = 8727;

pub struct ServerState {
    pub handle: Mutex<Option<JoinHandle<()>>>,
}

impl ServerState {
    pub fn new() -> Self {
        Self {
            handle: Mutex::new(None),
        }
    }
}

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
    State(db): State<DB>,
    Query(params): Query<LogParams>,
) -> Result<Json<Vec<LogPayload>>, StatusCode> {
    match db
        .logs()
        .get_session_expanded_logs(params.start.as_deref(), params.end.as_deref())
        .await
    {
        Ok(logs) => Ok(Json(logs)),
        Err(e) => {
            eprintln!("Failed to fetch logs from DB: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Start the HTTP server in a background task
pub fn spawn_server(db: DB) {
    tauri::async_runtime::spawn(async move {
        // Read port from settings
        let port_str = db.settings().get_setting("port").await.unwrap_or(None);
        let port: u16 = port_str
            .as_deref()
            .unwrap_or(&SERVER_PORT.to_string())
            .parse()
            .unwrap_or(SERVER_PORT);
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
pub async fn get_server_url(db: tauri::State<'_, DB>) -> Result<String, String> {
    let ip = local_ip().map_err(|e| e.to_string())?;

    let port_str = db
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
    db: tauri::State<'_, DB>,
    port: u16,
) -> Result<(), String> {
    // 1. バリデーション (u16なので 0~65535 は保証されるが、0番ポートなどを弾くならここに書く)
    if port == 0 {
        return Err("Port 0 is not allowed".to_string());
    }

    // 2. DBに保存 (文字列として保存)
    // map_err で DBのエラーを文字列化してフロントエンドに返せるようにする
    db.settings()
        .set_setting("port", &port.to_string())
        .await
        .map_err(|e| e.to_string())?;

    // 3. restart
    app.restart();
    // Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_server_port(db: tauri::State<'_, DB>) -> Result<u16, String> {
    let port_str = db
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
