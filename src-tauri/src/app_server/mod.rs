use crate::codex_home::resolve_codex_home;
use crate::config::{Channel, VENDOR_DEEPSEEK, read_settings};
use crate::credentials::read_channel_secret;
use crate::runtime::resolve_codex_executable;
use crate::workspace::resolve_default_project_directory;
use serde::Serialize;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter, State};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct AppServerSession {
    child: Child,
    stdin: ChildStdin,
}

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppServerProcess {
    process_id: u32,
    generation: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppServerOutput {
    process_id: u32,
    generation: u64,
    line: String,
}

impl AppServerOutput {
    fn new(process: AppServerProcess, line: String) -> Self {
        Self {
            process_id: process.process_id,
            generation: process.generation,
            line,
        }
    }
}

#[derive(Default)]
pub struct AppServerState {
    session: Mutex<Option<AppServerSession>>,
    next_generation: AtomicU64,
}

impl Drop for AppServerState {
    fn drop(&mut self) {
        let Ok(session) = self.session.get_mut() else {
            return;
        };
        if let Some(mut current) = session.take() {
            let _ = current.child.kill();
            let _ = current.child.wait();
        }
    }
}

#[tauri::command]
pub fn app_server_start(
    app: AppHandle,
    state: State<'_, AppServerState>,
) -> Result<AppServerProcess, String> {
    let mut session = state
        .session
        .lock()
        .map_err(|_| "app-server 状态锁已损坏".to_string())?;
    if let Some(current) = session.as_mut() {
        match current.child.try_wait() {
            Ok(Some(_)) => *session = None,
            Ok(None) => return Err("app-server 已经在运行".to_string()),
            Err(error) => return Err(format!("检查 app-server 状态失败：{error}")),
        }
    }

    let settings = read_settings(&app)?;
    let channel = settings
        .active_channel()
        .ok_or_else(|| "尚未配置模型渠道，请先在设置中新增渠道".to_string())?
        .clone();
    let api_key = read_channel_secret(&channel.id)?
        .ok_or_else(|| format!("渠道「{}」尚未保存 API Key", channel.name))?;
    let executable = resolve_codex_executable()?;
    let codex_home = resolve_codex_home(&app)?;
    let catalog_path = crate::catalog::materialize_catalog(&codex_home, &channel.vendor)?;
    let default_project_directory = resolve_default_project_directory(&app)?.path;
    let model = match channel.conversation.model_id.as_deref() {
        Some(model) => Some(
            serde_json::to_string(model).map_err(|error| format!("模型 ID 编码失败：{error}"))?,
        ),
        None => None,
    };
    let arguments = app_server_arguments(&channel, catalog_path.as_deref(), model.as_deref())?;

    let mut command = Command::new(&executable);
    command
        .args(arguments)
        .current_dir(&default_project_directory)
        .env("CODEX_HOME", &codex_home)
        .env("OPENAI_API_KEY", api_key)
        .envs(crate::mcp_credentials::read_environment(&codex_home)?)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command
        .spawn()
        .map_err(|error| format!("启动 {} 失败：{error}", executable.display()))?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "无法连接 app-server stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "无法连接 app-server stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "无法连接 app-server stderr".to_string())?;
    let process_id = child.id();
    let process = AppServerProcess {
        process_id,
        generation: state.next_generation.fetch_add(1, Ordering::Relaxed) + 1,
    };

    let event_app = app.clone();
    let output_process = process;
    let stopped_process = process;
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = event_app.emit(
                "app-server://message",
                AppServerOutput::new(output_process, line),
            );
        }
        let _ = event_app.emit("app-server://stopped", stopped_process);
    });

    let log_process = process;
    std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            let _ = app.emit("app-server://log", AppServerOutput::new(log_process, line));
        }
    });

    *session = Some(AppServerSession { child, stdin });
    Ok(process)
}

