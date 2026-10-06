use crate::db::repositories::settings::WatcherState;
use crate::db::DB;
use crate::utils::date::{i64_to_str, str_to_i64};
use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::hash_map::DefaultHasher;
use std::fs::{self, File};
use std::hash::{Hash, Hasher};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::OnceLock;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use tauri::async_runtime::JoinHandle;
use tauri::AppHandle;
use tauri_specta::Event;

#[derive(Clone, Debug)]
pub struct WatcherStatus {
    pub is_app_running: bool,
    pub last_seen_timestamp: i64,
}

pub struct WatcherService {
    pub handle: JoinHandle<()>,
    pub status: Arc<RwLock<WatcherStatus>>,
}
impl WatcherService {
    pub fn is_app_running(&self) -> bool {
        self.status
            .read()
            .map(|s| s.is_app_running)
            .unwrap_or(false)
    }

    pub fn last_seen_timestamp(&self) -> i64 {
        self.status
            .read()
            .map(|s| s.last_seen_timestamp)
            .unwrap_or(0)
    }
}

// ================================================================
// Section A: Data Types & Parsing Logic
// ================================================================

#[derive(Clone, Serialize, Debug, Type, Event, Deserialize, Hash)]
#[serde(tag = "type", content = "data")]
pub enum VrcLogEvent {
    AppStart,
    AppStop,
    InvalidAppStop,
    Login {
        username: String,
        user_id: String,
    },
    WorldEnter {
        world_name: String,
    },
    InstanceJoin {
        world_id: String,
        instance_id: String,
    },
    PlayerJoin {
        player_name: String,
        user_id: String,
    },
    PlayerLeft {
        player_name: String,
        user_id: String,
    },
    SelfLeft,
}

#[derive(Clone, Serialize, Deserialize, Type, Event)]
pub struct LogPayload {
    pub event: VrcLogEvent,
    pub timestamp: i64,
    pub hash: i64,
}

struct LogDefinition {
    pattern_part: &'static str,
    factory: fn(&Captures) -> VrcLogEvent,
}

const LOG_DEFINITIONS: &[LogDefinition] = &[
    LogDefinition {
        pattern_part: r"VRCNP: Server started",
        factory: |_| VrcLogEvent::AppStart,
    },
    LogDefinition {
        pattern_part: r"VRCNP: Stopping server",
        factory: |_| VrcLogEvent::AppStop,
    },
    LogDefinition {
        pattern_part: r"User Authenticated: (.+) \((usr_[\w-]+)\)",
        factory: |caps| VrcLogEvent::Login {
            username: caps[2].to_string(),
            user_id: caps[3].to_string(),
        },
    },
    LogDefinition {
        pattern_part: r"\[Behaviour\] Entering Room: (.+)",
        factory: |caps| VrcLogEvent::WorldEnter {
            world_name: caps[2].to_string(),
        },
    },
    LogDefinition {
        pattern_part: r"\[Behaviour\] Joining (wrld_[\w-]+):(.+)",
        factory: |caps| VrcLogEvent::InstanceJoin {
            world_id: caps[2].to_string(),
            instance_id: caps[2].to_string() + ":" + &caps[3],
        },
    },
    LogDefinition {
        pattern_part: r"\[Behaviour\] OnPlayerJoined (.+) \((usr_[\w-]+)\)",
        factory: |caps| VrcLogEvent::PlayerJoin {
            player_name: caps[2].to_string(),
            user_id: caps[3].to_string(),
        },
    },
    LogDefinition {
        pattern_part: r"\[Behaviour\] OnPlayerLeft (.+) \((usr_[\w-]+)\)",
        factory: |caps| VrcLogEvent::PlayerLeft {
            player_name: caps[2].to_string(),
            user_id: caps[3].to_string(),
        },
    },
    LogDefinition {
        pattern_part: r"\[Behaviour\] OnLeftRoom",
        factory: |_| VrcLogEvent::SelfLeft,
    },
];

struct CompiledMatcher {
    regex: Regex,
    factory: fn(&Captures) -> VrcLogEvent,
}

fn get_compiled_matchers() -> &'static Vec<CompiledMatcher> {
    static CACHE: OnceLock<Vec<CompiledMatcher>> = OnceLock::new();
    CACHE.get_or_init(|| {
        let ts_prefix = r"^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}).*";
        LOG_DEFINITIONS
            .iter()
            .map(|def| {
                let full_pattern = format!("{}{}", ts_prefix, def.pattern_part);
                CompiledMatcher {
                    regex: Regex::new(&full_pattern).expect("Regex compile failed"),
                    factory: def.factory,
                }
            })
            .collect()
    })
}

