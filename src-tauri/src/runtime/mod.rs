use serde::Serialize;
use std::env;
use std::path::PathBuf;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub executable: String,
    pub source: String,
}

pub fn resolve_codex_executable() -> (PathBuf, &'static str) {
    if let Some(path) = env::var_os("CODEX_SHELL_RUNTIME") {
        return (PathBuf::from(path), "environment");
    }
    if let Ok(current_executable) = env::current_exe()
        && let Some(directory) = current_executable.parent()
    {
        let bundled = directory.join("codex.exe");
        if bundled.exists() {
            return (bundled, "bundled");
        }
    }
    (PathBuf::from("codex.exe"), "path")
}

#[tauri::command]
pub fn runtime_status() -> RuntimeStatus {
    let (path, source) = resolve_codex_executable();
    RuntimeStatus {
        executable: path.to_string_lossy().into_owned(),
        source: source.to_string(),
    }
}
