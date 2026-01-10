use std::env;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use vrcp_lib::modules::db::LogDatabase;
use vrcp_lib::modules::watcher::VrcLogEvent::{AppStart, AppStop, InvalidAppStop};
use vrcp_lib::modules::watcher::{create_invalid_app_stop_payload, parse_log_line};

/**
 * This program imports log files into the database.
 *
 * usage: cargo run --example import_logs -- <file_path...>
 */
fn usage() {
    eprintln!("Error: invalid arguments.");
    println!(
        "Usage: cargo run --example import_logs -- [--identifier=<identifier>] <file_paths...>"
    );
    println!("example:: cargo run --example import_logs -- --identifier=cc.amgr.vrcp.desktop.dev ./logs/output_log_*.txt");
}
fn main() {
    let mut files = Vec::<String>::new();
    let mut identifier: &str = "cc.amgr.vrcp.desktop.dev";

    // 1. 引数の取得
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        usage();
        return;
    }
    for arg in &args[1..] {
        if arg.starts_with("--") {
            let parts: Vec<&str> = arg[2..].splitn(2, '=').collect();
            if parts.len() == 2 {
                match parts[0] {
                    "identifier" => {
                        identifier = parts[1];
                    }
                    _ => {
                        usage();
                        return;
                    }
                }
            } else {
                usage();
                return;
            }
            continue;
        } else {
            files.push(arg.clone());
        }
    }

    let app_dir = dirs::data_local_dir()
        .expect("failed to resolve local data dir")
        .join(identifier);

    // 2. データベース接続 (アプリと同じDBを開く)
    println!("Connecting to database...");
    let db = match LogDatabase::new(app_dir) {
        Ok(db) => db,
        Err(e) => {
            eprintln!("Failed to connect DB: {}", e);
            return;
        }
    };

    // 3. ファイルごとの処理
    let mut total_imported = 0;

    for filename in &args[1..] {
        let path = Path::new(filename);
        if !path.exists() {
            eprintln!("File not found: {:?}", path);
            continue;
        }

        println!("Processing: {:?}", path);
        match process_file(path, &db) {
            Ok((count, ecount)) => {
                println!("  -> Imported {} lines. ({} skipped)", count, ecount);
                total_imported += count;
            }
            Err(e) => eprintln!("  -> Error processing file: {}", e),
        }
    }

    println!("Done! Total imported lines: {}", total_imported);
}

fn process_file(
    path: &Path,
    db: &LogDatabase,
) -> Result<(usize, usize), Box<dyn std::error::Error>> {
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
            match db.insert_log(&payload) {
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
        match db.insert_log(&crash_payload) {
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
