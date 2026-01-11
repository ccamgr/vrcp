use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use vrcp_lib::db::repositories::logs::LogsRepository;
use vrcp_lib::db::DB;
use vrcp_lib::modules::watcher::VrcLogEvent::{AppStart, AppStop, InvalidAppStop};
use vrcp_lib::modules::watcher::{create_invalid_app_stop_payload, parse_log_line};

/**
 * This program imports log files into the database.
 *
 * usage: cargo test -- --ignored import_logs <file_path...>
 */
pub async fn import_logs(identifier: String, files: Vec<String>) {
    let app_dir = dirs::data_local_dir()
        .expect("failed to resolve local data dir")
        .join(identifier);

    // 2. データベース接続 (アプリと同じDBを開く)
    println!("Connecting to database...");
    let db = DB::new(app_dir).await.expect("failed to open database");
    let log_repo = db.logs();

    // 3. ファイルごとの処理
    let mut total_imported = 0;

    for filename in files {
        let path = Path::new(&filename);
        if !path.exists() {
            eprintln!("File not found: {:?}", path);
            continue;
        }

        println!("Processing: {:?}", path);
        match process_file(path, &log_repo).await {
            Ok((count, ecount)) => {
                println!("  -> Imported {} lines. ({} skipped)", count, ecount);
                total_imported += count;
            }
            Err(e) => eprintln!("  -> Error processing file: {}", e),
        }
    }

    println!("Done! Total imported lines: {}", total_imported);
}

async fn process_file(
    path: &Path,
    log_repo: &LogsRepository,
) -> Result<(i32, i32), Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut count = 0;
    let mut ecount = 0;

    let mut is_running = false;
    let mut last_timestamp = String::new();
    // トランザクションを使うと高速ですが、今回はシンプルに1行ずつ処理
    // 必要なら db.conn.lock().unwrap().transaction() ... を実装してください

    for line_result in reader.lines() {
        let line = line_result?;

        // watcherのリファクタリングした関数を使用
        if let Some(payload) = parse_log_line(&line) {
            // チェックはDB側のUNIQUE制約(INSERT OR IGNORE等)や
            // insert_logの実装に任せる (エラーが出ても止まらないようにする)
            last_timestamp = payload.timestamp.clone();
            match &payload.event {
                AppStart { .. } => {
                    is_running = true;
                }
                AppStop { .. } | InvalidAppStop { .. } => {
                    is_running = false;
                }
                _ => {}
            }
            match log_repo.insert_log(&payload).await {
                Ok(count_inserted) => {
                    count += count_inserted;
                    if count_inserted == 0 {
                        ecount += 1; // 重複等で挿入されなかった場合をエラーとしてカウント
                    }
                }
                Err(e) => {
                    eprintln!("\tinsert error: {}", e);
                }
            }
        }
    }
    if is_running {
        println!("  -> Warning: Log ended while app was still running. (inserted InvalidAppStop)");
        let crash_payload = create_invalid_app_stop_payload(&last_timestamp);
        match log_repo.insert_log(&crash_payload).await {
            Ok(count_inserted) => {
                count += count_inserted;
                if count_inserted == 0 {
                    ecount += 1; // 重複等で挿入されなかった場合をエラーとしてカウント
                }
            }
            Err(e) => {
                eprintln!("\tinsert error: {}", e);
            }
        }
    }

    Ok((count, ecount))
}
