use base64::Engine;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

const MAX_PASTED_IMAGE_BYTES: usize = 20 * 1024 * 1024;
const MAX_ENCODED_IMAGE_LENGTH: usize = MAX_PASTED_IMAGE_BYTES * 4 / 3 + 4;

fn validate_encoded_length(length: usize) -> Result<(), String> {
    if length > MAX_ENCODED_IMAGE_LENGTH {
        return Err("剪贴板图片不能超过 20 MiB".to_string());
    }
    Ok(())
}

fn extension_for_mime(mime: &str) -> Option<&'static str> {
    match mime {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        "image/bmp" => Some("bmp"),
        "image/avif" => Some("avif"),
        _ => None,
    }
}

fn decode_pasted_image(data_url: &str) -> Result<(&'static str, Vec<u8>), String> {
    let (header, payload) = data_url
        .split_once(',')
        .ok_or_else(|| "剪贴板图片数据格式无效".to_string())?;
    let mime = header
        .strip_prefix("data:")
        .and_then(|value| value.split(';').next())
        .ok_or_else(|| "剪贴板内容不是受支持的图片".to_string())?;
    let extension = extension_for_mime(mime)
        .ok_or_else(|| "剪贴板内容不是受支持的图片".to_string())?;
    if !header.split(';').any(|part| part == "base64") {
        return Err("剪贴板图片必须使用 Base64 数据".to_string());
    }
    validate_encoded_length(payload.len())?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload)
        .map_err(|error| format!("解码剪贴板图片失败：{error}"))?;
    if bytes.len() > MAX_PASTED_IMAGE_BYTES {
        return Err("剪贴板图片不能超过 20 MiB".to_string());
    }
    Ok((extension, bytes))
}

#[tauri::command]
pub fn save_pasted_image(app: AppHandle, data_url: String) -> Result<String, String> {
    let (extension, bytes) = decode_pasted_image(&data_url)?;
    let home = crate::codex_home::resolve_codex_home(&app)?;
    let directory = home.join("attachments");
    fs::create_dir_all(&directory).map_err(|error| format!("创建附件目录失败：{error}"))?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("读取系统时间失败：{error}"))?
        .as_nanos();
    let path: PathBuf = directory.join(format!("pasted-{timestamp}.{extension}"));
    fs::write(&path, bytes).map_err(|error| format!("保存剪贴板图片失败：{error}"))?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_supported_images_without_storing_the_data_url() {
        let (extension, bytes) = decode_pasted_image("data:image/png;base64,AQID").unwrap();

        assert_eq!(extension, "png");
        assert_eq!(bytes, [1, 2, 3]);
    }

    #[test]
    fn rejects_unknown_mime_invalid_base64_and_oversized_payloads() {
        assert!(decode_pasted_image("data:image/svg+xml;base64,AQID").is_err());
        assert!(decode_pasted_image("data:image/png;base64,not-base64").is_err());
        assert!(validate_encoded_length(MAX_ENCODED_IMAGE_LENGTH + 1).is_err());
    }
}
