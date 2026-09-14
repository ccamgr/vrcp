use crate::Ctx;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct Interval {
    pub start: i64,
    pub end: i64,
}

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct PlayerInterval {
    pub name: String,
    pub intervals: Vec<Interval>,
    #[serde(rename = "totalDurationMs")]
    pub total_duration_ms: i64,
}

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct SessionPayload {
    #[serde(rename = "worldName")]
    pub world_name: String,
    #[serde(rename = "instanceId")]
    pub instance_id: String,
    #[serde(rename = "startTime")]
    pub start_time: i64,
    #[serde(rename = "endTime")]
    pub end_time: i64,
    #[serde(rename = "durationMs")]
    pub duration_ms: i64,
    pub username: Option<String>,
    pub players: Vec<PlayerInterval>,
}

#[tauri::command]
#[specta::specta]
pub async fn get_sessions(
    state: tauri::State<'_, Ctx>,
    start: Option<i64>,
    end: Option<i64>,
) -> Result<Vec<SessionPayload>, String> {
    state
        .db
        .get_sessions(start, end)
        .await
        .map_err(|error| error.to_string())
}
