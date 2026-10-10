use std::{
    collections::HashMap,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

const LOG_FILE_NAME: &str = "vrcp.log";
const LEGACY_ERROR_LOG_FILE_NAME: &str = "error.log";
const LEGACY_STARTUP_ERROR_LOG_FILE_NAME: &str = "startup-error.log";
const MAX_LOG_ARCHIVES: usize = 5;
const MAX_LOG_FILE_BYTES: u64 = 64 * 1024 * 1024;
const DUPLICATE_ERROR_WINDOW: Duration = Duration::from_secs(60);
const MAX_TRACKED_ERRORS: usize = 256;
const SENSITIVE_FIELD_MARKERS: [&str; 6] = [
    "password",
    "otp",
    "cookie",
    "token",
    "secret",
    "authorization",
];

struct ErrorState {
    last_logged_at: Instant,
    last_seen_at: Instant,
    suppressed_count: u64,
}

#[derive(Default)]
struct LoggerState {
    errors: HashMap<String, ErrorState>,
}

static LOGGER_STATE: LazyLock<Mutex<LoggerState>> =
    LazyLock::new(|| Mutex::new(LoggerState::default()));

#[derive(Clone, Copy)]
pub enum Level {
    Info,
    Warn,
    Error,
}

impl Level {
    fn label(self) -> &'static str {
        match self {
            Self::Info => "INFO",
            Self::Warn => "WARN",
            Self::Error => "ERROR",
        }
    }
}

pub fn initialize() {
    let Some(log_dir) = log_dir() else {
        return;
    };
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }

    migrate_legacy_error_log(&log_dir);
    rotate_current_log(&log_dir);
    migrate_legacy_startup_log(&log_dir);
    info("app.start", &[]);
}

pub fn info(action: &str, fields: &[(&str, &str)]) {
    write(Level::Info, action, fields);
}

pub fn warn(action: &str, fields: &[(&str, &str)]) {
    write(Level::Warn, action, fields);
}

pub fn error(action: &str, fields: &[(&str, &str)]) {
    write(Level::Error, action, fields);
}

pub fn api_response(method: &str, url: &str, status: u16, body: &str) {
    let Some(log_dir) = log_dir() else {
        return;
    };
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f %:z");
    let body = serde_json::from_str::<serde_json::Value>(body)
        .map(|value| value.to_string())
        .unwrap_or_else(|_| serde_json::to_string(body).unwrap_or_else(|_| "null".to_string()));
    let line = format!(
        "{timestamp} [{:<5}] action=api.response method={} url={} status={} response={body}",
        Level::Info.label(),
        format_value("method", method),
        format_value("url", url),
        status,
    );

    let _state = LOGGER_STATE
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    rotate_if_size_limit_reached(&log_dir, line.len() as u64 + 1);
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(current_log_path(&log_dir))
    {
        let _ = writeln!(file, "{line}");
    }
}

fn write(level: Level, action: &str, fields: &[(&str, &str)]) {
    let Some(log_dir) = log_dir() else {
        return;
    };
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }

    let suppressed_count = duplicate_error_count(level, action, fields);
    if suppressed_count.is_none() {
        return;
    }

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f %:z");
    let mut line = format!(
        "{timestamp} [{:<5}] action={}",
        level.label(),
        sanitize_action(action)
    );
    for (key, value) in fields {
        line.push(' ');
        line.push_str(&sanitize_key(key));
        line.push('=');
        line.push_str(&format_value(key, value));
    }
    if let Some(suppressed_count) = suppressed_count.filter(|count| *count > 0) {
        line.push_str(&format!(" suppressed={suppressed_count}"));
    }

    let _state = LOGGER_STATE
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    rotate_if_size_limit_reached(&log_dir, line.len() as u64 + 1);

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(current_log_path(&log_dir))
    {
        let _ = writeln!(file, "{line}");
    }
    drop(_state);
}

