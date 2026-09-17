use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const MARKETPLACE_DIRECTORY: &str = "office-marketplace-0.1.0";

fn copy_directory(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|error| format!("创建内置插件目录失败：{error}"))?;
    for entry in fs::read_dir(source).map_err(|error| format!("读取内置插件失败：{error}"))?
    {
        let entry = entry.map_err(|error| format!("读取内置插件项失败：{error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        let metadata = fs::symlink_metadata(&source_path)
            .map_err(|error| format!("读取内置插件项元数据失败：{error}"))?;
        if metadata.file_type().is_symlink() {
            return Err(format!(
                "内置插件包含不支持的链接：{}",
                source_path.display()
            ));
        }
        if metadata.is_dir() {
            copy_directory(&source_path, &destination_path)?;
        } else if metadata.is_file() {
            fs::copy(&source_path, &destination_path)
                .map_err(|error| format!("复制内置插件文件失败：{error}"))?;
        } else {
            return Err(format!(
                "内置插件包含不支持的文件：{}",
                source_path.display()
            ));
        }
    }
    Ok(())
}

fn validate_marketplace(root: &Path) -> Result<(), String> {
    let required = [
        ".agents/plugins/marketplace.json",
        "plugins/cs-office/.codex-plugin/plugin.json",
        "plugins/cs-office/skills/cs-pdf/SKILL.md",
        "plugins/cs-office/skills/cs-documents/SKILL.md",
        "plugins/cs-office/skills/cs-spreadsheets/SKILL.md",
    ];
    for relative in required {
        if !root.join(relative).is_file() {
            return Err(format!("内置办公插件缺少文件：{relative}"));
        }
    }
    Ok(())
}

fn source(app: &AppHandle) -> Result<PathBuf, String> {
    let bundled = app
        .path()
        .resource_dir()
        .map_err(|error| format!("无法解析内置插件资源目录：{error}"))?
        .join("office-marketplace");
    let source = if bundled.is_dir() {
        bundled
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("bundled")
            .join("office-marketplace")
    };
    validate_marketplace(&source)?;
    Ok(source)
}

#[tauri::command]
pub fn prepare_builtin_office_plugin(app: AppHandle) -> Result<String, String> {
    let source = source(&app)?;
    let codex_home = crate::codex_home::resolve_codex_home(&app)?;
    let parent = codex_home.join("codex-shell");
    fs::create_dir_all(&parent).map_err(|error| format!("创建内置插件数据目录失败：{error}"))?;
    let destination = parent.join(MARKETPLACE_DIRECTORY);
    if destination.exists() {
        validate_marketplace(&destination)?;
        return Ok(destination.to_string_lossy().into_owned());
    }

    let staging = parent.join(format!(
        ".install-{MARKETPLACE_DIRECTORY}-{}",
        chrono::Utc::now()
            .timestamp_nanos_opt()
            .ok_or("无法生成安装标识")?
    ));
    copy_directory(&source, &staging)?;
    validate_marketplace(&staging)?;
    fs::rename(&staging, &destination)
        .map_err(|error| format!("完成内置办公插件准备失败：{error}"))?;
    Ok(destination.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundled_office_marketplace_has_required_layout() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("bundled")
            .join("office-marketplace");
        validate_marketplace(&root).unwrap();
        let marketplace: serde_json::Value = serde_json::from_str(
            &fs::read_to_string(root.join(".agents/plugins/marketplace.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(marketplace["name"], "cs-curated");
        assert_eq!(marketplace["plugins"][0]["name"], "cs-office");
    }
}
