use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

use crate::credentials::channel_id_is_valid;

const CONFIG_FILE_NAME: &str = "settings.json";
const PREFERENCES_FILE_NAME: &str = "preferences.json";
const LEGACY_BACKUP_FILE_NAME: &str = "settings.v1.bak.json";

pub const SETTINGS_SCHEMA_VERSION: u32 = 2;
pub const VENDOR_OPENAI: &str = "openai";
pub const VENDOR_DEEPSEEK: &str = "deepseek";
pub const KNOWN_VENDORS: [&str; 2] = [VENDOR_OPENAI, VENDOR_DEEPSEEK];

/// 与 provider 无关的对话参数。`None` 表示不覆盖 Core 与模型目录的默认值。
///
/// 每个渠道持有独立的一份，切换渠道不会覆盖其他渠道已经调好的参数。
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelConversationSettings {
    #[serde(default)]
    pub model_id: Option<String>,
    #[serde(default)]
    pub reasoning_effort: Option<String>,
    #[serde(default)]
    pub reasoning_summary: Option<String>,
    #[serde(default)]
    pub verbosity: Option<String>,
    #[serde(default = "default_service_tier")]
    pub service_tier: String,
}

impl Default for ChannelConversationSettings {
    fn default() -> Self {
        Self {
            model_id: None,
            reasoning_effort: None,
            reasoning_summary: None,
            verbosity: None,
            service_tier: default_service_tier(),
        }
    }
}

/// 渠道使用的模型目录来源。内置目录直接沿用 Core 的能力，因此没有文件路径。
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ChannelCatalog {
    #[default]
    VendorDefault,
    File {
        path: String,
    },
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Channel {
    pub id: String,
    pub vendor: String,
    pub name: String,
    pub base_url: String,
    #[serde(default)]
    pub catalog: ChannelCatalog,
    #[serde(default)]
    pub conversation: ChannelConversationSettings,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSettings {
    #[serde(default)]
    pub schema_version: u32,
    #[serde(default)]
    pub active_channel_id: Option<String>,
    #[serde(default)]
    pub channels: Vec<Channel>,
}

impl ModelSettings {
    pub fn active_channel(&self) -> Option<&Channel> {
        let id = self.active_channel_id.as_deref()?;
        self.channels.iter().find(|channel| channel.id == id)
    }
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

/// 首次启动时使用的渠道，保留升级前的默认模型。
pub fn default_settings() -> ModelSettings {
    let id = generate_channel_id(VENDOR_OPENAI, &[]);
    let channel = Channel {
        id: id.clone(),
        vendor: VENDOR_OPENAI.to_string(),
        name: "OpenAI 官方".to_string(),
        base_url: "https://api.openai.com/v1".to_string(),
        catalog: ChannelCatalog::VendorDefault,
        conversation: ChannelConversationSettings {
            model_id: Some("gpt-5.6-sol".to_string()),
            ..ChannelConversationSettings::default()
        },
    };
    ModelSettings {
        schema_version: SETTINGS_SCHEMA_VERSION,
        active_channel_id: Some(id),
        channels: vec![channel],
    }
}

fn generate_channel_id(vendor: &str, channels: &[Channel]) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos() as u64)
        .unwrap_or(0);
    for attempt in 0..10_000u64 {
        let candidate = format!("{vendor}-{:08x}", nanos.wrapping_add(attempt) & 0xffff_ffff);
        if !channels.iter().any(|channel| channel.id == candidate) {
            return candidate;
        }
    }
    format!("{vendor}-{nanos:016x}")
}

fn host_of(base_url: &str) -> &str {
    base_url
        .split("://")
        .nth(1)
        .unwrap_or(base_url)
        .split(['/', ':'])
        .next()
        .unwrap_or_default()
}

fn vendor_for_base_url(base_url: &str) -> &'static str {
    if host_of(base_url).to_ascii_lowercase().contains("deepseek") {
        VENDOR_DEEPSEEK
    } else {
        VENDOR_OPENAI
    }
}

fn default_service_tier() -> String {
    "default".to_string()
}

/// v1 的单 provider 配置，只在迁移时读取。
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyModelSettings {
    base_url: String,
    model_id: String,
    #[serde(default, rename = "capabilityTemplate")]
    legacy_capability_template: Option<String>,
    #[serde(default)]
    reasoning_effort: Option<String>,
    #[serde(default)]
    reasoning_summary: Option<String>,
    #[serde(default)]
    verbosity: Option<String>,
    #[serde(default = "default_service_tier")]
    service_tier: String,
}

/// 把 v1 配置转换成等效的单个渠道，并返回新渠道标识用于迁移密钥。
fn migrate_legacy_settings(legacy: LegacyModelSettings) -> (ModelSettings, String) {
    let base_url = legacy.base_url.trim().to_string();
    let vendor = vendor_for_base_url(&base_url);
    let channel_id = generate_channel_id(vendor, &[]);
    let reduced = legacy.legacy_capability_template.as_deref() == Some("openai-compatible-basic");
    let conversation = ChannelConversationSettings {
        model_id: Some(legacy.model_id.trim().to_string()).filter(|value| !value.is_empty()),
        reasoning_effort: if reduced { None } else { legacy.reasoning_effort },
        reasoning_summary: legacy.reasoning_summary,
        verbosity: if reduced { None } else { legacy.verbosity },
        service_tier: legacy.service_tier,
    };
    let channel = Channel {
        id: channel_id.clone(),
        vendor: vendor.to_string(),
        name: "默认渠道".to_string(),
        base_url,
        catalog: ChannelCatalog::VendorDefault,
        conversation,
    };
    (
        ModelSettings {
            schema_version: SETTINGS_SCHEMA_VERSION,
            active_channel_id: Some(channel_id.clone()),
            channels: vec![channel],
        },
        channel_id,
    )
}