fn duplicate_error_count(level: Level, action: &str, fields: &[(&str, &str)]) -> Option<u64> {
    if !matches!(level, Level::Error) {
        return Some(0);
    }

    let now = Instant::now();
    let key = format!("{action}:{fields:?}");
    let mut state = LOGGER_STATE
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    state
        .errors
        .retain(|_, value| now.duration_since(value.last_seen_at) <= DUPLICATE_ERROR_WINDOW * 2);

    let result = match state.errors.get_mut(&key) {
        Some(error) if now.duration_since(error.last_logged_at) < DUPLICATE_ERROR_WINDOW => {
            error.last_seen_at = now;
            error.suppressed_count += 1;
            None
        }
        Some(error) => {
            error.last_logged_at = now;
            error.last_seen_at = now;
            Some(std::mem::take(&mut error.suppressed_count))
        }
        None => {
            if state.errors.len() >= MAX_TRACKED_ERRORS {
                state.errors.clear();
            }
            state.errors.insert(
                key,
                ErrorState {
                    last_logged_at: now,
                    last_seen_at: now,
                    suppressed_count: 0,
                },
            );
            Some(0)
        }
    };
    result
}

fn log_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|data_dir| data_dir.join("VRCP"))
}

fn current_log_path(log_dir: &Path) -> PathBuf {
    log_dir.join(LOG_FILE_NAME)
}

fn archive_log_path(log_dir: &Path) -> PathBuf {
    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
    let mut path = log_dir.join(format!("vrcp-{timestamp}.log"));
    let mut suffix = 1;
    while path.exists() {
        path = log_dir.join(format!("vrcp-{timestamp}-{suffix}.log"));
        suffix += 1;
    }
    path
}

fn rotate_current_log(log_dir: &Path) {
    let current_path = current_log_path(log_dir);
    if current_path.exists() {
        let _ = fs::rename(&current_path, archive_log_path(log_dir));
    }
    prune_archives(log_dir);
}

fn rotate_if_size_limit_reached(log_dir: &Path, next_line_length: u64) {
    let current_path = current_log_path(log_dir);
    let Ok(metadata) = fs::metadata(&current_path) else {
        return;
    };
    if metadata.len().saturating_add(next_line_length) > MAX_LOG_FILE_BYTES {
        rotate_current_log(log_dir);
    }
}

fn prune_archives(log_dir: &Path) {
    let Ok(entries) = fs::read_dir(log_dir) else {
        return;
    };
    let mut archives: Vec<PathBuf> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| is_archive(path))
        .collect();
    archives.sort();

    for archive in archives.into_iter().rev().skip(MAX_LOG_ARCHIVES) {
        let _ = fs::remove_file(archive);
    }
}

fn is_archive(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    let stem = name.strip_suffix(".log").unwrap_or(name);
    let timestamp = stem.strip_prefix("vrcp-").unwrap_or(stem);
    if timestamp.len() < 19 {
        return false;
    }
    chrono::NaiveDateTime::parse_from_str(&timestamp[..19], "%Y-%m-%d_%H-%M-%S").is_ok()
}

fn migrate_legacy_error_log(log_dir: &Path) {
    let legacy_path = log_dir.join(LEGACY_ERROR_LOG_FILE_NAME);
    if !legacy_path.exists() {
        return;
    }

    let current_path = current_log_path(log_dir);
    if current_path.exists() {
        if let Ok(contents) = fs::read_to_string(&legacy_path) {
            for line in contents.lines() {
                write(Level::Info, "app.legacy_error_log", &[("message", line)]);
            }
            let _ = fs::remove_file(legacy_path);
        }
    } else {
        let _ = fs::rename(legacy_path, current_path);
    }
}

fn migrate_legacy_startup_log(log_dir: &Path) {
    let legacy_path = log_dir.join(LEGACY_STARTUP_ERROR_LOG_FILE_NAME);
    let Ok(contents) = fs::read_to_string(&legacy_path) else {
        return;
    };
    for line in contents.lines() {
        write(Level::Info, "app.legacy_startup_log", &[("message", line)]);
    }
    let _ = fs::remove_file(legacy_path);
}

fn sanitize_action(action: &str) -> String {
    action
        .chars()
        .map(|character| match character {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '.' | '_' | '-' => character,
            _ => '_',
        })
        .collect()
}

fn sanitize_key(key: &str) -> String {
    key.chars()
        .map(|character| match character {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '_' => character,
            _ => '_',
        })
        .collect()
}

fn format_value(key: &str, value: &str) -> String {
    if SENSITIVE_FIELD_MARKERS
        .iter()
        .any(|marker| key.to_ascii_lowercase().contains(marker))
    {
        return "[redacted]".to_string();
    }

    if value
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || "._:/~()-".contains(character))
    {
        return value.to_string();
    }

    serde_json::to_string(value).unwrap_or_else(|_| "[unprintable]".to_string())
}
