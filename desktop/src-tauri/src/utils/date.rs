pub fn to_timems(ts: &str) -> i64 {
    let fmt_space = "%Y-%m-%d %H:%M:%S";
    let fmt_iso = "%Y-%m-%dT%H:%M:%S";
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(ts, fmt_space) {
        return dt.and_utc().timestamp_millis();
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(ts, fmt_iso) {
        return dt.and_utc().timestamp_millis();
    }
    0
}
pub fn to_timestr(ms: i64) -> String {
    if let Some(dt) = chrono::DateTime::from_timestamp_millis(ms) {
        return dt.format("%Y-%m-%d %H:%M:%S").to_string();
    }
    "Unknown".to_string()
}