fn gen_hash(timestamp: i64, event: &VrcLogEvent) -> i64 {
    let mut hasher = DefaultHasher::new();
    timestamp.hash(&mut hasher);
    event.hash(&mut hasher);
    hasher.finish() as i64
}

pub fn extract_timestamp(line: &str) -> Option<i64> {
    static RE: OnceLock<Regex> = OnceLock::new();
    let re = RE.get_or_init(|| Regex::new(r"^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})").unwrap());

    if let Some(caps) = re.captures(line) {
        return Some(str_to_i64(&caps[1]));
    }
    None
}

/// Parses one VRChat log line into a payload.
pub fn parse_log_line(line: &str) -> Option<LogPayload> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }

    for matcher in get_compiled_matchers() {
        if let Some(caps) = matcher.regex.captures(line) {
            let event = (matcher.factory)(&caps);

            let ts_str = caps.get(1).map_or("unknown", |m| m.as_str());
            let timestamp = str_to_i64(ts_str);
            if timestamp == 0 {
                return None;
            }

            let hash = gen_hash(timestamp, &event);

            return Some(LogPayload {
                event,
                timestamp,
                hash,
            });
        }
    }
    None
}

// ================================================================
// Section B: File Watcher Logic
// ================================================================

fn get_vrc_log_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|path| {
        path.join("..")
            .join("LocalLow")
            .join("VRChat")
            .join("VRChat")
    })
}

fn get_latest_log_path() -> Option<PathBuf> {
    let log_dir = get_vrc_log_dir()?;
    let entries = fs::read_dir(log_dir).ok()?;

    let mut logs: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                name.starts_with("output_log") && name.ends_with(".txt")
            } else {
                false
            }
        })
        .collect();

    logs.sort_by_key(|path| path.metadata().and_then(|m| m.created()).ok());
    logs.last().cloned()
}

