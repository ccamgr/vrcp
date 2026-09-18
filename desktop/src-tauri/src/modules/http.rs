use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;
use tower_http::cors::CorsLayer;

use crate::cmds::vrclog::sessions::SessionPayload;
use crate::db::DB;

use super::watcher::LogPayload;

pub const SERVER_PORT: u16 = 8727;
const DEFAULT_LOG_PAGE_SIZE: u64 = 1_000;
const MAX_LOG_PAGE_SIZE: u64 = 1_000;
const SESSION_SCHEMA_VERSION: u32 = 2;

pub struct HttpSrv {
    pub handle: Mutex<Option<JoinHandle<()>>>,
    pub port: Mutex<Option<u16>>,
}

impl HttpSrv {
    pub async fn new(db: DB) -> Self {
        let configured_port = configured_port(&db).await;
        match spawn_server(db, configured_port).await {
            Ok(handle) => Self {
                handle: Mutex::new(Some(handle)),
                port: Mutex::new(Some(configured_port)),
            },
            Err(error) => {
                eprintln!("Failed to start HTTP server: {error}");
                Self {
                    handle: Mutex::new(None),
                    port: Mutex::new(None),
                }
            }
        }
    }

    pub async fn restart(&self, db: DB, new_port: u16) -> Result<(), String> {
        let new_handle = spawn_server(db.clone(), new_port).await?;
        if let Err(error) = db
            .settings()
            .set_setting("port", &new_port.to_string())
            .await
        {
            new_handle.abort();
            return Err(format!("Failed to save new port to DB: {error}"));
        }

        if let Some(handle) = self.handle.lock().unwrap().replace(new_handle) {
            handle.abort();
        }
        *self.port.lock().unwrap() = Some(new_port);
        Ok(())
    }
}

/// Query parameters for the /logs endpoint
#[derive(Deserialize)]
struct LogParams {
    /// Get logs occurred after this timestamp.
    /// Optional: if missing, returns all logs (or you can set a default limit).
    start: Option<i64>,
    end: Option<i64>,
    cursor: Option<String>,
    limit: Option<u64>,
}

#[derive(Serialize)]
struct LogPage {
    logs: Vec<LogPayload>,
    #[serde(rename = "nextCursor")]
    next_cursor: Option<String>,
}

#[derive(Deserialize)]
struct SessionParams {
    start: Option<i64>,
    end: Option<i64>,
    cursor: Option<String>,
    limit: Option<u64>,
}

#[derive(Serialize)]
struct SessionPage {
    #[serde(rename = "schemaVersion")]
    schema_version: u32,
    sessions: Vec<SessionPayload>,
    #[serde(rename = "nextCursor")]
    next_cursor: Option<String>,
    generation: i64,
    source: String,
}

/// Handler for GET /logs
async fn handle_get_logs(
    State(db): State<DB>,
    Query(params): Query<LogParams>,
) -> Result<Json<LogPage>, StatusCode> {
    let cursor = match params.cursor.as_deref().map(parse_cursor).transpose() {
        Ok(cursor) => cursor,
        Err(error) => {
            eprintln!("Invalid log page cursor: {error}");
            return Err(StatusCode::BAD_REQUEST);
        }
    };
    let limit = params
        .limit
        .unwrap_or(DEFAULT_LOG_PAGE_SIZE)
        .clamp(1, MAX_LOG_PAGE_SIZE);
    match db
        .logs()
        .get_logs_page(params.start, params.end, cursor, limit)
        .await
    {
        Ok((logs, next_cursor)) => Ok(Json(LogPage {
            logs,
            next_cursor: next_cursor.map(|(timestamp, id)| format!("{timestamp}:{id}")),
        })),
        Err(e) => {
            eprintln!("Failed to fetch logs from DB: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn handle_get_sessions(
    State(db): State<DB>,
    Query(params): Query<SessionParams>,
) -> Result<Json<SessionPage>, StatusCode> {
    if matches!((params.start, params.end), (Some(start), Some(end)) if start > end) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let cursor = params
        .cursor
        .as_deref()
        .map(parse_cursor)
        .transpose()
        .map_err(|error| {
            eprintln!("Invalid session page cursor: {error}");
            StatusCode::BAD_REQUEST
        })?;
    let limit = params
        .limit
        .unwrap_or(DEFAULT_LOG_PAGE_SIZE)
        .clamp(1, MAX_LOG_PAGE_SIZE);
    let (sessions, next_cursor, generation, source) = db
        .get_sessions_page(params.start, params.end, cursor, limit)
        .await
        .map_err(|error| {
            eprintln!("Failed to fetch sessions: {error}");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    Ok(Json(SessionPage {
        schema_version: SESSION_SCHEMA_VERSION,
        sessions,
        next_cursor: next_cursor.map(|(timestamp, id)| format!("{timestamp}:{id}")),
        generation,
        source,
    }))
}

fn parse_cursor(cursor: &str) -> Result<(i64, i32), String> {
    let (timestamp, id) = cursor
        .split_once(':')
        .ok_or_else(|| "cursor must contain a timestamp and row id".to_string())?;
    Ok((
        timestamp
            .parse()
            .map_err(|_| "cursor timestamp is invalid".to_string())?,
        id.parse()
            .map_err(|_| "cursor row id is invalid".to_string())?,
    ))
}

async fn configured_port(db: &DB) -> u16 {
    db.settings()
        .get_setting("port")
        .await
        .ok()
        .flatten()
        .and_then(|value| value.parse().ok())
        .filter(|port| *port != 0)
        .unwrap_or(SERVER_PORT)
}

async fn spawn_server(db: DB, port: u16) -> Result<JoinHandle<()>, String> {
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|error| format!("Failed to bind HTTP server on port {port}: {error}"))?;
    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost"
                .parse::<axum::http::HeaderValue>()
                .expect("localhost is a valid origin"),
            "http://localhost:8081"
                .parse::<axum::http::HeaderValue>()
                .expect("localhost origin is valid"),
        ])
        .allow_methods([axum::http::Method::GET]);
    let app = Router::new()
        .route("/logs", get(handle_get_logs))
        .route("/sessions", get(handle_get_sessions))
        .with_state(db)
        .layer(cors);

    println!("HTTP Server listening on http://{addr}");
    Ok(tauri::async_runtime::spawn(async move {
        if let Err(error) = axum::serve(listener, app).await {
            eprintln!("HTTP server stopped unexpectedly: {error}");
        }
    }))
}
