use crate::db::repositories::settings::WatcherState;
use crate::db::DB;
use crate::utils::date::{i64_to_str, str_to_i64}; // 💡 日付ユーティリティを追加
use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::hash_map::DefaultHasher;
use std::fs::{self, File};
use std::hash::{Hash, Hasher};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tauri::async_runtime::JoinHandle;
use tauri::AppHandle;
use tauri_specta::Event;
use std::sync::{Arc, RwLock};

#[derive(Clone, Debug)]
pub struct WatcherStatus {
    pub is_app_running: bool,
    pub last_seen_timestamp: i64, // 💡 String -> i64
}

pub struct WatcherService {
    pub handle: JoinHandle<()>,
    pub status: Arc<RwLock<WatcherStatus>>,
}
impl WatcherService {
    pub fn is_app_running(&self) -> bool {
        self.status.read().map(|s| s.is_app_running).unwrap_or(false)
    }

    pub fn last_seen_timestamp(&self) -> i64 { // 💡 String -> i64
        self.status.read().map(|s| s.last_seen_timestamp).unwrap_or(0)
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
    pub timestamp: i64, // 💡 String -> i64
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
            instance_id: caps[2].to_string() + ":" + &caps[3].to_string(),
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

// 💡 引数を i64 に変更
fn gen_hash(timestamp: i64, event: &VrcLogEvent) -> i64 {
    let mut hasher = DefaultHasher::new();
    timestamp.hash(&mut hasher);
    event.hash(&mut hasher);
    hasher.finish() as i64
}

// 💡 戻り値を Option<i64> に変更
pub fn extract_timestamp(line: &str) -> Option<i64> {
    static RE: OnceLock<Regex> = OnceLock::new();
    let re = RE.get_or_init(|| {
        Regex::new(r"^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})").unwrap()
    });

    if let Some(caps) = re.captures(line) {
        return Some(str_to_i64(&caps[1])); // 💡 即時 i64 化
    }
    None
}

/// 1行を解析してPayloadを返す
pub fn parse_log_line(line: &str) -> Option<LogPayload> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }

