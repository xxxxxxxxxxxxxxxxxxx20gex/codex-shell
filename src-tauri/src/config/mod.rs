use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const CONFIG_FILE_NAME: &str = "settings.json";
const PREFERENCES_FILE_NAME: &str = "preferences.json";

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettings {
    pub base_url: String,
    pub model_id: String,
    #[serde(default, rename = "capabilityTemplate", skip_serializing)]
    pub(crate) legacy_capability_template: Option<String>,
    pub reasoning_effort: Option<String>,
    pub verbosity: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonalizationSettings {
    #[serde(default)]
    pub custom_instructions: String,
    #[serde(default = "default_theme")]
    pub theme: String,
}

fn default_theme() -> String {
    "dark".to_string()
}

impl Default for PersonalizationSettings {
    fn default() -> Self {
        Self {
            custom_instructions: String::new(),
            theme: default_theme(),
        }
    }
}

#[cfg(test)]
#[path = "config_tests.rs"]
mod tests;

impl Default for ModelSettings {
    fn default() -> Self {
        Self {
            base_url: "https://api.openai.com/v1".to_string(),
            model_id: "gpt-5.6-sol".to_string(),
            legacy_capability_template: None,
            reasoning_effort: Some("low".to_string()),
            verbosity: Some("low".to_string()),
        }
    }
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join(CONFIG_FILE_NAME))
        .map_err(|error| format!("无法解析应用配置目录：{error}"))
}

fn preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join(PREFERENCES_FILE_NAME))
        .map_err(|error| format!("无法解析应用配置目录：{error}"))
}

pub fn read_settings(app: &AppHandle) -> Result<ModelSettings, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(ModelSettings::default());
    }
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("读取模型配置失败（{}）：{error}", path.display()))?;
    let settings: ModelSettings =
        serde_json::from_str(&contents).map_err(|error| format!("模型配置格式无效：{error}"))?;
    Ok(normalize_settings(settings))
}

fn normalize_settings(mut settings: ModelSettings) -> ModelSettings {
    settings.base_url = settings.base_url.trim().to_string();
    settings.model_id = settings.model_id.trim().to_string();
    if settings.legacy_capability_template.as_deref() == Some("openai-compatible-basic") {
        settings.reasoning_effort = None;
        settings.verbosity = None;
    }
    settings
}

#[tauri::command]
pub fn load_model_settings(app: AppHandle) -> Result<ModelSettings, String> {
    read_settings(&app)
}

#[tauri::command]
pub fn save_model_settings(app: AppHandle, settings: ModelSettings) -> Result<(), String> {
    let settings = normalize_settings(settings);
    if settings.base_url.is_empty() || settings.model_id.is_empty() {
        return Err("Base URL 与模型 ID 不能为空".to_string());
    }

    let path = config_path(&app)?;
    let directory = path
        .parent()
        .ok_or_else(|| "模型配置路径缺少父目录".to_string())?;
    fs::create_dir_all(directory).map_err(|error| format!("创建配置目录失败：{error}"))?;
    let contents = serde_json::to_string_pretty(&settings)
        .map_err(|error| format!("序列化模型配置失败：{error}"))?;
    fs::write(&path, contents).map_err(|error| format!("写入模型配置失败：{error}"))
}

fn normalize_preferences(mut settings: PersonalizationSettings) -> PersonalizationSettings {
    settings.custom_instructions = settings.custom_instructions.trim().to_string();
    if !matches!(settings.theme.as_str(), "dark" | "light" | "system") {
        settings.theme = default_theme();
    }
    settings
}

#[tauri::command]
pub fn load_personalization_settings(app: AppHandle) -> Result<PersonalizationSettings, String> {
    let path = preferences_path(&app)?;
    if !path.exists() {
        return Ok(PersonalizationSettings::default());
    }
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("读取个性化设置失败（{}）：{error}", path.display()))?;
    let settings = serde_json::from_str::<PersonalizationSettings>(&contents)
        .map_err(|error| format!("个性化设置格式无效：{error}"))?;
    Ok(normalize_preferences(settings))
}

#[tauri::command]
pub fn save_personalization_settings(
    app: AppHandle,
    settings: PersonalizationSettings,
) -> Result<(), String> {
    let settings = normalize_preferences(settings);
    let path = preferences_path(&app)?;
    let directory = path
        .parent()
        .ok_or_else(|| "个性化设置路径缺少父目录".to_string())?;
    fs::create_dir_all(directory).map_err(|error| format!("创建配置目录失败：{error}"))?;
    let contents = serde_json::to_string_pretty(&settings)
        .map_err(|error| format!("序列化个性化设置失败：{error}"))?;
    fs::write(&path, contents).map_err(|error| format!("写入个性化设置失败：{error}"))
}
