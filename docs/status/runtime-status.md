# Codex Runtime 状态

- 模块职责：动态发现、验证、启动、停止并最终打包固定版本 `codex.exe`。
- 当前状态：固定 Runtime 已 staged，进程、认证和数据目录隔离已完成，安装包验证未完成。
- 最近变更：确认原版 app-server 已在隔离 CODEX_HOME 中原生维护 `logs_2.sqlite` 结构化 tracing 日志和 `sessions/YYYY/MM/DD/rollout-*.jsonl` 会话事件；Tauri 转发的 `app-server://log` stderr 现在由前端独立外部 Store 有界消费，仍不重复写一套普通文本日志，也不会在日志页关闭时触发主对话树刷新。
- 当前接口：`resolve_codex_executable`、`resolve_codex_home`、`set_codex_home`、`resolve_default_workspace`、`app_server_start`、`app_server_stop`。
- 路径边界：应用配置仍由 Tauri `app_config_dir` 计算；CODEX_HOME 默认由用户目录动态拼接为 `.codex-shell`；默认工作区由系统文档已知目录动态拼接为 `Codex-Shell/YYYY-MM-DD`；自定义值规范化为绝对路径，源码不包含开发机仓库绝对路径。
- 认证边界：app-server 使用独立 `codex_shell_gateway` provider，`env_key=OPENAI_API_KEY` 且 `requires_openai_auth=false`，只从当前进程注入的用户凭据读取，不继承宿主 Codex 登录状态。
- 已知问题：Runtime 二进制被 Git 忽略，公开仓库尚无可复现自动下载/构建流程；PATH 回退 Runtime 尚未验证与生成协议的版本/hash；旧 CODEX_HOME 迁移仍依赖同卷 `rename`，跨卷用户目录需要单独的可恢复复制方案；旧进程的 `stopped` 事件不携带 PID/代际，快速重启存在误伤新连接的竞态；installer sidecar 与崩溃恢复未验证。实时 stderr 仅保存在当前窗口的有界内存中，应用退出后仍以 Core 的 SQLite 日志为长期诊断来源。
- 下一步：在当前本机自动发现/复制策略稳定后，建立固定上游版本的 `runtime:fetch` 或 `runtime:build`，并验证安装后的 sidecar 同目录解析。
- 验证证据：9 项 Rust 单元测试通过，其中覆盖动态 Runtime、CODEX_HOME 迁移与隔离，以及系统文档目录下的产品独立每日工作区命名；真实 app-server 使用独立 provider 完成 turn。新默认目录的安装后 smoke 尚待桌面程序重启验证。
- 最后更新：2026-08-10
