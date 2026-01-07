use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::{Duration, Instant}; // Instantを追加
use tauri::AppHandle;
use tauri_specta::Event;

use crate::modules::db::{LogDatabase, WatcherState}; // WatcherStateを追加

// ================================================================
// Section A: Data Types & Parsing Logic
// (イベント定義や正規表現など、データの「中身」に関する処理)
// ================================================================

#[derive(Clone, Serialize, Debug, Type, Event, Deserialize, Hash)]
#[serde(tag = "type", content = "data")]
pub enum VrcLogEvent {
    AppStart,
    AppStop,
    InvalidAppStop, // AppStopの前にログ書き込みが終了
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
pub struct Payload {
    pub event: VrcLogEvent,
    pub timestamp: String,
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
            instance_id: caps[2].to_string() + ":" + &caps[3].to_string(), // instanceId = worldId:instanceSuffix
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

fn gen_hash(timestamp: &str, event: &VrcLogEvent) -> i64 {
    let mut hasher = DefaultHasher::new();
    timestamp.hash(&mut hasher);
    event.hash(&mut hasher);
    hasher.finish() as i64 // SQLiteのINTEGERに収まるようにi64に変換
}

pub fn extract_timestamp(line: &str) -> Option<String> {
    static RE: OnceLock<Regex> = OnceLock::new();
    let re = RE.get_or_init(|| {
        // 行頭が "YYYY.MM.DD HH:mm:ss" で始まるかチェック
        Regex::new(r"^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})").unwrap()
    });

    if let Some(caps) = re.captures(line) {
        return Some(caps[1].replace(".", "-"));
    }
    None
}
/// 1行を解析してPayloadを返す
pub fn parse_log_line(line: &str) -> Option<Payload> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }

    for matcher in get_compiled_matchers() {
        if let Some(caps) = matcher.regex.captures(line) {
            let event = (matcher.factory)(&caps);
            let timestamp = caps
                .get(1)
                .map_or("unknown", |m| m.as_str())
                .to_string()
                .replace(".", "-"); // normalize

            let hash = gen_hash(&timestamp, &event);

            return Some(Payload { event, timestamp, hash });
        }
    }
    None
}

// ================================================================
// Section B: File Watcher Logic
// (ファイル探索、ループ処理、ローテーション検知など、ファイル操作に関する処理)
// ================================================================

/// VRChatのログ保存先ディレクトリを取得
fn get_vrc_log_dir() -> Option<PathBuf> {
    // Windows: %AppData%/../LocalLow/VRChat/VRChat
    dirs::data_local_dir().map(|path| {
        path.join("..")
            .join("LocalLow")
            .join("VRChat")
            .join("VRChat")
    })
}

/// 最新のログファイルパスを取得
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

