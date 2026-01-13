pub mod db;
pub mod modules;
pub mod services;
pub mod utils;
use tauri::Manager;
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};

pub struct Ctx {
    db: db::DB,
    srv: modules::server::HttpSrv,
    watcher: tauri::async_runtime::JoinHandle<()>,
}

// ---------------------------------------------------------
// Specta Builder
// ---------------------------------------------------------

pub fn create_specta_builder() -> SpectaBuilder {
    SpectaBuilder::new()
        .commands(collect_commands![
            modules::server::set_server_port,
            modules::server::get_server_port,
            modules::server::get_server_url,
            services::logs::export_logs,
            services::logs::get_logs,
            services::logs::delete_all_logs,
            services::sessions::get_sessions,
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
                tauri::async_runtime::block_on(async move { db::DB::new(app_data_dir).await })?;

            app.manage(db.clone()); // グローバルステートとしてDBを登録

            // ログ監視開始
            let watcher = modules::watcher::spawn_log_watcher(app.handle().clone(), db.clone());
            // http srv 起動
            let srv = modules::server::HttpSrv::new(db.clone());
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

            let ctx = Ctx { db, srv, watcher };
            app.manage(ctx); // グローバルステートとしてCtxを登録

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
