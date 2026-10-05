pub mod cmds;
pub mod contracts;
pub mod db;
pub mod modules;
pub mod utils;
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};
use tauri::Manager;
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};

const ERROR_LOG_FILE_NAME: &str = "error.log";
const LEGACY_STARTUP_ERROR_LOG_FILE_NAME: &str = "startup-error.log";
const MAX_ERROR_LOG_ARCHIVES: usize = 5;

pub struct Ctx {
    db: db::DB,
    srv: modules::HttpSrv,
    watcher: modules::WatcherService,
    vrcapi: modules::VrcApiService,
}

fn error_log_dir() -> Option<PathBuf> {
    dirs::data_local_dir().map(|data_dir| data_dir.join("VRCP"))
}

fn error_log_path(log_dir: &Path) -> PathBuf {
    log_dir.join(ERROR_LOG_FILE_NAME)
}

fn archive_error_log_path(log_dir: &Path) -> PathBuf {
    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
    let mut path = log_dir.join(format!("{timestamp}.log"));
    let mut suffix = 1;
    while path.exists() {
        path = log_dir.join(format!("{timestamp}-{suffix}.log"));
        suffix += 1;
    }
    path
}

fn is_error_log_archive(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    if name.len() < 23 || !name.ends_with(".log") {
        return false;
    }

    chrono::NaiveDateTime::parse_from_str(&name[..19], "%Y-%m-%d_%H-%M-%S").is_ok()
}

fn prune_error_log_archives(log_dir: &Path) {
    let Ok(entries) = fs::read_dir(log_dir) else {
        return;
    };
    let mut archives: Vec<PathBuf> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| is_error_log_archive(path))
        .collect();
    archives.sort();

    for archive in archives.into_iter().rev().skip(MAX_ERROR_LOG_ARCHIVES) {
        let _ = fs::remove_file(archive);
    }
}

fn migrate_legacy_startup_error_log(log_dir: &Path) {
    let legacy_path = log_dir.join(LEGACY_STARTUP_ERROR_LOG_FILE_NAME);
    let Ok(legacy_contents) = fs::read_to_string(&legacy_path) else {
        return;
    };
    if legacy_contents.is_empty() {
        let _ = fs::remove_file(legacy_path);
        return;
    }

    let log_path = error_log_path(log_dir);
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(file, "[legacy startup-error.log]");
        let _ = write!(file, "{legacy_contents}");
        let _ = fs::remove_file(legacy_path);
    }
}

pub(crate) fn initialize_error_log() {
    let Some(log_dir) = error_log_dir() else {
        return;
    };
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }

    let log_path = error_log_path(&log_dir);
    if log_path.exists() {
        let _ = fs::rename(&log_path, archive_error_log_path(&log_dir));
    }
    prune_error_log_archives(&log_dir);
    migrate_legacy_startup_error_log(&log_dir);
    append_error_log("VRCP Desktop started");
}

pub(crate) fn append_error_log(message: &str) {
    let Some(log_dir) = error_log_dir() else {
        return;
    };
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }

    let timestamp = chrono::Local::now().to_rfc3339();
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(error_log_path(&log_dir))
    {
        let _ = writeln!(file, "[{timestamp}] {message}");
    }
}

fn install_startup_panic_hook() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        append_error_log(&format!("panic: {panic_info}"));
        default_hook(panic_info);
    }));
}

// ---------------------------------------------------------
// Specta Builder
// ---------------------------------------------------------

pub fn create_specta_builder() -> SpectaBuilder {
    SpectaBuilder::new()
        .commands(collect_commands![
            cmds::http::server::set_server_port,
            cmds::http::server::get_server_port,
            cmds::http::server::get_server_url,
            cmds::vrclog::logs::export_logs,
            cmds::vrclog::logs::get_logs,
            cmds::vrclog::logs::delete_all_logs,
            cmds::vrclog::sessions::get_sessions,
            cmds::vrcapi::auth::login,
            cmds::vrcapi::auth::logout,
            cmds::vrcapi::auth::verify_2fa,
            cmds::vrcapi::auth::check_auth,
            cmds::vrcapi::friends::get_friend_instances,
            cmds::vrcapi::invite::invite_myself,
            cmds::app::log_direct_launch_failure
        ])
        .events(collect_events![
            modules::watcher::LogPayload,
            modules::watcher::VrcLogEvent
        ])
}

// ---------------------------------------------------------
// Entry Point
// ---------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    initialize_error_log();
    install_startup_panic_hook();
    let builder = create_specta_builder();

    let result = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]), // with minimize on auto-start
        ))
        .invoke_handler(builder.invoke_handler())
        .on_window_event(|window, event| {
            modules::systray::handle_window_event(window, event);
        })
        .setup(move |app| {
            builder.mount_events(app);

            // DB 初期化
            let app_data_dir = app
                .handle()
                .path()
                .app_local_data_dir()
                .expect("failed to resolve app local data dir");

            let db = tauri::async_runtime::block_on(db::DB::new(app_data_dir.clone()))?;

            let backfill_db = db.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = backfill_db.backfill_sessions().await {
                    eprintln!("Session backfill failed: {error}");
                }
            });

            app.manage(db.clone()); // グローバルステートとしてDBを登録

            // VRCAPI サービス初期化
            let vrcapi =
                modules::VrcApiService::new(app_data_dir).expect("Failed to init VrcApiService");
            app.manage(vrcapi.clone());

            // ログ監視開始
            let watcher = modules::watcher::spawn_log_watcher(app.handle().clone(), db.clone());
            // http srv 起動
            let srv = tauri::async_runtime::block_on(modules::http::HttpSrv::new(db.clone()));
            // 常駐化設定
            modules::systray::setup_tray(app.handle())?;

            // 起動引数チェック
            let args: Vec<String> = std::env::args().collect();
            let minimized = args.contains(&"--minimized".to_string());
            if minimized {
                println!("Auto-started in background. Window remains hidden.");
            } else {
                // 自動起動じゃない（手動起動）なら、ウィンドウを表示する
                if let Some(window) = app.get_webview_window("main") {
                    window.show()?;
                    window.set_focus()?;
                }
            }

            let ctx = Ctx {
                db,
                srv,
                watcher,
                vrcapi,
            };
            app.manage(ctx); // グローバルステートとしてCtxを登録

            Ok(())
        })
        .run(tauri::generate_context!());

    if let Err(error) = result {
        append_error_log(&format!("Tauri runtime error: {error}"));
    }
}
