use super::watcher::{Payload, VrcLogEvent};
use rusqlite::{params, Connection};
use std::fs;
use std::sync::{Arc, Mutex};
use tauri::Manager;

// エラーハンドリング用
type DbResult<T> = Result<T, Box<dyn std::error::Error>>;

#[derive(Clone)]
pub struct LogDatabase {
    conn: Arc<Mutex<Connection>>,
}

impl LogDatabase {
    /// データベースを初期化する
    pub fn new(app: tauri::AppHandle) -> DbResult<Self> {
        // 1. AppData\Local\{cc.amgr.vrcp} のパス取得
        let app_dir = app
            .path()
            .app_local_data_dir()
            .expect("failed to resolve app local data dir");

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
    /// 設定値取得
    pub fn get_setting(&self, key: &str) -> DbResult<String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let value: String = stmt.query_row(params![key], |row| row.get(0))?;
        Ok(value)
    }
    /// 設定値保存
    pub fn set_setting(&self, key: &str, value: &str) -> DbResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
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
             ORDER BY timestamp ASC",
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