/// ログ監視タスクのメインループ（非同期）
async fn watch_loop(app: AppHandle, db: LogDatabase) {
    let mut rotation_check_interval = tokio::time::interval(Duration::from_secs(5));
    let mut current_log_path = get_latest_log_path();

    let current_path_str = current_log_path
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    // メモリ上の状態初期化
    let mut last_seen_timestamp: String = "unknown".to_string();
    let mut is_app_running = false;
    let mut current_position: u64 = 0; // 現在の読み取り位置

    // 前回起動時の状態復元
    if let Ok(Some(saved_state)) = db.get_watcher_state() {
        // パスが一致する場合のみ、前回の続きから読む
        if saved_state.log_path == current_path_str && !current_path_str.is_empty() {
            println!(
                "Resuming watcher from position: {}",
                saved_state.last_position
            );

            is_app_running = saved_state.is_running;
            last_seen_timestamp = saved_state.last_timestamp;
            current_position = saved_state.last_position; // 位置を復元
        } else if !current_path_str.is_empty() {
            // パスが違う(ローテーション済み)の場合
            // 前回のセッションがRunningのままならクラッシュ判定
            if saved_state.is_running {
                println!(
                    "Startup: Previous session crashed (rotation). Inserting event at {}",
                    saved_state.last_timestamp
                );
                let event = VrcLogEvent::InvalidAppStop;
                let timestamp = saved_state.last_timestamp.clone();
                let hash = gen_hash(&timestamp, &event);

                let crash_payload = Payload {event, timestamp, hash};
                let _ = db.insert_log(&crash_payload);
            }
            // 新しいファイルなので位置は 0 からスタート
            current_position = 0;
        }
    }
    // 初回オープン処理
    let mut reader = match &current_log_path {
        Some(path) => {
            println!("Start watching log file: {:?}", path);
            File::open(path).ok().map(|mut f| {
                // ファイルサイズ取得
                let file_len = f.metadata().map(|m| m.len()).unwrap_or(0);

                // 安全策: 保存された位置がファイルサイズより大きかったら 0 に戻す (ファイルが作り直された場合など)
                if current_position > file_len {
                    println!(
                        "Saved position {} > File length {}. Resetting to 0.",
                        current_position, file_len
                    );
                    current_position = 0;
                }

                // 指定位置までシーク
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

        // 1. 現在のリーダーから行を読み込む
        if let Some(r) = &mut reader {
            // read_line は改行コード込みのバイト数を返す
            match r.read_line(&mut line) {
                Ok(0) => { /* EOF */ }
                Ok(bytes_read) => {
                    // ★読み込んだバイト数を加算
                    current_position += bytes_read as u64;

                    // タイムスタンプ更新(イベントの有無にかかわらず)
                    if let Some(ts) = extract_timestamp(&line) {
                        if ts != last_seen_timestamp {
                            last_seen_timestamp = ts;
                        }
                    }

                    // イベント解析
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
                        // 通知 & 保存 (ここは変わらず)
                        let _ = Payload::emit(&payload, &app);
                        let _ = db.insert_log(&payload);
                    }

                    line.clear();
                    read_success = true;
                }
                Err(e) => eprintln!("Error reading log: {}", e),
            }
        }

        // ▼▼▼ 状態の永続化 (位置情報を含めて保存) ▼▼▼
        if state_changed || (read_success && last_db_sync.elapsed() > Duration::from_secs(5)) {
            if let Some(path) = &current_log_path {
                let state = WatcherState {
                    log_path: path.to_string_lossy().to_string(),
                    is_running: is_app_running,
                    last_timestamp: last_seen_timestamp.clone(),
                    last_position: current_position, // ★現在の位置を保存
                };
                let _ = db.save_watcher_state(&state);
                last_db_sync = Instant::now();
            }
        }

        if read_success {
            // 読み込みが成功している間はループを回し続ける（一気に追いつく）
            continue;
        }

        // 2. 読み込むものがなければ、待機しつつローテーションチェック
        tokio::select! {
            _ = tokio::time::sleep(Duration::from_millis(500)) => {}
            _ = rotation_check_interval.tick() => {
                let latest = get_latest_log_path();

                if latest != current_log_path {
                    println!("Log rotation detected!");
                    // ... (クラッシュ検知ロジックは既存のまま) ...
                    if is_app_running {
                        let event = VrcLogEvent::InvalidAppStop;
                        let timestamp = last_seen_timestamp.clone();
                        let hash = gen_hash(&timestamp, &event);
                        let crash_payload = Payload {event, timestamp, hash};
                        let _ = db.insert_log(&crash_payload);
                        let _ = Payload::emit(&crash_payload, &app);
                    }

                    current_log_path = latest.clone();
                    is_app_running = false;
                    current_position = 0; // ★新しいファイルなので位置をリセット

                    // DB保存
                    if let Some(path) = &current_log_path {
                        let _ = db.save_watcher_state(&WatcherState {
                            log_path: path.to_string_lossy().to_string(),
                            is_running: false,
                            last_timestamp: last_seen_timestamp.clone(),
                            last_position: 0, // ★0で保存
                        });
                    }

                    // Reader再生成
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

/// 監視タスクをバックグラウンドで開始する
pub fn spawn_log_watcher(app: AppHandle, db: LogDatabase) {
    tauri::async_runtime::spawn(async move {
        watch_loop(app, db).await;
    });
}
