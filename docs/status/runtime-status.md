# Codex Runtime 状态

- 模块职责：动态发现、验证、启动、停止并最终打包固定版本 `codex.exe`。
- 当前状态：固定 Runtime 及 elevated Windows Sandbox 的两个同版本 helper 已 staged，进程、认证和数据目录隔离已完成，安装包验证未完成。
- 最近变更：Windows Sandbox 设置改用官方首选的 `elevated` 模式；`stage-runtime.ps1` 会从 Runtime 同目录或官方 `codex-resources` 布局动态发现 setup helper 与 command runner，缺失时立即失败，并把三个文件的 SHA-256 写入 manifest。默认 staging 会校验现有 manifest 的固定版本，拒绝 PATH Runtime 静默漂移；显式 `-Source` 才允许更新，并把临时 staging 目录校验完成后再替换现有 sidecar。Tauri 现在把两个 helper 作为 sidecar 与 `codex.exe` 同目录分发。
- 当前接口：`resolve_codex_executable`、`resolve_codex_home`、`set_codex_home`、`resolve_default_project_directory`、`app_server_start`、`app_server_stop`。
- 路径边界：应用配置仍由 Tauri `app_config_dir` 计算；CODEX_HOME 默认由用户目录动态拼接为 `.codex-shell`；默认项目目录由系统文档已知目录动态拼接为 `Codex-Shell/YYYY-MM-DD`；Thread 的执行目录仍由 `thread/start.cwd` 决定，源码不包含开发机仓库绝对路径。
- 认证边界：app-server 使用独立 `codex_shell_gateway` provider，`env_key=OPENAI_API_KEY` 且 `requires_openai_auth=false`，只从当前进程注入的用户凭据读取，不继承宿主 Codex 登录状态。
- 已知问题：Runtime 二进制被 Git 忽略，公开仓库尚无可复现自动下载/构建流程；PATH 回退 Runtime 尚未验证与生成协议的版本/hash；旧 CODEX_HOME 迁移仍依赖同卷 `rename`，跨卷用户目录需要单独的可恢复复制方案；旧进程的 `stopped` 事件不携带 PID/代际，快速重启存在误伤新连接的竞态；安装包中的 elevated UAC 实际设置流程与崩溃恢复尚未验证。实时 stderr 仅保存在当前窗口的有界内存中，应用退出后仍以 Core 的 SQLite 日志为长期诊断来源。
- 下一步：建立固定上游版本的 `runtime:fetch` 或 `runtime:build`，并在干净 Windows 用户环境验证安装包的 UAC、sandbox readiness 和 elevated 命令执行闭环。
- 验证证据：固定 `codex-cli 0.146.0-alpha.9.2` Runtime 恢复为原 manifest hash；两个同版本 helper 已通过 npm 官方包 integrity 与独立 SHA-256 校验。Tauri debug 产物目录同时包含 `codex.exe`、setup helper 和 command runner，文件 hash 与 manifest 一致；9 项 Rust 单元测试继续通过。阶段性代码健康审查未发现可安全删除的业务死代码；Knip 无未使用文件、导出或依赖，事件/定时器/Store 清理路径均有静态证据。
- 最后更新：2026-08-12