    for matcher in get_compiled_matchers() {
        if let Some(caps) = matcher.regex.captures(line) {
            let event = (matcher.factory)(&caps);

            // 💡 文字列として抽出してから即座に i64 に変換
            let ts_str = caps.get(1).map_or("unknown", |m| m.as_str());
            let timestamp = str_to_i64(ts_str);

            let hash = gen_hash(timestamp, &event); // 💡 参照渡し(&)を解除

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

    logs.sort_by_key(|path| path.metadata().and_then(|m| m.modified()).ok());
    logs.last().cloned()
}

// 💡 引数を i64 に変更
pub fn create_invalid_app_stop_payload(last_timestamp: i64) -> LogPayload {
    let event = VrcLogEvent::InvalidAppStop;
    let hash = gen_hash(last_timestamp, &event);
    LogPayload {
        event,
        timestamp: last_timestamp,
        hash,
    }
}

async fn watch_loop(app: AppHandle, db: DB, shared_status: Arc<RwLock<WatcherStatus>>) {
    let mut rotation_check_interval = tokio::time::interval(Duration::from_secs(5));
    let mut current_log_path = get_latest_log_path();

    let current_path_str = current_log_path
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    // 💡 i64 で初期化
    let mut last_seen_timestamp: i64 = 0;
    let mut is_app_running = false;
    let mut current_position: u64 = 0;

    if let Ok(Some(saved_state)) = db.settings().get_watcher_state().await {
        if saved_state.log_path == current_path_str && !current_path_str.is_empty() {
            println!("Resuming watcher from position: {}", saved_state.last_position);
            current_position = saved_state.last_position;
            is_app_running = saved_state.is_running;
            last_seen_timestamp = str_to_i64(&saved_state.last_timestamp); // 💡 DBのStringをi64に戻す
        } else if !saved_state.log_path.is_empty() {
            println!("Rotation detected. Re-scanning old log fully: {}", saved_state.log_path);

            let old_path = PathBuf::from(&saved_state.log_path);
            if old_path.exists() {
                if let Ok(file) = File::open(&old_path) {
                    let reader = BufReader::new(file);

                    let mut temp_is_running = false;
                    let mut temp_last_ts: i64 = 0; // 💡 i64

                    for line in reader.lines() {
                        if let Ok(l) = line {
                            if let Some(ts) = extract_timestamp(&l) {
                                temp_last_ts = ts;
                            }

                            if let Some(payload) = parse_log_line(&l) {
                                match payload.event {
                                    VrcLogEvent::AppStart => temp_is_running = true,
                                    VrcLogEvent::AppStop => temp_is_running = false,
                                    _ => {}
                                }
                                let _ = db.logs().insert_log(&payload).await;
                            }
                        }
                    }

                    if temp_is_running {
                        println!("Crash detected in old log. Inserting InvalidAppStop at {}", i64_to_str(temp_last_ts));
                        let crash_payload = create_invalid_app_stop_payload(temp_last_ts);
                        let _ = db.logs().insert_log(&crash_payload).await;
                    }
                }
            } else {
                println!("Old log file not found. Skipping.");
            }

            println!("Switching to new log file: {:?}", current_log_path);
            current_position = 0;
            is_app_running = false;
            last_seen_timestamp = 0; // 💡 0にリセット
        }
    }

    let mut reader = match &current_log_path {
        Some(path) => {
            println!("Start watching log file: {:?}", path);
            File::open(path).ok().map(|mut f| {
                let file_len = f.metadata().map(|m| m.len()).unwrap_or(0);
                if current_position > file_len {
                    println!("Saved position {} > File length {}. Resetting to 0.", current_position, file_len);
                    current_position = 0;
                }
                if let Err(e) = f.seek(SeekFrom::Start(current_position)) {
                    eprintln!("Seek failed: {}, resetting to 0", e);
                    let _ = f.seek(SeekFrom::Start(0));
                    current_position = 0;
                }
                BufReader::new(f)
            })
        }
        None => {
            println!("No VRChat log file found yet.");
            None
        }
    };

    let mut line = String::new();
    let mut last_db_sync = Instant::now();

    loop {
        let mut read_success = false;
        let mut state_changed = false;

        if let Some(r) = &mut reader {
            match r.read_line(&mut line) {
                Ok(0) => { /* EOF */ }
                Ok(bytes_read) => {
                    current_position += bytes_read as u64;

                    if let Some(ts) = extract_timestamp(&line) {
                        if ts != last_seen_timestamp {
                            last_seen_timestamp = ts;
                        }
                    }

                    if let Some(payload) = parse_log_line(&line) {
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
                        let _ = LogPayload::emit(&payload, &app);
                        let _ = db.logs().insert_log(&payload).await;
                    }

                    if let Ok(mut status) = shared_status.write() {
                        status.is_app_running = is_app_running;
                        status.last_seen_timestamp = last_seen_timestamp; // 💡 clone不要
                    }
                    line.clear();
                    read_success = true;
                }
                Err(e) => eprintln!("Error reading log: {}", e),
            }
        }

        if state_changed || (read_success && last_db_sync.elapsed() > Duration::from_secs(5)) {
            if let Some(path) = &current_log_path {
                let state = WatcherState {
                    log_path: path.to_string_lossy().to_string(),
                    is_running: is_app_running,
                    last_timestamp: i64_to_str(last_seen_timestamp), // 💡 DB保存用に文字列化
                    last_position: current_position,
                };
                let _ = db.settings().save_watcher_state(&state).await;
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
                    println!("Log rotation detected!");
                    if is_app_running {
                        let crash_payload = create_invalid_app_stop_payload(last_seen_timestamp);
                        let _ = db.logs().insert_log(&crash_payload).await;
                        let _ = LogPayload::emit(&crash_payload, &app);
                    }

                    current_log_path = latest.clone();
                    is_app_running = false;
                    current_position = 0;

                    if let Ok(mut status) = shared_status.write() {
                        status.is_app_running = is_app_running;
                        status.last_seen_timestamp = last_seen_timestamp; // 💡 clone不要
                    }

                    if let Some(path) = &current_log_path {
                        let _ = db.settings().save_watcher_state(&WatcherState {
                            log_path: path.to_string_lossy().to_string(),
                            is_running: false,
                            last_timestamp: i64_to_str(last_seen_timestamp), // 💡 DB保存用に文字列化
                            last_position: 0,
                        }).await;
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
        last_seen_timestamp: 0, // 💡 0で初期化
    }));

    WatcherService {
        handle: tauri::async_runtime::spawn(
            watch_loop(app, db, Arc::clone(&shared_status))
        ),
        status: shared_status
    }
}
