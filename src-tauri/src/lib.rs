mod app_server;
mod attachments;
mod builtin_skills;
mod catalog;
mod channel_probe;
mod codex_home;
mod config;
mod credentials;
mod mcp_credentials;
mod skill_files;
mod runtime;
mod workspace;
mod window_layout;

use app_server::AppServerState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppServerState::default())
        .setup(|app| {
            let window = app.get_webview_window("main").ok_or("主窗口不存在")?;
            window_layout::restore_to_monitor(&window).map_err(std::io::Error::other)?;
            window.maximize()?;
            window.show()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window_layout::toggle_window_maximized,
            app_server::app_server_send,
            app_server::app_server_start,
            app_server::app_server_stop,
            attachments::save_pasted_image,
            codex_home::set_codex_home,
            channel_probe::test_channel_connection,
            config::load_model_settings,
            config::save_model_settings,
            config::load_personalization_settings,
            config::save_personalization_settings,
            credentials::channel_secret_presence,
            mcp_credentials::save_mcp_secret,
            skill_files::install_local_skill,
            skill_files::uninstall_local_skill,
            builtin_skills::install_builtin_skill,
            builtin_skills::install_builtin_cs_docs,
            builtin_skills::install_builtin_amap,
            workspace::get_default_project_directory,
            workspace::reveal_path_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Codex Shell");
}
