use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub const SKILL_NAME: &str = "image-gen";

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

fn source(app: &AppHandle) -> Result<PathBuf, String> {
    let bundled = app
        .path()
        .resource_dir()
        .map_err(|error| format!("无法解析内置 Skill 资源目录：{error}"))?
        .join("skills")
        .join(SKILL_NAME);
    let source = if bundled.is_dir() {
        bundled
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("bundled")
            .join("skills")
            .join(SKILL_NAME)
    };
    if !source.is_dir() {
        return Err(format!("找不到内置 Skill：{}", source.display()));
    }
    Ok(source)
}

#[tauri::command]
pub fn install_builtin_skill(app: AppHandle) -> Result<String, String> {
    let source = source(&app)?;
    let codex_home = crate::codex_home::resolve_codex_home(&app)?;
    let root = codex_home.join("skills");
    fs::create_dir_all(&root).map_err(|error| format!("创建 Skill 目录失败：{error}"))?;
    let destination = root.join(SKILL_NAME);
    if destination.exists() {
        return Err("image-gen Skill 已安装".into());
    }
    let staging = root.join(format!(".install-{SKILL_NAME}-{}", chrono::Utc::now().timestamp_nanos_opt().ok_or("无法生成安装标识")?));
    copy_directory(&source, &staging)?;
    fs::rename(&staging, &destination).map_err(|error| format!("完成 Skill 安装失败：{error}"))?;
    Ok(destination.join("SKILL.md").to_string_lossy().into_owned())
}
