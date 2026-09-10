use std::collections::BTreeMap;
use std::sync::Mutex;

const SERVICE: &str = "com.codexshell.desktop";
const CHANNEL_SECRETS_ACCOUNT: &str = "provider-channel-credentials";
const LEGACY_API_KEY_ACCOUNT: &str = "primary-openai-api-key";

static WRITE_LOCK: Mutex<()> = Mutex::new(());

fn entry(account: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, account)
        .map_err(|error| format!("无法访问 Windows 凭据管理器：{error}"))
}

/// 渠道标识同时用作凭据映射的键，因此必须先于任何读写被校验。
pub fn channel_id_is_valid(channel_id: &str) -> bool {
    if channel_id.is_empty() || channel_id.len() > 64 {
        return false;
    }
    let mut characters = channel_id.chars();
    let Some(first) = characters.next() else {
        return false;
    };
    if !(first.is_ascii_lowercase() || first.is_ascii_digit()) {
        return false;
    }
    characters.all(|character| {
        character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-'
    })
}

fn read_channel_secrets() -> Result<BTreeMap<String, String>, String> {
    match entry(CHANNEL_SECRETS_ACCOUNT)?.get_password() {
        Ok(value) => {
            serde_json::from_str(&value).map_err(|_| "渠道密钥存储格式无效".to_string())
        }
        Err(keyring::Error::NoEntry) => Ok(BTreeMap::new()),
        Err(_) => Err("无法读取渠道密钥存储".to_string()),
    }
}

fn write_channel_secrets(values: &BTreeMap<String, String>) -> Result<(), String> {
    let entry = entry(CHANNEL_SECRETS_ACCOUNT)?;
    if values.is_empty() {
        return match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("无法删除渠道密钥".to_string()),
        };
    }
    let encoded =
        serde_json::to_string(values).map_err(|_| "渠道密钥序列化失败".to_string())?;
    entry
        .set_password(&encoded)
        .map_err(|_| "无法保存渠道密钥（可能超过凭据存储容量）".to_string())
}

pub fn read_channel_secret(channel_id: &str) -> Result<Option<String>, String> {
    if !channel_id_is_valid(channel_id) {
        return Err("渠道标识格式无效".to_string());
    }
    Ok(read_channel_secrets()?.get(channel_id).cloned())
}

#[tauri::command]
pub fn save_channel_secret(channel_id: String, secret: Option<String>) -> Result<(), String> {
    if !channel_id_is_valid(&channel_id) {
        return Err("渠道标识格式无效".to_string());
    }
    if secret
        .as_ref()
        .is_some_and(|value| value.trim().is_empty() || value.contains(['\r', '\n', '\0']))
    {
        return Err("API Key 不能为空或包含换行符".to_string());
    }
    let _guard = WRITE_LOCK
        .lock()
        .map_err(|_| "渠道密钥存储锁不可用".to_string())?;
    let mut values = read_channel_secrets()?;
    match secret {
        Some(secret) => {
            values.insert(channel_id, secret.trim().to_string());
        }
        None => {
            values.remove(&channel_id);
        }
    }
    write_channel_secrets(&values)
}

/// 只报告哪些渠道已经保存密钥，不返回密钥本身。
#[tauri::command]
pub fn channel_secret_presence() -> Result<Vec<String>, String> {
    Ok(read_channel_secrets()?.into_keys().collect())
}
/// 把 v1 的单条 API Key 迁移到首个渠道。
///
/// 没有旧密钥不是错误；已经存在同渠道密钥时不覆盖。迁移成功后删除旧条目，
/// 删除失败只报告而不回滚，避免迁移过程中丢失用户密钥。
pub fn migrate_legacy_channel_secret(channel_id: &str) -> Result<(), String> {
    if !channel_id_is_valid(channel_id) {
        return Err("渠道标识格式无效".to_string());
    }
    let _guard = WRITE_LOCK
        .lock()
        .map_err(|_| "渠道密钥存储锁不可用".to_string())?;
    let legacy = match entry(LEGACY_API_KEY_ACCOUNT)?.get_password() {
        Ok(value) => value,
        Err(keyring::Error::NoEntry) => return Ok(()),
        Err(_) => return Err("无法读取旧版 API Key".to_string()),
    };
    let mut values = read_channel_secrets()?;
    values.entry(channel_id.to_string()).or_insert(legacy);
    write_channel_secrets(&values)?;
    match entry(LEGACY_API_KEY_ACCOUNT)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("旧版 API Key 已迁移，但未能删除原条目".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::channel_id_is_valid;

    #[test]
    fn accepts_generated_channel_ids() {
        assert!(channel_id_is_valid("openai-3f9a1c02"));
        assert!(channel_id_is_valid("deepseek-0a1b2c3d"));
        assert!(channel_id_is_valid("a"));
        assert!(channel_id_is_valid(&"a".repeat(64)));
    }

    #[test]
    fn rejects_ids_that_could_pollute_the_secret_map() {
        for channel_id in [
            "",
            "-leading-dash",
            "Openai-3f9a1c02",
            "openai-3f9a1c02 ",
            "openai_3f9a1c02",
            "openai.3f9a1c02",
            "openai/../x",
            "openai\n",
        ] {
            assert!(
                !channel_id_is_valid(channel_id),
                "expected {channel_id:?} to be rejected"
            );
        }
        assert!(!channel_id_is_valid(&"a".repeat(65)));
    }
}