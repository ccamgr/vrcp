use crate::Ctx;
use crate::{
    modules::watcher::{LogPayload, VrcLogEvent},
};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

// ================================================================
//  Type Definitions
// ================================================================

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

// ================================================================
//  Internal Helpers
// ================================================================

struct ActivePlayer {
    start: i64,
}

struct Me {
    user_id: String,
    name: String,
}

struct CurrentSessionState {
    world_name: String,
    instance_id: String,
    start_time: i64,
}

// ================================================================
//  Session Builder Logic (Refactored)
// ================================================================

// 状態を管理するための構造体を定義
struct SessionBuilder {
    sessions: Vec<SessionPayload>,
    me: Option<Me>,
    current_session: Option<CurrentSessionState>,
    world_name: Option<String>,
    active_players: HashMap<String, ActivePlayer>,
    player_intervals: HashMap<String, Vec<Interval>>,
    known_player_names: HashMap<String, String>,
}

impl SessionBuilder {
    fn new() -> Self {
        Self {
            sessions: Vec::new(),
            me: None,
            current_session: None,
            world_name: None,
            active_players: HashMap::new(),
            player_intervals: HashMap::new(),
            known_player_names: HashMap::new(),
        }
    }

    // 元の close_session クロージャの中身をメソッド化
    // &mut self を取ることで、全てのフィールドに安全にアクセス可能
    fn close_session(&mut self, end_time: i64) {
        if let Some(mut session_state) = self.current_session.take() {
            let mut final_end_time = end_time;

            // 1. まだ退出していないプレイヤーを強制退出扱いにする
            for (id, player) in self.active_players.drain() {
                self.player_intervals.entry(id).or_default().push(Interval {
                    start: player.start,
                    end: final_end_time,
                });
            }

            // 2. プレイヤーデータを整形
            let mut players: Vec<PlayerInterval> = Vec::new();

            for (id, intervals) in self.player_intervals.drain() {
                let name = self
                    .known_player_names
                    .get(&id)
                    .cloned()
                    .unwrap_or_else(|| "Unknown".to_string());

                let total_ms: i64 = intervals
                    .iter()
                    .map(|i| i.end - i.start)
                    .sum();

                // 自分のIDかどうか判定
                let is_me = if let Some(me_ref) = &self.me {
                    &me_ref.user_id == &id
                } else {
                    false
                };

                if is_me {
                    if let Some(first) = intervals.first() {
                        session_state.start_time = first.start;
                    }
                    if let Some(last) = intervals.last() {
                        final_end_time = last.end;
                    }
                } else {
                    players.push(PlayerInterval {
                        name,
                        intervals,
                        total_duration_ms: total_ms,
                    });
                }
            }

            // ソート
            players.sort_by(|a, b| b.total_duration_ms.cmp(&a.total_duration_ms));

            let duration_ms = final_end_time - session_state.start_time;

            self.sessions.push(SessionPayload {
                world_name: session_state.world_name,
                instance_id: session_state.instance_id,
                start_time: session_state.start_time,
                end_time: final_end_time,
                duration_ms,
                username: self.me.as_ref().map(|m| m.name.clone()),
                players,
            });
        }
    }

    // メインの処理ループ
    fn process(mut self, logs: Vec<LogPayload>, last_logged_time: i64) -> Vec<SessionPayload> {
        for log in logs {

            match log.event {
                VrcLogEvent::Login { username, user_id } => {
                    self.me = Some(Me {
                        user_id,
                        name: username,
                    });
                }
                VrcLogEvent::WorldEnter { world_name: w_name } => {
                    self.world_name = Some(w_name);
                }
                VrcLogEvent::InstanceJoin { instance_id, .. } => {
                    // 前のセッションがあれば閉じる
                    if self.current_session.is_some() {
                        self.close_session(log.timestamp);
                    }

                    // 新しいセッション開始
                    self.current_session = Some(CurrentSessionState {
                        world_name: self
                            .world_name
                            .take()
                            .unwrap_or("Unknown World".to_string()),
                        instance_id,
                        start_time: log.timestamp,
                    });
                }
                VrcLogEvent::PlayerJoin {
                    player_name,
                    user_id,
                } => {
                    if self.current_session.is_some() {
                        self.known_player_names
                            .insert(user_id.clone(), player_name.clone());
                        self.active_players
                            .insert(user_id, ActivePlayer { start: log.timestamp });
                    }
                }
                VrcLogEvent::PlayerLeft { user_id, .. } => {
                    if self.current_session.is_some() {
                        if let Some(player) = self.active_players.remove(&user_id) {
                            self.player_intervals
                                .entry(user_id)
                                .or_default()
                                .push(Interval {
                                    start: player.start,
                                    end: log.timestamp,
                                });
                        }
                    }
                }
                VrcLogEvent::AppStop | VrcLogEvent::InvalidAppStop => {
                    if self.current_session.is_some() {
                        self.close_session(log.timestamp);
                    }
                }
                _ => {}
            }
        }

        // ループ終了後の処理
        if self.current_session.is_some() {
            self.close_session(last_logged_time);
        }

        self.sessions
    }
}

// ================================================================
//  Main Logic (Entry Point)
// ================================================================

#[tauri::command]
#[specta::specta]
pub async fn get_sessions(
    state: tauri::State<'_, Ctx>,
    start: Option<i64>,
    end: Option<i64>,
) -> Result<Vec<SessionPayload>, String> {
    let builder = SessionBuilder::new();

    let logs = state.db.logs()
        .get_session_expanded_logs(start.as_ref(), end.as_ref())
        .await
        .map_err(|e| e.to_string())?;

    // WatcherState から「最後に書き込まれたログの時間」を取得
    let last_logged_time = state.watcher.last_seen_timestamp();

    Ok(builder.process(logs, last_logged_time))
}
