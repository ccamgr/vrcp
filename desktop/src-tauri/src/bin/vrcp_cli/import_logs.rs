use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use vrcp_lib::db::DB;

use vrcp_lib::modules::watcher::parse_log_line;

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

    // 3. ファイルごとの処理
    let mut total_imported = 0;

    for filename in files {
        let path = Path::new(&filename);
        if !path.exists() {
            eprintln!("File not found: {:?}", path);
            continue;
        }

        println!("Processing: {:?}", path);
        match process_file(path, &db).await {
            Ok((count, ecount)) => {
                println!("  -> Imported {} lines. ({} skipped)", count, ecount);
                total_imported += count;
            }
            Err(e) => eprintln!("  -> Error processing file: {}", e),
        }
    }

    if let Err(error) = db.backfill_sessions().await {
        eprintln!("Session backfill failed after import: {error}");
    }

    println!("Done! Total imported lines: {}", total_imported);
}

async fn process_file(path: &Path, db: &DB) -> Result<(i32, i32), Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut count = 0;
    let mut ecount = 0;

    // トランザクションを使うと高速ですが、今回はシンプルに1行ずつ処理
    // 必要なら db.conn.lock().unwrap().transaction() ... を実装してください

    for line_result in reader.lines() {
        let line = line_result?;

        // watcherのリファクタリングした関数を使用
        if let Some(payload) = parse_log_line(&line) {
            match db.record_log(&payload).await {
                Ok(()) => count += 1,
                Err(error) => {
                    eprintln!("\tinsert error: {error}");
                    ecount += 1;
                }
            }
        }
    }

    Ok((count, ecount))
}
