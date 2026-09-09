use std::collections::BTreeMap;
use std::path::Path;
use std::sync::Mutex;
use tauri::AppHandle;

static WRITE_LOCK: Mutex<()> = Mutex::new(());

fn entry(home: &Path) -> Result<keyring::Entry, String> {
    let account = format!("mcp:{}", home.to_string_lossy().to_lowercase());
    keyring::Entry::new("com.codexshell.desktop", &account)
        .map_err(|_| "无法打开 MCP 凭据存储".to_string())
}

pub fn read_environment(home: &Path) -> Result<BTreeMap<String, String>, String> {
    let value = match entry(home)?.get_password() {
        Ok(value) => value,
        Err(keyring::Error::NoEntry) => return Ok(BTreeMap::new()),
        Err(_) => return Err("无法读取 MCP 凭据存储".to_string()),
    };
    let entries: BTreeMap<String, String> = serde_json::from_str(&value)
        .map_err(|_| "MCP 凭据存储格式无效".to_string())?;
    entries.into_iter().map(|(name, value)| Ok((environment_name(&name)?, value))).collect()
}

fn environment_name(name: &str) -> Result<String, String> {
    if name.is_empty() || name.len() > 64 || !name.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-') {
        return Err("MCP 服务器名称格式无效".to_string());
    }
    Ok(format!("CS_MCP_{}", name.bytes().map(|c| format!("{c:02X}")).collect::<String>()))
}

#[tauri::command]
pub fn save_mcp_secret(app: AppHandle, name: String, secret: Option<String>) -> Result<(), String> {
    environment_name(&name)?;
    if secret.as_ref().is_some_and(|value| value.is_empty() || value.contains(['\r', '\n', '\0'])) {
        return Err("Token 不能为空或包含换行符".to_string());
    }
    let _guard = WRITE_LOCK.lock().map_err(|_| "MCP 凭据存储锁不可用".to_string())?;
    let home = crate::codex_home::resolve_codex_home(&app)?;
    let entry = entry(&home)?;
    let mut values: BTreeMap<String, String> = match entry.get_password() {
        Ok(value) => serde_json::from_str(&value).map_err(|_| "MCP 凭据存储格式无效".to_string())?,
        Err(keyring::Error::NoEntry) => BTreeMap::new(),
        Err(_) => return Err("无法读取 MCP 凭据存储".to_string()),
    };
    if let Some(secret) = secret { values.insert(name, secret); } else { values.remove(&name); }
    if values.is_empty() {
        match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err("无法删除 MCP 凭据".to_string()),
        }
    } else {
        let encoded = serde_json::to_string(&values).map_err(|_| "MCP 凭据序列化失败".to_string())?;
        entry.set_password(&encoded).map_err(|_| "无法保存 MCP 凭据（可能超过凭据存储容量）".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn names_cannot_override_process_environment() {
        assert_eq!(environment_name("Ab-c").unwrap(), "CS_MCP_41622D63");
        assert_ne!(environment_name("a").unwrap(), environment_name("A").unwrap());
        for name in ["", "../x", "x.y", "x=y", "x\0"] { assert!(environment_name(name).is_err()); }
    }
}
