use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::time::SystemTime;
use serde::{Serialize, Deserialize};
use regex::Regex;
use specta::Type;
use tauri_specta::Event;
use chrono::NaiveDateTime;

// ▼▼▼ 1. データ構造 ▼▼▼

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Type)]
pub struct LogEntry {
    pub timestamp: String, // "2025.12.13 15:30:00"
    pub log_type: String,  // "Log", "Warning", "Error"
    pub content: String,   // "[Player] John Doe Joined"
}

impl LogEntry {
    /// ログの日時文字列を Unix Timestamp (ミリ秒) に変換するヘルパー
    pub fn get_timestamp_millis(&self) -> Option<i64> {
        // VRChatの形式: "2025.12.13 15:30:00"
        let fmt = "%Y.%m.%d %H:%M:%S";
        NaiveDateTime::parse_from_str(&self.timestamp, fmt)
            .ok()
            .map(|dt| dt.and_utc().timestamp_millis())
    }
}

// フロントエンドへの通知用イベント定義
#[derive(Debug, Clone, Serialize, Type, Event)]
#[tauri_specta(name = "log-update")]
pub struct LogUpdateEvent(pub Vec<LogEntry>);

// ▼▼▼ 2. ログ監視・管理クラス ▼▼▼

pub struct LogManager {
    parser: Regex,
    current_file_path: Option<PathBuf>,
    last_position: u64,
}

impl LogManager {
    pub fn new() -> Self {
        // 正規表現: "YYYY.MM.DD HH:MM:SS Type - Content"
        let re = Regex::new(r"^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}) ([^ ]+)\s+-\s+(.*)$").unwrap();
        
        Self {
            parser: re,
            current_file_path: None,
            last_position: 0,
        }
    }

    /// 指定した時刻 (Unix millis) 以降のログを、全ての過去ログファイルから検索して取得
    pub fn get_logs_since(&self, since_timestamp: i64) -> Vec<LogEntry> {
        let log_dir = get_default_vrchat_dir().unwrap_or_default();
        if !log_dir.exists() {
            return vec![];
        }

        let mut all_logs = Vec::new();
        
        // 1. すべてのログファイルを列挙
        if let Ok(entries) = fs::read_dir(log_dir) {
            let mut files: Vec<(PathBuf, SystemTime)> = entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    name.starts_with("output_log_") && name.ends_with(".txt")
                })
                .filter_map(|e| {
                    let meta = e.metadata().ok()?;
                    Some((e.path(), meta.modified().unwrap_or(SystemTime::UNIX_EPOCH)))
                })
                .collect();

            // 2. 更新日時が古い順にソート
            files.sort_by_key(|(_, time)| *time);

            // 3. 各ファイルをチェック
            for (path, modified) in files {
                // ファイルの最終更新が指定時刻より古ければ、中身を見るまでもなくスキップ
                // (少しマージンを持たせて判定しても良い)
                let modified_millis = modified.duration_since(SystemTime::UNIX_EPOCH)
                    .unwrap_or_default().as_millis() as i64;
                
                if modified_millis < since_timestamp {
                    continue; 
                }

                // ファイルを読んで解析
                if let Ok(logs) = self.parse_entire_file(&path) {
                    for log in logs {
                        // ログ個別の行時間をチェック
                        if let Some(ts) = log.get_timestamp_millis() {
                            if ts > since_timestamp {
                                all_logs.push(log);
                            }
                        }
                    }
                }
            }
        }
        all_logs
    }

    /// 監視ループ用: 最新のログファイルだけをチェックして差分を返す
    pub fn check_recent_updates(&mut self) -> Vec<LogEntry> {
        let log_dir = get_default_vrchat_dir().unwrap_or_default();
        let latest_path = find_latest_log(&log_dir);

        match latest_path {
            Some(path) => {
                // ファイルが変わった場合（VRChat再起動時など）
                if self.current_file_path.as_ref() != Some(&path) {
                    self.current_file_path = Some(path.clone());
                    self.last_position = 0; // 最初から読む
                }

                self.read_diff(&path).unwrap_or_default()
            }
            None => vec![],
        }
    }

    // --- 内部ヘルパー ---

    /// ファイル全体を読んでパースする（Sync用）
    fn parse_entire_file(&self, path: &PathBuf) -> Result<Vec<LogEntry>, std::io::Error> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut entries = Vec::new();

        for line in reader.lines() {
            if let Ok(l) = line {
                if let Some(entry) = self.parse_line(&l) {
                    entries.push(entry);
                }
            }
        }
        Ok(entries)
    }

    /// ファイルの前回読んだ位置から続きを読む（Watch用）
    fn read_diff(&mut self, path: &PathBuf) -> Result<Vec<LogEntry>, std::io::Error> {
        let mut file = File::open(path)?;
        let current_len = file.metadata()?.len();

        // ファイルサイズが縮んでいたらリセット (ログローテート等の異常系)
        if current_len < self.last_position {
            self.last_position = 0;
        }

        // 変化なし
        if current_len == self.last_position {
            return Ok(vec![]);
        }

        // シークして続きから読む
        file.seek(SeekFrom::Start(self.last_position))?;
        let reader = BufReader::new(file);

        let mut entries = Vec::new();
        // let mut bytes_read = 0;

        for line in reader.lines() {
            let line_str = line?;
            // Windowsの改行(CRLF)などは line? で処理されるが、
            // バイト数を計算するために +1 (LF) や +2 (CRLF) の考慮が必要
            // 簡易的に文字列長 + 1 (LF想定) とするが、厳密には metadata 再取得が確実
            // ここでは簡易実装として current_len を最後に代入する方式をとる
            if let Some(entry) = self.parse_line(&line_str) {
                entries.push(entry);
            }
        }

        // 読み終わった位置を更新
        self.last_position = current_len;
        Ok(entries)
    }

    fn parse_line(&self, line: &str) -> Option<LogEntry> {
        if let Some(caps) = self.parser.captures(line) {
            return Some(LogEntry {
                timestamp: caps[1].to_string(),
                log_type: caps[2].to_string(),
                content: caps[3].to_string(),
            });
        }
        None
    }
}

// ▼▼▼ パス解決系 (変更なし) ▼▼▼

pub fn get_default_vrchat_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        dirs::home_dir().map(|path| {
            path.join("AppData")
                .join("LocalLow") // ← ここが重要！
                .join("VRChat")
                .join("VRChat")
        })
    }
    // Mac/Linux 共通
    #[cfg(not(target_os = "windows"))]
    {
        dirs::data_local_dir().map(|path| path.join("VRChat/VRChat"))
    }
}

pub fn find_latest_log(dir: &PathBuf) -> Option<PathBuf> {
    let entries = fs::read_dir(dir).ok()?;
    let mut log_files: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                name.starts_with("output_log_") && name.ends_with(".txt")
            } else {
                false
            }
        })
        .collect();

    // 最終更新日時でソート
    log_files.sort_by_key(|path| {
        path.metadata()
            .and_then(|m| m.modified())
            .unwrap_or(SystemTime::UNIX_EPOCH)
    });

    log_files.pop() // 一番新しいものを返す
}

// ▼▼▼ テストコード ▼▼▼
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_and_timestamp() {
        let entry = LogEntry {
            timestamp: "2025.12.20 12:00:00".to_string(),
            log_type: "Log".to_string(),
            content: "Test".to_string(),
        };
        // 変換できるか
        assert!(entry.get_timestamp_millis().is_some());
    }
}