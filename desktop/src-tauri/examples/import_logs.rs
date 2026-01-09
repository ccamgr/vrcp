use std::env;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use vrcp_lib::modules::db::LogDatabase;
use vrcp_lib::modules::watcher::parse_log_line;

/**
 * This program imports log files into the database.
 *
 * usage: cargo run --example import_logs -- <file_path> [file_path...]
 */

fn main() {
    // 1. 引数の取得
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: cargo run test import_logs -- <file_path> [file_path...]");
        std::process::exit(1);
    }

    let app_dir = dirs::data_local_dir()
        .expect("failed to resolve local data dir")
        .join("cc.amgr.vrcp.desktop");

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
            Ok(count) => {
                println!("  -> Imported {} lines.", count);
                total_imported += count;
            }
            Err(e) => eprintln!("  -> Error processing file: {}", e),
        }
    }

    println!("Done! Total imported lines: {}", total_imported);
}

fn process_file(path: &Path, db: &LogDatabase) -> Result<usize, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut count = 0;

    // トランザクションを使うと高速ですが、今回はシンプルに1行ずつ処理
    // 必要なら db.conn.lock().unwrap().transaction() ... を実装してください

    for line_result in reader.lines() {
        let line = line_result?;

        // watcherのリファクタリングした関数を使用
        if let Some(payload) = parse_log_line(&line) {
            // 重複チェックはDB側のUNIQUE制約(INSERT OR IGNORE等)や
            // insert_logの実装に任せる (エラーが出ても止まらないようにする)
            match db.insert_log(&payload) {
                Ok(_) => count += 1,
                Err(e) => {
                    eprintln!("Insert error: {}", e);
                }
            }
        }
    }

    Ok(count)
}
