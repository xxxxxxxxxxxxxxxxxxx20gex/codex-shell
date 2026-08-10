use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Manager};

const SETTINGS_FILE_NAME: &str = "runtime-settings.json";
const DEFAULT_DIRECTORY_NAME: &str = ".codex-shell";
const OFFICIAL_DIRECTORY_NAME: &str = ".codex";
const LEGACY_DIRECTORY_NAME: &str = "codex-home";

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeSettings {
    codex_home: Option<PathBuf>,
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join(SETTINGS_FILE_NAME))
        .map_err(|error| format!("无法解析 Codex Shell 配置目录：{error}"))
}

fn read_settings(app: &AppHandle) -> Result<RuntimeSettings, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(RuntimeSettings::default());
    }

    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("读取 CODEX_HOME 配置失败（{}）：{error}", path.display()))?;
    serde_json::from_str(&contents).map_err(|error| format!("CODEX_HOME 配置格式无效：{error}"))
}

fn write_settings(app: &AppHandle, settings: &RuntimeSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    let directory = path
        .parent()
        .ok_or_else(|| "CODEX_HOME 配置路径缺少父目录".to_string())?;
    fs::create_dir_all(directory).map_err(|error| format!("创建配置目录失败：{error}"))?;
    let contents = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("序列化 CODEX_HOME 配置失败：{error}"))?;
    fs::write(&path, contents).map_err(|error| format!("写入 CODEX_HOME 配置失败：{error}"))
}

fn user_home(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .home_dir()
        .map_err(|error| format!("无法解析当前用户目录：{error}"))
}

fn normalized(path: &Path) -> PathBuf {
    let mut result = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                result.pop();
            }
            _ => result.push(component.as_os_str()),
        }
    }
    result
}

#[cfg(windows)]
fn path_is_same_or_descendant(path: &Path, parent: &Path) -> bool {
    let path = normalized(path)
        .to_string_lossy()
        .replace('/', "\\")
        .to_lowercase();
    let parent = normalized(parent)
        .to_string_lossy()
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_lowercase();
    path == parent
        || path
            .strip_prefix(&parent)
            .is_some_and(|rest| rest.starts_with('\\'))
}

#[cfg(not(windows))]
fn path_is_same_or_descendant(path: &Path, parent: &Path) -> bool {
    normalized(path).starts_with(normalized(parent))
}

fn validate_isolated_path(path: &Path, official_home: &Path) -> Result<(), String> {
    if !path.is_absolute() {
        return Err("CODEX_HOME 必须是绝对路径".to_string());
    }
    if path_is_same_or_descendant(path, official_home)
        || path_is_same_or_descendant(official_home, path)
    {
        return Err("Codex Shell 目录不能与官方 ~/.codex 目录重叠".to_string());
    }
    Ok(())
}

fn prepare_custom_path(path: &Path, official_home: &Path) -> Result<PathBuf, String> {
    validate_isolated_path(path, official_home)?;
    fs::create_dir_all(path)
        .map_err(|error| format!("创建自定义 CODEX_HOME（{}）失败：{error}", path.display()))?;
    let resolved = path
        .canonicalize()
        .map_err(|error| format!("解析自定义 CODEX_HOME（{}）失败：{error}", path.display()))?;
    let resolved_official = official_home
        .canonicalize()
        .unwrap_or_else(|_| normalized(official_home));
    validate_isolated_path(&resolved, &resolved_official)?;
    Ok(resolved)
}

fn directory_is_empty(path: &Path) -> Result<bool, String> {
    fs::read_dir(path)
        .map_err(|error| format!("读取 CODEX_HOME 目录（{}）失败：{error}", path.display()))
        .map(|mut entries| entries.next().is_none())
}

