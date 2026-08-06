const SERVICE: &str = "com.wujieai.codexshell";
const API_KEY_ACCOUNT: &str = "primary-openai-api-key";

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, API_KEY_ACCOUNT)
        .map_err(|error| format!("无法访问 Windows 凭据管理器：{error}"))
}

pub fn read_api_key() -> Result<String, String> {
    entry()?
        .get_password()
        .map_err(|error| format!("尚未保存 API Key，或读取失败：{error}"))
}

#[tauri::command]
pub fn save_api_key(api_key: String) -> Result<(), String> {
    if api_key.trim().is_empty() {
        return Err("API Key 不能为空".to_string());
    }
    entry()?
        .set_password(api_key.trim())
        .map_err(|error| format!("保存 API Key 失败：{error}"))
}

#[tauri::command]
pub fn has_api_key() -> bool {
    read_api_key().is_ok()
}

#[tauri::command]
pub fn clear_api_key() -> Result<(), String> {
    entry()?
        .delete_credential()
        .map_err(|error| format!("删除 API Key 失败：{error}"))
}
