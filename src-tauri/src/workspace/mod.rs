use chrono::Local;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};

const DEFAULT_PROJECT_ROOT_NAME: &str = "Codex-Shell";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultProjectDirectory {
    pub root_path: PathBuf,
    pub path: PathBuf,
}

fn default_project_directory_paths(documents: &Path, date: &str) -> DefaultProjectDirectory {
    let root_path = documents.join(DEFAULT_PROJECT_ROOT_NAME);
    let path = root_path.join(date);
    DefaultProjectDirectory { root_path, path }
}

pub fn resolve_default_project_directory(
    app: &AppHandle,
) -> Result<DefaultProjectDirectory, String> {
    let documents = app
        .path()
        .document_dir()
        .map_err(|error| format!("无法解析当前用户文档目录：{error}"))?;
    let date = Local::now().format("%Y-%m-%d").to_string();
    let project_directory = default_project_directory_paths(&documents, &date);
    fs::create_dir_all(&project_directory.path).map_err(|error| {
        format!(
            "创建 Codex Shell 默认项目目录（{}）失败：{error}",
            project_directory.path.display()
        )
    })?;
    Ok(project_directory)
}

#[tauri::command]
pub fn get_default_project_directory(app: AppHandle) -> Result<DefaultProjectDirectory, String> {
    resolve_default_project_directory(&app)
}

#[tauri::command]
pub fn reveal_path_in_explorer(path: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    if !target.is_absolute() {
        return Err("只能打开绝对本地路径".to_string());
    }
    Command::new("explorer.exe")
        .arg(format!("/select,{}", target.display()))
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("启动资源管理器失败：{error}"))
}

#[cfg(test)]
#[path = "workspace_tests.rs"]
mod tests;
