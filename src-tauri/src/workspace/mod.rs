use chrono::Local;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const DEFAULT_WORKSPACE_ROOT_NAME: &str = "Codex-Shell";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultWorkspace {
    pub root_path: PathBuf,
    pub path: PathBuf,
}

fn default_workspace_paths(documents: &Path, date: &str) -> DefaultWorkspace {
    let root_path = documents.join(DEFAULT_WORKSPACE_ROOT_NAME);
    let path = root_path.join(date);
    DefaultWorkspace { root_path, path }
}

pub fn resolve_default_workspace(app: &AppHandle) -> Result<DefaultWorkspace, String> {
    let documents = app
        .path()
        .document_dir()
        .map_err(|error| format!("无法解析当前用户文档目录：{error}"))?;
    let date = Local::now().format("%Y-%m-%d").to_string();
    let workspace = default_workspace_paths(&documents, &date);
    fs::create_dir_all(&workspace.path).map_err(|error| {
        format!(
            "创建 Codex Shell 默认工作区（{}）失败：{error}",
            workspace.path.display()
        )
    })?;
    Ok(workspace)
}

#[tauri::command]
pub fn get_default_workspace(app: AppHandle) -> Result<DefaultWorkspace, String> {
    resolve_default_workspace(&app)
}

#[cfg(test)]
#[path = "workspace_tests.rs"]
mod tests;
