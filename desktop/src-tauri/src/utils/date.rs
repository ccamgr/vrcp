// src/utils/date.rs

use chrono::{Local, NaiveDateTime, TimeZone};

/// VRChatのログ文字列 ("YYYY.MM.DD HH:mm:ss" または "YYYY-MM-DD HH:mm:ss") を i64 (ミリ秒) に変換
pub fn str_to_i64(ts: &str) -> i64 {
    let normalized = ts.replace('.', "-");
    if let Ok(ndt) = NaiveDateTime::parse_from_str(&normalized, "%Y-%m-%d %H:%M:%S") {
        // VRChatのログはローカル時間なので、Localとして解釈してUNIXミリ秒に変換
        if let chrono::LocalResult::Single(dt) = Local.from_local_datetime(&ndt) {
            return dt.timestamp_millis();
        }
    }
    0 // パース失敗時は 0 (適宜エラーハンドリングしてもOK)
}

/// i64 (UNIXミリ秒) を "YYYY-MM-DD HH:mm:ss" 形式の文字列に変換
pub fn i64_to_str(ts: i64) -> String {
    if ts == 0 {
        return "unknown".to_string();
    }
    if let chrono::LocalResult::Single(dt) = Local.timestamp_millis_opt(ts) {
        dt.format("%Y-%m-%d %H:%M:%S").to_string()
    } else {
        "unknown".to_string()
    }
}