fn prepare_default_path(
    default_home: &Path,
    legacy_home: &Path,
    official_home: &Path,
) -> Result<PathBuf, String> {
    validate_isolated_path(default_home, official_home)?;
    let resolved_official = official_home
        .canonicalize()
        .unwrap_or_else(|_| normalized(official_home));
    if default_home.exists() {
        let resolved_default = default_home.canonicalize().map_err(|error| {
            format!(
                "解析默认 CODEX_HOME（{}）失败：{error}",
                default_home.display()
            )
        })?;
        validate_isolated_path(&resolved_default, &resolved_official)?;
    }
    if legacy_home.exists() {
        let resolved_legacy = legacy_home.canonicalize().map_err(|error| {
            format!(
                "解析旧 CODEX_HOME（{}）失败：{error}",
                legacy_home.display()
            )
        })?;
        validate_isolated_path(&resolved_legacy, &resolved_official)?;

        if default_home.exists() {
            match (
                directory_is_empty(default_home)?,
                directory_is_empty(legacy_home)?,
            ) {
                (_, true) => fs::remove_dir(legacy_home).map_err(|error| {
                    format!(
                        "清理空的旧 CODEX_HOME（{}）失败：{error}",
                        legacy_home.display()
                    )
                })?,
                (true, false) => fs::remove_dir(default_home).map_err(|error| {
                    format!(
                        "清理空的默认 CODEX_HOME（{}）失败：{error}",
                        default_home.display()
                    )
                })?,
                (false, false) => {
                    return Err(format!(
                        "检测到两个非空的 Codex Shell 数据目录：{} 和 {}。为避免历史丢失，未自动选择或合并，请先备份并整理后重试。",
                        default_home.display(),
                        legacy_home.display()
                    ));
                }
            }
        }
    }

    if !default_home.exists() && legacy_home.exists() {
        let parent = default_home
            .parent()
            .ok_or_else(|| "默认 CODEX_HOME 缺少父目录".to_string())?;
        fs::create_dir_all(parent).map_err(|error| format!("创建用户目录失败：{error}"))?;
        fs::rename(legacy_home, default_home).map_err(|error| {
            format!(
                "迁移旧 CODEX_HOME（{} → {}）失败：{error}",
                legacy_home.display(),
                default_home.display()
            )
        })?;
    }

    fs::create_dir_all(default_home).map_err(|error| {
        format!(
            "创建 Codex Shell 默认 CODEX_HOME（{}）失败：{error}",
            default_home.display()
        )
    })?;
    let resolved = default_home.canonicalize().map_err(|error| {
        format!(
            "解析默认 CODEX_HOME（{}）失败：{error}",
            default_home.display()
        )
    })?;
    validate_isolated_path(&resolved, &resolved_official)?;
    Ok(resolved)
}

pub fn resolve_codex_home(app: &AppHandle) -> Result<PathBuf, String> {
    let home = user_home(app)?;
    let official_home = home.join(OFFICIAL_DIRECTORY_NAME);
    if let Some(custom_home) = read_settings(app)?.codex_home {
        return prepare_custom_path(&custom_home, &official_home);
    }

    let default_home = home.join(DEFAULT_DIRECTORY_NAME);
    let legacy_home = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("无法解析 Codex Shell 旧数据目录：{error}"))?
        .join(LEGACY_DIRECTORY_NAME);
    prepare_default_path(&default_home, &legacy_home, &official_home)
}

#[tauri::command]
pub fn set_codex_home(app: AppHandle, path: Option<String>) -> Result<String, String> {
    let home = user_home(&app)?;
    let official_home = home.join(OFFICIAL_DIRECTORY_NAME);
    let codex_home = match path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(path) => prepare_custom_path(Path::new(path), &official_home)?,
        None => {
            let default_home = home.join(DEFAULT_DIRECTORY_NAME);
            let legacy_home = app
                .path()
                .app_local_data_dir()
                .map_err(|error| format!("无法解析 Codex Shell 旧数据目录：{error}"))?
                .join(LEGACY_DIRECTORY_NAME);
            prepare_default_path(&default_home, &legacy_home, &official_home)?
        }
    };
    let default_home = home.join(DEFAULT_DIRECTORY_NAME);
    let codex_home_setting = if normalized(&codex_home) == normalized(&default_home) {
        None
    } else {
        Some(codex_home.clone())
    };
    write_settings(
        &app,
        &RuntimeSettings {
            codex_home: codex_home_setting,
        },
    )?;
    Ok(codex_home.to_string_lossy().into_owned())
}

#[cfg(test)]
#[path = "codex_home_tests.rs"]
mod tests;
