pub mod modules;
use tauri::Manager;
use tauri_specta::{collect_commands, collect_events, Builder as SpectaBuilder};

// ---------------------------------------------------------
// Specta Builder
// ---------------------------------------------------------

pub fn create_specta_builder() -> SpectaBuilder {
    SpectaBuilder::new()
        .commands(collect_commands![
            modules::server::set_server_port,
            modules::server::get_server_port,
            modules::server::get_server_url,
            modules::db::get_logs,
            modules::db::delete_all_logs,
            modules::db::export_logs,
        ])
        .events(collect_events![
            modules::watcher::Payload,
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
        // .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]), // with minimize on auto-start
        ))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);

            // DB 初期化
            let db = modules::db::LogDatabase::new(
                app.handle()
                    .path()
                    .app_local_data_dir()
                    .expect("failed to resolve app local data dir"),
            )
            .expect("failed to initialize database");

            app.manage(db.clone()); // グローバルステートとしてDBを登録
            app.manage(modules::server::ServerState::new()); // グローバルステートとしてServerStateを登録

            // ログ監視開始
            modules::watcher::spawn_log_watcher(app.handle().clone(), db.clone());
            // http srv 起動
            modules::server::spawn_server(db);
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

            Ok(())
        })
        .on_window_event(|window, event| {
            // add window event handler
            modules::systray::handle_window_event(window, event);
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