/// 把激活渠道翻译成 app-server 启动参数。
///
/// provider 是进程级属性，切换渠道意味着重启进程，因此这里只处理单个渠道。
fn app_server_arguments(
    channel: &Channel,
    catalog_path: Option<&Path>,
    encoded_model: Option<&str>,
) -> Result<Vec<String>, String> {
    const PROVIDER_ID: &str = "codex_shell_gateway";
    let base_url = serde_json::to_string(&channel.base_url)
        .map_err(|error| format!("Base URL 编码失败：{error}"))?;
    let mut arguments = vec![
        "app-server".to_string(),
        "--stdio".to_string(),
        "-c".to_string(),
        "features.code_mode_host=true".to_string(),
    ];
    if let Some(encoded_model) = encoded_model {
        arguments.extend(["-c".to_string(), format!("model={encoded_model}")]);
    }
    arguments.extend([
        "-c".to_string(),
        format!("model_provider=\"{PROVIDER_ID}\""),
        "-c".to_string(),
        format!("model_providers.{PROVIDER_ID}.name=\"Codex Shell Gateway\""),
        "-c".to_string(),
        format!("model_providers.{PROVIDER_ID}.base_url={base_url}"),
        "-c".to_string(),
        format!("model_providers.{PROVIDER_ID}.wire_api=\"responses\""),
        "-c".to_string(),
        format!("model_providers.{PROVIDER_ID}.env_key=\"OPENAI_API_KEY\""),
        "-c".to_string(),
        format!("model_providers.{PROVIDER_ID}.requires_openai_auth=false"),
    ]);
    if let Some(catalog_path) = catalog_path {
        let encoded = serde_json::to_string(&catalog_path.to_string_lossy())
            .map_err(|error| format!("模型目录路径编码失败：{error}"))?;
        arguments.extend(["-c".to_string(), format!("model_catalog_json={encoded}")]);
    }
    if channel.vendor == VENDOR_DEEPSEEK {
        arguments.extend(["-c".to_string(), "web_search=\"disabled\"".to_string()]);
    }
    let conversation = &channel.conversation;
    if let Some(reasoning_effort) = &conversation.reasoning_effort {
        arguments.extend([
            "-c".to_string(),
            format!("model_reasoning_effort={reasoning_effort}"),
        ]);
    }
    if let Some(reasoning_summary) = &conversation.reasoning_summary {
        arguments.extend([
            "-c".to_string(),
            format!("model_reasoning_summary={reasoning_summary}"),
        ]);
    }
    if let Some(verbosity) = &conversation.verbosity {
        arguments.extend(["-c".to_string(), format!("model_verbosity={verbosity}")]);
    }
    if !conversation.service_tier.is_empty() {
        arguments.extend([
            "-c".to_string(),
            format!("service_tier=\"{}\"", conversation.service_tier),
        ]);
    }
    Ok(arguments)
}

#[tauri::command]
pub fn app_server_send(line: String, state: State<'_, AppServerState>) -> Result<(), String> {
    let mut session = state
        .session
        .lock()
        .map_err(|_| "app-server 状态锁已损坏".to_string())?;
    let session = session
        .as_mut()
        .ok_or_else(|| "app-server 尚未启动".to_string())?;
    writeln!(session.stdin, "{line}")
        .map_err(|error| format!("发送 app-server 消息失败：{error}"))?;
    session
        .stdin
        .flush()
        .map_err(|error| format!("刷新 app-server stdin 失败：{error}"))
}

#[tauri::command]
pub fn app_server_stop(state: State<'_, AppServerState>) -> Result<(), String> {
    let mut session = state
        .session
        .lock()
        .map_err(|_| "app-server 状态锁已损坏".to_string())?;
    if let Some(mut current) = session.take() {
        current
            .child
            .kill()
            .map_err(|error| format!("停止 app-server 失败：{error}"))?;
        current
            .child
            .wait()
            .map_err(|error| format!("等待 app-server 退出失败：{error}"))?;
    }
    Ok(())
}

#[cfg(test)]
#[path = "app_server_tests.rs"]
mod tests;
