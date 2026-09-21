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
        "plugins/cs-office/skills/cs-presentations/SKILL.md",
        "plugins/cs-office/skills/cs-template-creator/SKILL.md",
        "plugins/cs-office/scripts/render_office.py",
        "plugins/cs-office/scripts/create_template.py",
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
    prepare_marketplace(&source, &destination)?;
    Ok(destination.to_string_lossy().into_owned())
}

fn prepare_marketplace(source: &Path, destination: &Path) -> Result<(), String> {
    validate_marketplace(source)?;
    let manifest = Path::new("plugins/cs-office/.codex-plugin/plugin.json");
    if destination.exists() {
        let current = fs::read(destination.join(manifest))
            .map_err(|error| format!("读取现有办公目录版本失败：{error}"))?;
        let bundled = fs::read(source.join(manifest))
            .map_err(|error| format!("读取内置办公目录版本失败：{error}"))?;
        if current == bundled {
            validate_marketplace(destination)?;
            return Ok(());
        }
    }
    let parent = destination.parent().ok_or("办公目录缺少父目录")?;
    let staging = parent.join(format!(
        ".install-{MARKETPLACE_DIRECTORY}-{}",
        chrono::Utc::now()
            .timestamp_nanos_opt()
            .ok_or("无法生成安装标识")?
    ));
    copy_directory(source, &staging)?;
    validate_marketplace(&staging)?;
    // Core persists the source location; installed plugin caches remain separate.
    let backup = parent.join(format!("{}.previous", staging.file_name().unwrap().to_string_lossy()));
    let had_previous = destination.exists();
    if had_previous {
        fs::rename(destination, &backup)
            .map_err(|error| format!("备份旧办公目录失败：{error}"))?;
    }
    if let Err(error) = fs::rename(&staging, destination) {
        if had_previous {
            fs::rename(&backup, destination)
                .map_err(|restore| format!("更新办公目录失败：{error}；恢复失败：{restore}；旧目录保留于 {}", backup.display()))?;
        }
        return Err(format!("完成内置办公插件准备失败：{error}"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refreshes_catalog_in_place_and_preserves_old_source() {
        let temporary = tempfile::tempdir().unwrap();
        let source = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../bundled/office-marketplace");
        let destination = temporary.path().join(MARKETPLACE_DIRECTORY);
        copy_directory(&source, &destination).unwrap();
        let manifest = destination.join("plugins/cs-office/.codex-plugin/plugin.json");
        fs::write(&manifest, "{\"name\":\"cs-office\",\"version\":\"old\"}").unwrap();
        fs::remove_file(destination.join("plugins/cs-office/skills/cs-presentations/SKILL.md")).unwrap();
        prepare_marketplace(&source, &destination).unwrap();
        validate_marketplace(&destination).unwrap();
        assert_eq!(fs::read(&manifest).unwrap(), fs::read(source.join("plugins/cs-office/.codex-plugin/plugin.json")).unwrap());
        assert_eq!(fs::read_dir(temporary.path()).unwrap().count(), 2);
        prepare_marketplace(&source, &destination).unwrap();
        assert_eq!(fs::read_dir(temporary.path()).unwrap().count(), 2);
    }

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
