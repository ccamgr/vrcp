use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use std::net::SocketAddr;
use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;
use tower_http::cors::CorsLayer;

use crate::db::DB;

use super::watcher::LogPayload;

pub const SERVER_PORT: u16 = 8727;

pub struct HttpSrv {
    pub handle: Mutex<Option<JoinHandle<()>>>,
    pub port: Mutex<u16>,
    pub running: Mutex<bool>,
}

impl HttpSrv {
    pub fn new(db: DB) -> Self {
        let handle = spawn_server(db.clone());
        Self {
            handle: Mutex::new(Some(handle)),
            port: Mutex::new(SERVER_PORT),
            running: Mutex::new(false),
        }
    }
}

/// Query parameters for the /logs endpoint
#[derive(Deserialize)]
struct LogParams {
    /// Get logs occurred after this timestamp.
    /// Optional: if missing, returns all logs (or you can set a default limit).
    start: Option<i64>,
    end: Option<i64>,
}

/// Handler for GET /logs
async fn handle_get_logs(
    State(db): State<DB>,
    Query(params): Query<LogParams>,
) -> Result<Json<Vec<LogPayload>>, StatusCode> {
    match db
        .logs()
        .get_session_expanded_logs(params.start.as_ref(), params.end.as_ref())
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
pub fn spawn_server(db: DB) -> JoinHandle<()> {
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
    })
}
