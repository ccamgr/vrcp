pub mod cmds;
pub mod db;
pub mod modules;
pub mod utils;
use std::{
    fs::{self, OpenOptions},
    io::Write,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};

pub struct Ctx {
    db: db::DB,
    srv: modules::HttpSrv,
    watcher: modules::WatcherService,
    vrcapi: modules::VrcApiService,
}

pub(crate) fn append_startup_error(message: &str) {
    let Some(data_dir) = dirs::data_local_dir() else {
        return;
    };
    let log_dir = data_dir.join("VRCP");
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_dir.join("startup-error.log"))
    {
        let _ = writeln!(file, "[{timestamp}] {message}");
    }
}

fn install_startup_panic_hook() {
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        append_startup_error(&format!("panic: {panic_info}"));
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
            cmds::vrcapi::auth::verify_2fa
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
    install_startup_panic_hook();
    let builder = create_specta_builder();

    let result = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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
        append_startup_error(&format!("Tauri runtime error: {error}"));
    }
}
