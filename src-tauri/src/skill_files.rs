use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

fn plain_directory(path: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path).map_err(|e| format!("无法读取技能目录：{e}"))?;
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 { return Err("技能目录不能是链接或联接点".into()); }
    }
    if !metadata.is_dir() || metadata.file_type().is_symlink() { return Err("技能路径必须是普通目录".into()); }
    Ok(())
}

fn owned_skill(root: &Path, skill_path: &Path) -> Result<PathBuf, String> {
    plain_directory(root)?;
    if skill_path.file_name().and_then(|s| s.to_str()) != Some("SKILL.md") { return Err("必须选择 SKILL.md".into()); }
    let directory = skill_path.parent().ok_or("技能路径无效")?;
    plain_directory(directory)?;
    let resolved = directory.canonicalize().map_err(|e| e.to_string())?;
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    if resolved.parent() != Some(root.as_path()) || resolved.file_name().is_none_or(|s| s.to_string_lossy().starts_with('.')) {
        return Err("只能卸载 CS 用户技能目录中的独立技能，不能卸载项目、系统或插件技能".into());
    }
    Ok(resolved)
}

fn copy_skill(source: &Path, destination: &Path, count: &mut usize, bytes: &mut u64) -> Result<(), String> {
    plain_directory(source)?;
    fs::create_dir(destination).map_err(|e| format!("创建安装目录失败：{e}"))?;
    for item in fs::read_dir(source).map_err(|e| e.to_string())? {
        let item = item.map_err(|e| e.to_string())?;
        *count += 1;
        if *count > 1000 { return Err("技能目录超过 1000 个文件或目录".into()); }
        let metadata = fs::symlink_metadata(item.path()).map_err(|e| e.to_string())?;
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            if metadata.file_attributes() & 0x400 != 0 { return Err("不支持安装包含链接或联接点的技能".into()); }
        }
        if metadata.file_type().is_symlink() { return Err("不支持安装包含链接的技能".into()); }
        let target = destination.join(item.file_name());
        if metadata.is_dir() { copy_skill(&item.path(), &target, count, bytes)?; }
        else if metadata.is_file() {
            *bytes += metadata.len();
            if *bytes > 20 * 1024 * 1024 { return Err("技能安装内容超过 20 MiB".into()); }
            fs::copy(item.path(), target).map_err(|e| e.to_string())?;
        } else { return Err("技能目录包含不支持的文件类型".into()); }
    }
    Ok(())
}

#[tauri::command]
pub fn install_local_skill(app: AppHandle, source: PathBuf) -> Result<(), String> {
    plain_directory(&source)?;
    if !source.join("SKILL.md").is_file() { return Err("所选目录缺少 SKILL.md".into()); }
    let name = source.file_name().and_then(|s| s.to_str()).ok_or("技能目录名称无效")?;
    if name.starts_with('.') { return Err("不能安装隐藏目录或系统技能目录".into()); }
    let home = crate::codex_home::resolve_codex_home(&app)?;
    let root = home.join("skills");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    plain_directory(&root)?;
    let destination = root.join(name);
    if destination.exists() { return Err("同名技能已存在，请先卸载或使用其他目录名".into()); }
    let staging = home.join(format!("skill-install-{}", chrono::Utc::now().timestamp_nanos_opt().ok_or("无法生成安装标识")?));
    if let Err(error) = copy_skill(&source, &staging, &mut 0, &mut 0) {
        return Err(format!("安装失败：{error}。临时内容保留在 {}，可手动删除。", staging.display()));
    }
    if destination.exists() { return Err("安装期间出现同名技能，未覆盖现有内容".into()); }
    fs::rename(&staging, destination).map_err(|e| format!("完成技能安装失败：{e}"))
}

#[tauri::command]
pub fn uninstall_local_skill(app: AppHandle, path: PathBuf) -> Result<String, String> {
    let home = crate::codex_home::resolve_codex_home(&app)?;
    let directory = owned_skill(&home.join("skills"), &path)?;
    let trash = home.join("uninstalled-skills");
    fs::create_dir_all(&trash).map_err(|e| e.to_string())?;
    plain_directory(&trash)?;
    let target = trash.join(format!("{}-{}", directory.file_name().ok_or("技能名称无效")?.to_string_lossy(), chrono::Utc::now().timestamp_nanos_opt().ok_or("无法生成卸载标识")?));
    fs::rename(&directory, &target).map_err(|e| format!("卸载技能失败：{e}"))?;
    Ok(target.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ownership_requires_direct_non_system_child() {
        let temporary = std::env::temp_dir().join(format!("cs-skill-test-{}", chrono::Utc::now().timestamp_nanos_opt().unwrap()));
        let root = temporary.join("skills");
        for child in ["demo", ".system", "nested/demo"] { fs::create_dir_all(root.join(child)).unwrap(); }
        assert!(owned_skill(&root, &root.join("demo/SKILL.md")).is_ok());
        assert!(owned_skill(&root, &root.join(".system/SKILL.md")).is_err());
        assert!(owned_skill(&root, &root.join("nested/demo/SKILL.md")).is_err());
        assert!(owned_skill(&root, &temporary.join("SKILL.md")).is_err());
        fs::remove_dir_all(temporary).unwrap();
    }
}
