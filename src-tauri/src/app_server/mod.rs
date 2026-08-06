use crate::config::read_settings;
use crate::credentials::read_api_key;
use crate::runtime::resolve_codex_executable;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

struct AppServerSession {
    child: Child,
    stdin: ChildStdin,
}

#[derive(Default)]
pub struct AppServerState {
    session: Mutex<Option<AppServerSession>>,
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
pub fn app_server_start(app: AppHandle, state: State<'_, AppServerState>) -> Result<u32, String> {
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
    let api_key = read_api_key()?;
    let (executable, _) = resolve_codex_executable();
    let model = serde_json::to_string(&settings.model_id)
        .map_err(|error| format!("模型 ID 编码失败：{error}"))?;
    let base_url = serde_json::to_string(&settings.base_url)
        .map_err(|error| format!("Base URL 编码失败：{error}"))?;
    let mut arguments = vec![
        "app-server".to_string(),
        "--stdio".to_string(),
        "-c".to_string(),
        format!("model={model}"),
        "-c".to_string(),
        format!("openai_base_url={base_url}"),
    ];
    if settings.capability_template != "openai-compatible-basic" {
        if let Some(reasoning_effort) = settings.reasoning_effort {
            arguments.extend([
                "-c".to_string(),
                format!("model_reasoning_effort={reasoning_effort}"),
            ]);
        }
        if let Some(verbosity) = settings.verbosity {
            arguments.extend(["-c".to_string(), format!("model_verbosity={verbosity}")]);
        }
    }

    let mut child = Command::new(&executable)
        .args(arguments)
        .env("OPENAI_API_KEY", api_key)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
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

    let event_app = app.clone();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = event_app.emit("app-server://message", line);
        }
        let _ = event_app.emit("app-server://stopped", ());
    });

    std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            let _ = app.emit("app-server://log", line);
        }
    });

    *session = Some(AppServerSession { child, stdin });
    Ok(process_id)
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
