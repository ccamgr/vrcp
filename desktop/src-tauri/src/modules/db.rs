use super::watcher::{Payload, VrcLogEvent};
use rusqlite::{params, Connection};
use std::fs;
use std::io;
use std::sync::{Arc, Mutex};

// エラーハンドリング用
type DbResult<T> = Result<T, Box<dyn std::error::Error>>;

pub struct WatcherState {
    pub log_path: String,
    pub is_running: bool,
    pub last_timestamp: String,
    pub last_position: u64,
}

#[derive(Clone)]
pub struct LogDatabase {
    conn: Arc<Mutex<Connection>>,
}

impl LogDatabase {
    /// データベースを初期化する
    pub fn new(app_dir: std::path::PathBuf) -> DbResult<Self> {
        // 3. ディレクトリが存在しなければ作成
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir)?;
            println!("Created app data directory: {:?}", app_dir);
        }

        // 4. vrcp.db のパス
        let db_path = app_dir.join("vrcp.db");
        println!("Database path: {:?}", db_path);

        // 5. 接続とテーブル作成
        let conn = Connection::open(db_path)?;

        // log保存用table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                data TEXT NOT NULL
            )",
            [],
        )?;
        // setting用table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        Ok(LogDatabase {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    //** Settings */
    /// 設定値取得 generic
    pub fn get_setting(&self, key: &str) -> DbResult<String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let value: String = stmt.query_row(params![key], |row| row.get(0))?;
        Ok(value)
    }
    /// 設定値保存 generic
    pub fn set_setting(&self, key: &str, value: &str) -> DbResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    //** Watcher States */
    // 頻繁に呼ばれるため、一括で実装
    pub fn save_watcher_state(&self, state: &WatcherState) -> DbResult<()> {
        let conn = self.conn.lock().unwrap();

        // last_position を保存するように追加
        conn.execute_batch(&format!(
            "INSERT OR REPLACE INTO settings (key, value) VALUES
            ('watcher_log_path', '{}'),
            ('watcher_is_running', '{}'),
            ('watcher_last_timestamp', '{}'),
            ('watcher_last_position', '{}');",
            state.log_path.replace("'", "''"),
            if state.is_running { "1" } else { "0" },
            state.last_timestamp,
            state.last_position
        ))?;
        Ok(())
    }

    pub fn get_watcher_state(&self) -> DbResult<Option<WatcherState>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT key, value FROM settings WHERE key LIKE 'watcher_%'")?;

        let rows = stmt.query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            Ok((key, value))
        })?;

        let mut path = None;
        let mut is_running = false;
        let mut timestamp = None;
        let mut position = 0; // ★追加 (デフォルト0)

        for row in rows {
            let (k, v) = row?;
            match k.as_str() {
                "watcher_log_path" => path = Some(v),
                "watcher_is_running" => is_running = v == "1",
                "watcher_last_timestamp" => timestamp = Some(v),
                "watcher_last_position" => {
                    // ★追加
                    if let Ok(p) = v.parse::<u64>() {
                        position = p;
                    }
                }
                _ => {}
            }
        }

        if let (Some(p), Some(ts)) = (path, timestamp) {
            Ok(Some(WatcherState {
                log_path: p,
                is_running,
                last_timestamp: ts,
                last_position: position, // ★追加
            }))
        } else {
            Ok(None)
        }
    }
    //** Logs */
    /// ログを1件保存する
    pub fn insert_log(&self, payload: &Payload) -> DbResult<()> {
        let conn = self.conn.lock().unwrap();

        // JSON変換
        let data_json = serde_json::to_string(&payload.event)?;

        // イベントタイプ名を取得 (簡易実装)
        let event_type = format!("{:?}", payload.event)
            .split_whitespace()
            .next()
            .unwrap_or("Unknown")
            .to_string()
            .replace(" {", "")
            .replace("}", "");

        conn.execute(
            "INSERT INTO logs (timestamp, event_type, data) VALUES (?1, ?2, ?3)",
            params![payload.timestamp, event_type, data_json],
        )?;

        Ok(())
    }

    /// Retrieve logs newer than the specified timestamp.
    /// timestamp format: "YYYY-MM-DD HH:mm:ss" (converted from VRChat log format "YYYY.MM.DD HH:mm:ss")
    ///
    pub fn get_logs(
        &self,
        start_timestamp: Option<&str>,
        end_timestamp: Option<&str>,
    ) -> DbResult<Vec<Payload>> {
        let conn = self.conn.lock().unwrap();

        // Prepare the SQL query
        // String comparison works for ISO-like dates (YYYY.MM.DD...)
        let mut stmt = conn.prepare(
            "SELECT timestamp, data FROM logs
             WHERE timestamp > ?1 AND timestamp <= ?2
             ORDER BY timestamp ASC, id ASC",
        )?;
        let start = start_timestamp.unwrap_or("1970-01-01 00:00:00");
        let end = end_timestamp.unwrap_or("9999-12-31 23:59:59");
        // Map the rows to Payload objects
        let log_iter = stmt.query_map(params![start, end], |row| {
            let timestamp: String = row.get(0)?;
            let data_json: String = row.get(1)?;

            // Deserialize JSON string back to VrcLogEvent Enum
            // Note: Since we are inside a closure returning rusqlite::Result,
            // we map serde errors to a custom error or panic (here we treat as error)
            let event: VrcLogEvent = serde_json::from_str(&data_json)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

            Ok(Payload { event, timestamp })
        })?;

        // Collect results into a Vec
        let mut logs = Vec::new();
        for log in log_iter {
            logs.push(log?);
        }

        Ok(logs)
    }

    /// ログを全て削除し、DBのファイルサイズを最小化(VACUUM)する
    pub fn delete_all_logs(&self) -> DbResult<()> {
        let conn = self.conn.lock().unwrap();
        // 1. 全削除
        conn.execute("DELETE FROM logs", [])?;
        // 2. 空き領域の解放 (ファイルサイズを小さくする)
        conn.execute("VACUUM", [])?;
        Ok(())
    }
}

// commands

#[tauri::command]
#[specta::specta]
pub fn get_logs(
    db: tauri::State<'_, LogDatabase>,
    start: Option<String>,
    end: Option<String>,
) -> Result<Vec<Payload>, String> {
    // db.get_logs の frontからの呼び出し
    db.get_logs(start.as_deref(), end.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_all_logs(db: tauri::State<'_, LogDatabase>) -> Result<(), String> {
    db.delete_all_logs().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn export_logs(db: tauri::State<'_, LogDatabase>, file_path: String) -> Result<usize, String> {
    // 1. 全ログを取得 (since=None, until=None で全期間)
    let logs = db.get_logs(None, None).map_err(|e| e.to_string())?;
    let count = logs.len();

    // 2. ファイルを作成
    let file = fs::File::create(file_path).map_err(|e| e.to_string())?;
    let writer = io::BufWriter::new(file);

    // 3. JSONとして書き出し (Pretty Printで見やすく)
    serde_json::to_writer_pretty(writer, &logs).map_err(|e| e.to_string())?;

    Ok(count)
}
