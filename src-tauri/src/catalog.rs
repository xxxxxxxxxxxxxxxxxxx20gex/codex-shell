use std::fs;
use std::path::{Path, PathBuf};

use crate::config::VENDOR_DEEPSEEK;

/// DeepSeek 官方 Codex 模型目录，随应用编译进二进制。
///
/// 来源：https://cdn.deepseek.com/api-docs/codex-deepseek-setup-en.ps1（`$ModelsJson`），
/// 获取日期 2026-09-10。Codex 只接受 `model_catalog_json` 指向的文件，因此启动时
/// 把它物化到 Codex Shell 自己的数据目录，避免依赖安装包资源路径。
const DEEPSEEK_CATALOG: &str = include_str!("../../assets/catalogs/deepseek-models.json");

/// 返回该厂商需要注入的模型目录路径；使用 Core 内置目录的厂商返回 `None`。
pub fn materialize_catalog(codex_home: &Path, vendor: &str) -> Result<Option<PathBuf>, String> {
    if vendor != VENDOR_DEEPSEEK {
        return Ok(None);
    }
    let directory = codex_home.join("codex-shell");
    fs::create_dir_all(&directory)
        .map_err(|error| format!("创建模型目录失败（{}）：{error}", directory.display()))?;
    let path = directory.join("deepseek-models.json");
    let current = fs::read_to_string(&path).ok();
    if current.as_deref() != Some(DEEPSEEK_CATALOG) {
        fs::write(&path, DEEPSEEK_CATALOG)
            .map_err(|error| format!("写入模型目录失败（{}）：{error}", path.display()))?;
    }
    Ok(Some(path))
}