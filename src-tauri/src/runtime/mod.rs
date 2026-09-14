use std::env;
use std::ffi::{OsStr, OsString};
use std::path::Path;
use std::path::PathBuf;

const RUNTIME_FILE_NAME: &str = "codex.exe";

pub fn bundled_tool_path(application: &Path, inherited: Option<&OsStr>) -> Result<OsString, String> {
    let directory = application
        .parent()
        .ok_or_else(|| "无法解析 CS 工具目录".to_string())?;
    if !directory.join("rg.exe").is_file() {
        return Err("CS 内置 rg.exe 缺失，请重新构建或重新安装应用".to_string());
    }
    let mut paths = vec![directory.to_path_buf()];
    if let Some(inherited) = inherited {
        paths.extend(env::split_paths(inherited));
    }
    env::join_paths(paths).map_err(|error| format!("无法构造 CS 工具 PATH：{error}"))
}

pub fn resolve_codex_executable() -> Result<PathBuf, String> {
    let current_directory =
        env::current_dir().map_err(|error| format!("无法解析 Codex Shell 当前目录：{error}"))?;

    if let Some(path) = env::var_os("CODEX_SHELL_RUNTIME") {
        let resolved =
            resolve_candidate(Path::new(&path), &current_directory).ok_or_else(|| {
                format!(
                    "CODEX_SHELL_RUNTIME 指向的 Runtime 不存在：{}",
                    PathBuf::from(path).display()
                )
            })?;
        return Ok(resolved);
    }

    if let Ok(current_executable) = env::current_exe()
        && let Some(directory) = current_executable.parent()
    {
        let bundled = directory.join(RUNTIME_FILE_NAME);
        if let Some(resolved) = existing_file(bundled) {
            return Ok(resolved);
        }
    }

    if let Some(resolved) = find_on_path(env::var_os("PATH").as_deref()) {
        return Ok(resolved);
    }

    Err(
        "未找到 codex.exe；请打包 sidecar、设置 CODEX_SHELL_RUNTIME，或将 Codex 加入 PATH"
            .to_string(),
    )
}

fn resolve_candidate(path: &Path, current_directory: &Path) -> Option<PathBuf> {
    let candidate = if path.is_absolute() {
        path.to_path_buf()
    } else {
        current_directory.join(path)
    };
    if candidate.is_dir() {
        existing_file(candidate.join(RUNTIME_FILE_NAME))
    } else {
        existing_file(candidate)
    }
}

fn find_on_path(search_path: Option<&OsStr>) -> Option<PathBuf> {
    search_path.and_then(|paths| {
        env::split_paths(paths)
            .find_map(|directory| existing_file(directory.join(RUNTIME_FILE_NAME)))
    })
}

fn existing_file(path: PathBuf) -> Option<PathBuf> {
    path.is_file().then(|| path.canonicalize().unwrap_or(path))
}

#[cfg(test)]
#[path = "runtime_tests.rs"]
mod tests;
