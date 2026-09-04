mod app_server;
mod codex_home;
mod config;
mod credentials;
mod runtime;
mod workspace;

use app_server::AppServerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppServerState::default())
        .invoke_handler(tauri::generate_handler![
            app_server::app_server_send,
            app_server::app_server_start,
            app_server::app_server_stop,
            codex_home::set_codex_home,
            config::load_model_settings,
            config::save_model_settings,
            config::load_personalization_settings,
            config::save_personalization_settings,
            credentials::save_api_key,
            workspace::get_default_project_directory,
            workspace::reveal_path_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Codex Shell");
}
