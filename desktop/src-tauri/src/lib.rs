pub mod db;
pub mod modules;
pub mod utils;
pub mod cmds;
use tauri::Manager;
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};


pub struct Ctx {
    db: db::DB,
    srv: modules::HttpSrv,
    watcher: modules::WatcherService,
    vrcapi: modules::VrcApiService,
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
    let builder = create_specta_builder();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]), // with minimize on auto-start
        ))
        .plugin(tauri_plugin_opener::init())
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

            let db =
                tauri::async_runtime::block_on(db::DB::new(app_data_dir.clone()))?;

            app.manage(db.clone()); // グローバルステートとしてDBを登録

            // VRCAPI サービス初期化
            let vrcapi = modules::VrcApiService::new(app_data_dir).expect("Failed to init VrcApiService");
            app.manage(vrcapi.clone());

            // ログ監視開始
            let watcher = modules::watcher::spawn_log_watcher(app.handle().clone(), db.clone());
            // http srv 起動
            let srv = modules::http::HttpSrv::new(db.clone());
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

            let ctx = Ctx { db, srv, watcher, vrcapi };
            app.manage(ctx); // グローバルステートとしてCtxを登録

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
