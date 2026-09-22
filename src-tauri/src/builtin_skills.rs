use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub const SKILL_NAME: &str = "image-gen";
pub const CS_DOCS_SKILL_NAME: &str = "cs-docs";

fn copy_directory(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|error| format!("创建内置 Skill 目录失败：{error}"))?;
    for entry in fs::read_dir(source).map_err(|error| format!("读取内置 Skill 失败：{error}"))? {
        let entry = entry.map_err(|error| format!("读取内置 Skill 项失败：{error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        let metadata = fs::symlink_metadata(&source_path)
            .map_err(|error| format!("读取内置 Skill 项元数据失败：{error}"))?;
        if metadata.file_type().is_symlink() {
            return Err(format!("内置 Skill 包含不支持的链接：{}", source_path.display()));
        } else if metadata.is_dir() {
            copy_directory(&source_path, &destination_path)?;
        } else if metadata.is_file() {
            fs::copy(&source_path, &destination_path)
                .map_err(|error| format!("复制内置 Skill 文件失败：{error}"))?;
        } else {
            return Err(format!("内置 Skill 包含不支持的文件：{}", source_path.display()));
        }
    }
    Ok(())
}

fn resolve_source(resource_root: &Path, skill_name: &str, development_root: Option<&Path>) -> Result<PathBuf, String> {
    // Tauri preserves parent resource paths under _up_ (../bundled/skills).
    let bundled = resource_root
        .join("_up_")
        .join("bundled")
        .join("skills")
        .join(skill_name);
    if bundled.join("SKILL.md").is_file() {
        return Ok(bundled);
    }
    if let Some(root) = development_root {
        let candidate = root.join(skill_name);
        if candidate.join("SKILL.md").is_file() {
            return Ok(candidate);
        }
    }
    Err(format!("找不到内置 Skill：{}，请重新构建或安装应用", bundled.display()))
}

fn source(app: &AppHandle, skill_name: &str) -> Result<PathBuf, String> {
    let resource_root = app.path().resource_dir()
        .map_err(|error| format!("无法解析内置 Skill 资源目录：{error}"))?;
    #[cfg(debug_assertions)]
    let development_root = Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../bundled/skills"));
    #[cfg(not(debug_assertions))]
    let development_root: Option<PathBuf> = None;
    resolve_source(&resource_root, skill_name, development_root.as_deref())
}

fn install(app: AppHandle, skill_name: &str, label: &str) -> Result<String, String> {
    let source = source(&app, skill_name)?;
    let codex_home = crate::codex_home::resolve_codex_home(&app)?;
    let root = codex_home.join("skills");
    fs::create_dir_all(&root).map_err(|error| format!("创建 Skill 目录失败：{error}"))?;
    let destination = root.join(skill_name);
    if destination.exists() {
        return Err(format!("{label} Skill 已安装"));
    }
    let staging = root.join(format!(".install-{skill_name}-{}", chrono::Utc::now().timestamp_nanos_opt().ok_or("无法生成安装标识")?));
    copy_directory(&source, &staging)?;
    fs::rename(&staging, &destination).map_err(|error| format!("完成 Skill 安装失败：{error}"))?;
    Ok(destination.join("SKILL.md").to_string_lossy().into_owned())
}

#[tauri::command]
pub fn install_builtin_skill(app: AppHandle) -> Result<String, String> {
    install(app, SKILL_NAME, "image-gen")
}

#[tauri::command]
pub fn install_builtin_cs_docs(app: AppHandle) -> Result<String, String> {
    install(app, CS_DOCS_SKILL_NAME, "cs-docs")
}

#[tauri::command]
pub fn install_builtin_amap(app: AppHandle) -> Result<String, String> {
    install(app, "amap", "高德地图")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packaged_skills_install_without_development_source() {
        let root = tempfile::tempdir().unwrap();
        for name in ["amap", "image-gen", "cs-docs"] {
            let packaged = root.path().join("_up_/bundled/skills").join(name);
            fs::create_dir_all(packaged.join("scripts")).unwrap();
            fs::write(packaged.join("SKILL.md"), "packaged skill").unwrap();
            fs::write(packaged.join("scripts/helper.py"), "helper").unwrap();
            let source = resolve_source(root.path(), name, None).unwrap();
            assert_eq!(source, packaged);
            let installed = root.path().join("installed").join(name);
            copy_directory(&source, &installed).unwrap();
            assert_eq!(fs::read_to_string(installed.join("scripts/helper.py")).unwrap(), "helper");
        }
    }

    #[test]
    fn development_fallback_is_explicit_and_packaged_source_wins() {
        let root = tempfile::tempdir().unwrap();
        let dev = root.path().join("development");
        fs::create_dir_all(dev.join("amap")).unwrap();
        fs::write(dev.join("amap/SKILL.md"), "development").unwrap();
        assert!(resolve_source(root.path(), "amap", None).is_err());
        assert_eq!(resolve_source(root.path(), "amap", Some(&dev)).unwrap(), dev.join("amap"));
        let packaged = root.path().join("_up_/bundled/skills/amap");
        fs::create_dir_all(&packaged).unwrap();
        fs::write(packaged.join("SKILL.md"), "packaged").unwrap();
        assert_eq!(resolve_source(root.path(), "amap", Some(&dev)).unwrap(), packaged);
    }
}
