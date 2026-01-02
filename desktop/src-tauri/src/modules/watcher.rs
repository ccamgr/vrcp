use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::Duration;
use tauri::AppHandle;
use tauri_specta::Event;

use crate::modules::db::LogDatabase;

// ================================================================
// Section A: Data Types & Parsing Logic
// (イベント定義や正規表現など、データの「中身」に関する処理)
// ================================================================

#[derive(Clone, Serialize, Debug, Type, Event, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum VrcLogEvent {
    AppStart,
    AppStop,
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
            instance_id: caps[3].to_string(),
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

/// 1行を解析してイベントを送信する内部関数
fn process_log_line(line: &str, app: &AppHandle, db: &LogDatabase) {
    let line = line.trim();
    if line.is_empty() {
        return;
    }

    for matcher in get_compiled_matchers() {
        if let Some(caps) = matcher.regex.captures(line) {
            let event_data = (matcher.factory)(&caps);
            let timestamp = caps
                .get(1)
                .map_or("unknown", |m| m.as_str())
                .to_string()
                .replace(".", "-"); // normalize to YYYY-MM-DD HH:mm:ss

            let payload = Payload {
                event: event_data,
                timestamp,
            };
            // to frontend
            if let Err(e) = Payload::emit(&payload, app) {
                eprintln!("Failed to emit log event: {}", e);
            }

            // to DataBase
            if let Err(e) = db.insert_log(&payload) {
                eprintln!("Failed to save log to DB: {}", e);
            }
            return;
        }
    }
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

    // 初回オープン処理
    let mut reader = match &current_log_path {
        Some(path) => {
            println!("Start watching log file: {:?}", path);
            File::open(path).ok().map(|mut f| {
                // 初回は過去ログを読まないよう末尾にシーク
                let _ = f.seek(SeekFrom::End(0));
                BufReader::new(f)
            })
        }
        None => {
            println!("No VRChat log file found yet. Waiting for creation...");
            None
        }
    };

    let mut line = String::new();

    loop {
        let mut read_success = false;

        // 1. 現在のリーダーから行を読み込む
        if let Some(r) = &mut reader {
            match r.read_line(&mut line) {
                Ok(0) => { /* EOF */ }
                Ok(_) => {
                    process_log_line(&line, &app, &db);
                    line.clear();
                    read_success = true;
                }
                Err(e) => eprintln!("Error reading log: {}", e),
            }
        }

        // 読み込み成功したら即座に次へ（高速処理）
        if read_success {
            continue;
        }

        // 2. 読み込むものがなければ、待機しつつローテーションチェック
        tokio::select! {
            _ = tokio::time::sleep(Duration::from_millis(500)) => {
                // CPU負荷軽減のための短いスリープ
            }
            _ = rotation_check_interval.tick() => {
                // 最新ファイルをチェック
                let latest = get_latest_log_path();

                // パスが変わっていたら（＝新ファイル生成 or 初めて見つかった）
                if latest != current_log_path {
                    println!("Log rotation detected! Switching to: {:?}", latest);
                    current_log_path = latest.clone();

                    if let Some(path) = latest {
                        match File::open(&path) {
                            Ok(f) => {
                                // 新しいファイルは「先頭」から読む（Start Upイベントなどを逃さないため）
                                reader = Some(BufReader::new(f));
                                println!("Switched to new log file successfully.");
                            }
                            Err(e) => {
                                eprintln!("Failed to open new log file: {}", e);
                                reader = None;
                            }
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