async fn watch_loop(app: AppHandle, db: DB, shared_status: Arc<RwLock<WatcherStatus>>) {
    let mut rotation_check_interval = tokio::time::interval(Duration::from_secs(5));
    let mut current_log_path = get_latest_log_path();

    let current_path_str = current_log_path
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let mut last_seen_timestamp: i64 = 0;
    let mut is_app_running = false;
    let mut current_position: u64 = 0;

    if let Ok(Some(saved_state)) = db.settings().get_watcher_state().await {
        if saved_state.log_path == current_path_str && !current_path_str.is_empty() {
            crate::logging::info("watcher.resume", &[("status", "success")]);
            current_position = saved_state.last_position;
            is_app_running = saved_state.is_running;
            last_seen_timestamp = str_to_i64(&saved_state.last_timestamp);
        } else if !saved_state.log_path.is_empty() {
            crate::logging::info("watcher.rescan", &[("status", "started")]);

            let old_path = PathBuf::from(&saved_state.log_path);
            if old_path.exists() {
                if let Ok(file) = File::open(&old_path) {
                    let reader = BufReader::new(file);

                    for l in reader.lines().map_while(Result::ok) {
                        if let Some(payload) = parse_log_line(&l) {
                            if let Err(error) = db.record_log(&payload).await {
                                crate::logging::error(
                                    "watcher.record_rescan",
                                    &[("error", &error.to_string())],
                                );
                            }
                        }
                    }
                }
            } else {
                crate::logging::warn("watcher.rescan", &[("status", "source_missing")]);
            }

            crate::logging::info("watcher.rotate", &[("status", "switched")]);
            current_position = 0;
            is_app_running = false;
            last_seen_timestamp = 0;
        }
    }

    let mut reader = match &current_log_path {
        Some(path) => {
            crate::logging::info("watcher.start", &[("status", "watching")]);
            File::open(path).ok().map(|mut f| {
                let file_len = f.metadata().map(|m| m.len()).unwrap_or(0);
                if current_position > file_len {
                    crate::logging::warn("watcher.seek", &[("status", "reset")]);
                    current_position = 0;
                }
                if let Err(e) = f.seek(SeekFrom::Start(current_position)) {
                    crate::logging::warn("watcher.seek", &[("error", &e.to_string())]);
                    let _ = f.seek(SeekFrom::Start(0));
                    current_position = 0;
                }
                BufReader::new(f)
            })
        }
        None => {
            crate::logging::info("watcher.start", &[("status", "waiting_for_log")]);
            None
        }
    };

    let mut line = String::new();
    let mut last_db_sync = Instant::now();
    let mut last_session_activity_timestamp = last_seen_timestamp;

    loop {
        let mut read_success = false;
        let mut state_changed = false;

        if let Some(r) = &mut reader {
            match r.read_line(&mut line) {
                Ok(0) => { /* EOF */ }
                Ok(bytes_read) => {
                    current_position += bytes_read as u64;

                    let timestamp = extract_timestamp(&line);
                    let records_activity = if let Some(payload) = parse_log_line(&line) {
                        let records_activity = matches!(&payload.event, VrcLogEvent::SelfLeft);
                        match payload.event {
                            VrcLogEvent::AppStart => {
                                is_app_running = true;
                                state_changed = true;
                            }
                            VrcLogEvent::AppStop => {
                                is_app_running = false;
                                state_changed = true;
                            }
                            _ => {}
                        }
                        match db.record_log(&payload).await {
                            Ok(true) => {
                                if let Err(error) = LogPayload::emit(&payload, &app) {
                                    crate::logging::error(
                                        "watcher.emit",
                                        &[("error", &error.to_string())],
                                    );
                                }
                            }
                            Ok(false) => {}
                            Err(error) => {
                                crate::logging::error(
                                    "watcher.record",
                                    &[("error", &error.to_string())],
                                );
                            }
                        }
                        records_activity
                    } else {
                        true
                    };

                    if records_activity {
                        if let Some(timestamp) = timestamp
                            .filter(|timestamp| *timestamp > last_session_activity_timestamp)
                        {
                            if let Err(error) = db.touch_active_session(timestamp).await {
                                crate::logging::error(
                                    "watcher.session_activity",
                                    &[("error", &error.to_string())],
                                );
                            } else {
                                last_session_activity_timestamp = timestamp;
                            }
                        }
                    }

                    if let Some(timestamp) = timestamp {
                        if timestamp != last_seen_timestamp {
                            last_seen_timestamp = timestamp;
                        }
                    }

                    if let Ok(mut status) = shared_status.write() {
                        status.is_app_running = is_app_running;
                        status.last_seen_timestamp = last_seen_timestamp;
                    }
                    line.clear();
                    read_success = true;
                }
                Err(e) => {
                    crate::logging::error("watcher.read", &[("error", &e.to_string())]);
                }
            }
        }

        if state_changed || (read_success && last_db_sync.elapsed() > Duration::from_secs(5)) {
            if let Some(path) = &current_log_path {
                let state = WatcherState {
                    log_path: path.to_string_lossy().to_string(),
                    is_running: is_app_running,
                    last_timestamp: i64_to_str(last_seen_timestamp),
                    last_position: current_position,
                };
                if let Err(error) = db.settings().save_watcher_state(&state).await {
                    crate::logging::error("watcher.save_state", &[("error", &error.to_string())]);
                }
                last_db_sync = Instant::now();
            }
        }

        if read_success {
            continue;
        }

        tokio::select! {
            _ = tokio::time::sleep(Duration::from_millis(500)) => {}
            _ = rotation_check_interval.tick() => {
                let latest = get_latest_log_path();

                if latest != current_log_path {
                    crate::logging::info("watcher.rotate", &[("status", "detected")]);

                    current_log_path = latest.clone();
                    is_app_running = false;
                    current_position = 0;

                    if let Ok(mut status) = shared_status.write() {
                        status.is_app_running = is_app_running;
                        status.last_seen_timestamp = last_seen_timestamp;
                    }

                    if let Some(path) = &current_log_path {
                        if let Err(error) = db.settings().save_watcher_state(&WatcherState {
                            log_path: path.to_string_lossy().to_string(),
                            is_running: false,
                            last_timestamp: i64_to_str(last_seen_timestamp),
                            last_position: 0,
                        }).await {
                            crate::logging::error("watcher.save_state", &[("error", &error.to_string())]);
                        }
                    }

                    if let Some(path) = latest {
                        match File::open(&path) {
                            Ok(f) => {
                                reader = Some(BufReader::new(f));
                            }
                            Err(_) => reader = None,
                        }
                    }
                }
            }
        }
    }
}

// ================================================================
// Public Entry Point
// ================================================================

pub fn spawn_log_watcher(app: AppHandle, db: DB) -> WatcherService {
    let shared_status = Arc::new(RwLock::new(WatcherStatus {
        is_app_running: false,
        last_seen_timestamp: 0,
    }));

    WatcherService {
        handle: tauri::async_runtime::spawn(watch_loop(app, db, Arc::clone(&shared_status))),
        status: shared_status,
    }
}
