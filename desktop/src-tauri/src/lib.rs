mod modules;

use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};

// Import necessary items from watcher module
use modules::watcher::{process_log_line, Payload, VrcLogEvent};

// ---------------------------------------------------------
// Helper: Find VRChat Log Directory
// ---------------------------------------------------------
fn get_vrc_log_dir() -> Option<PathBuf> {
    // Windows: %AppData%/../LocalLow/VRChat/VRChat
    dirs::data_local_dir().map(|path| path.join("..").join("LocalLow").join("VRChat").join("VRChat"))
}

// ---------------------------------------------------------
// Helper: Find the latest log file
// ---------------------------------------------------------
fn get_latest_log_path() -> Option<PathBuf> {
    let log_dir = get_vrc_log_dir()?;

    let entries = fs::read_dir(log_dir).ok()?;

    let mut logs: Vec<PathBuf> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            // Filter files that start with "output_log" and end with ".txt"
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                name.starts_with("output_log") && name.ends_with(".txt")
            } else {
                false
            }
        })
        .collect();

    // Sort by modified time (or name) to get the latest
    logs.sort_by_key(|path| {
        path.metadata()
            .and_then(|m| m.modified())
            .ok()
    });

    // Return the last one (latest)
    logs.last().cloned()
}

// ---------------------------------------------------------
// Background Task: Log Watcher
// ---------------------------------------------------------

fn start_log_watcher(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        // 1. Locate the latest log file
        let mut log_path = match get_latest_log_path() {
            Some(path) => path,
            None => {
                eprintln!("VRChat log file not found. Watcher will not start.");
                return;
            }
        };

        println!("Start watching log file: {:?}", log_path);

        let file = match File::open(&log_path) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Failed to open log file: {}", e);
                return;
            }
        };

        let mut reader = BufReader::new(file);

        // 2. Seek to the end of the file (Tail mode)
        // If you want to read past logs, change to SeekFrom::Start(0)
        if let Err(e) = reader.seek(SeekFrom::End(0)) {
            eprintln!("Failed to seek file: {}", e);
            return;
        }

        let mut line = String::new();

        // 3. Loop forever
        loop {
            // Check if the log file has been rotated (new file created)
            // Ideally, we should check this periodically, but for simplicity, we stick to the current file here.

            match reader.read_line(&mut line) {
                Ok(0) => {
                    // EOF (End of File) - No new logs yet
                    // Sleep for a short duration to prevent high CPU usage
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
                Ok(_) => {
                    // Process the line using the logic in watcher.rs
                    process_log_line(&line, &app);

                    // Clear the buffer for the next line
                    line.clear();
                }
                Err(e) => {
                    eprintln!("Error reading log line: {}", e);
                    // Sleep and retry
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
        }
    });
}

// ---------------------------------------------------------
// Specta Builder, (also used in gen_bindings.rs)
// ---------------------------------------------------------

pub fn create_specta_builder() -> SpectaBuilder {
    SpectaBuilder::new()
        .commands(collect_commands![]) // No commands for now
        .events(collect_events![
            Payload,      // Register Payload struct
            VrcLogEvent   // Register Event enum
        ])
}

// ---------------------------------------------------------
// Entry Point
// ---------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = create_specta_builder();

    tauri::Builder::default()
        // No AppState needed for now since the watcher is stateless regex
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);

            // Start the background watcher
            start_log_watcher(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