fn normalize_conversation(conversation: &mut ChannelConversationSettings) {
    conversation.model_id = conversation
        .model_id
        .take()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    if conversation
        .reasoning_summary
        .as_deref()
        .is_some_and(|summary| !matches!(summary, "auto" | "concise" | "detailed" | "none"))
    {
        conversation.reasoning_summary = None;
    }
    if !matches!(
        conversation.service_tier.as_str(),
        "default" | "priority" | "flex"
    ) {
        conversation.service_tier = default_service_tier();
    }
}

/// 读取路径上的宽松归一化：丢弃无法使用的渠道，而不是让整个配置读取失败。
fn normalize_settings(mut settings: ModelSettings) -> ModelSettings {
    settings.schema_version = SETTINGS_SCHEMA_VERSION;
    let mut seen: Vec<String> = Vec::new();
    settings.channels.retain_mut(|channel| {
        channel.id = channel.id.trim().to_string();
        channel.name = channel.name.trim().to_string();
        channel.base_url = channel.base_url.trim().to_string();
        if channel.name.is_empty() {
            channel.name = "未命名渠道".to_string();
        }
        normalize_conversation(&mut channel.conversation);
        if channel.base_url.is_empty() || !channel_id_is_valid(&channel.id) {
            return false;
        }
        if seen.contains(&channel.id) {
            return false;
        }
        seen.push(channel.id.clone());
        true
    });
    let active_is_present = settings
        .active_channel_id
        .as_deref()
        .is_some_and(|id| settings.channels.iter().any(|channel| channel.id == id));
    if !active_is_present {
        settings.active_channel_id = settings.channels.first().map(|channel| channel.id.clone());
    }
    settings
}

/// 写入路径上的严格校验：拒绝写入任何无法还原的渠道，而不是静默丢弃。
fn validate_settings(settings: &ModelSettings) -> Result<(), String> {
    let mut seen: Vec<&str> = Vec::new();
    for channel in &settings.channels {
        if !channel_id_is_valid(channel.id.trim()) {
            return Err("渠道标识格式无效".to_string());
        }
        if seen.contains(&channel.id.trim()) {
            return Err(format!("渠道标识重复：{}", channel.id.trim()));
        }
        seen.push(channel.id.trim());
        if !KNOWN_VENDORS.contains(&channel.vendor.as_str()) {
            return Err(format!("未知的模型厂商：{}", channel.vendor));
        }
        if channel.name.trim().is_empty() {
            return Err("渠道名称不能为空".to_string());
        }
        let base_url = channel.base_url.trim();
        if base_url.is_empty() {
            return Err("渠道的 Base URL 不能为空".to_string());
        }
        if host_of(base_url).is_empty() || !base_url.contains("://") {
            return Err(format!("渠道的 Base URL 不是绝对地址：{base_url}"));
        }
    }
    if let Some(active) = settings.active_channel_id.as_deref()
        && !settings.channels.iter().any(|channel| channel.id == active)
    {
        return Err("激活渠道不存在".to_string());
    }
    Ok(())
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

fn write_settings_file(path: &Path, settings: &ModelSettings) -> Result<(), String> {
    let directory = path
        .parent()
        .ok_or_else(|| "模型配置路径缺少父目录".to_string())?;
    fs::create_dir_all(directory).map_err(|error| format!("创建配置目录失败：{error}"))?;
    let contents = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("序列化模型配置失败：{error}"))?;
    fs::write(path, contents).map_err(|error| format!("写入模型配置失败：{error}"))
}

/// 迁移成功才落盘，并保留一份 v1 备份；落盘失败不影响本次会话使用迁移结果。
fn persist_migration(path: &Path, legacy_contents: &str, settings: &ModelSettings) {
    let Some(directory) = path.parent() else {
        return;
    };
    if fs::create_dir_all(directory).is_err() {
        return;
    }
    let backup = directory.join(LEGACY_BACKUP_FILE_NAME);
    if !backup.exists() && fs::write(&backup, legacy_contents).is_err() {
        return;
    }
    let _ = write_settings_file(path, settings);
}

pub fn read_settings(app: &AppHandle) -> Result<ModelSettings, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(default_settings());
    }
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("读取模型配置失败（{}）：{error}", path.display()))?;
    let value: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|error| format!("模型配置格式无效：{error}"))?;
    let version = value
        .get("schemaVersion")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(1);
    if version >= u64::from(SETTINGS_SCHEMA_VERSION) {
        let settings: ModelSettings = serde_json::from_value(value)
            .map_err(|error| format!("模型配置格式无效：{error}"))?;
        return Ok(normalize_settings(settings));
    }
    let legacy: LegacyModelSettings = serde_json::from_value(value)
        .map_err(|error| format!("旧版模型配置格式无效：{error}"))?;
    let (settings, channel_id) = migrate_legacy_settings(legacy);
    if let Err(error) = crate::credentials::migrate_legacy_channel_secret(&channel_id) {
        // 密钥迁移失败不阻断启动：用户仍可以在设置中为渠道重新保存密钥。
        eprintln!("Codex Shell: {error}");
    }
    persist_migration(&path, &contents, &settings);
    Ok(settings)
}

#[tauri::command]
pub fn load_model_settings(app: AppHandle) -> Result<ModelSettings, String> {
    read_settings(&app)
}

#[tauri::command]
pub fn save_model_settings(app: AppHandle, settings: ModelSettings) -> Result<(), String> {
    validate_settings(&settings)?;
    let settings = normalize_settings(settings);
    write_settings_file(&config_path(&app)?, &settings)
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

#[cfg(test)]
#[path = "config_tests.rs"]
mod tests;