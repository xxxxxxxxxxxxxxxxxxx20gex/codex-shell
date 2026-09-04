# Codex Runtime 状态

- 模块职责：动态发现、兼容性验证、启动、停止并最终打包 `codex.exe` 及其同源 companion binaries。
- 当前状态：公开 `v0.1.2` 安装包已暂存并验证 `codex-cli 0.153.0-alpha.5` Runtime、Code Mode Host 及 elevated Windows Sandbox 的同目录 helper；manifest 记录实际版本和哈希，进程、认证和数据目录隔离已完成，NSIS 安装包可生成。设置中的“检查更新”会打开官方 GitHub 最新 Release 页面；在配置签名密钥和更新端点前，不执行静默替换。该 Runtime 通过现有协议兼容门禁，但上游版本仍带有 alpha 标识。
- 最近变更：Runtime staging 不再要求与历史 manifest 完全匹配，改为运行 app-server 协议兼容门禁，允许新增协议并阻止当前调用面被删除；主 Runtime 与三个 helper 必须来自同一目录并分别校验 SHA-256。生成协议同步升级仍由 `pnpm protocol:generate` 显式触发。首条消息进入目标模式时，前端先创建普通 Session，再通过原生 `thread/goal/set` 写入目标，随后启动同一条 Turn，不再要求用户先发送无关消息。独立 `/` 仍直接唤出 Skills、MCP、计划和目标等命令菜单。每次 app-server 启动仍以进程代际隔离旧 reader 线程事件。首次启动会等待持久化模型网关、个性化和默认目录配置读取完成后再加载历史，避免 app-server 以默认网关抢先启动；高级网关设置保存后的重启也在新状态提交后执行。
- 当前接口：`resolve_codex_executable`、`resolve_codex_home`、`set_codex_home`、`resolve_default_project_directory`、返回进程身份的 `app_server_start`、`app_server_stop`。
- 路径边界：应用配置仍由 Tauri `app_config_dir` 计算；CODEX_HOME 默认由用户目录动态拼接为 `.codex-shell`；默认项目目录由系统文档已知目录动态拼接为 `Codex-Shell/YYYY-MM-DD`；Thread 的执行目录仍由 `thread/start.cwd` 决定，源码不包含开发机仓库绝对路径。
- 认证边界：app-server 使用独立 `codex_shell_gateway` provider，`env_key=OPENAI_API_KEY` 且 `requires_openai_auth=false`，只从当前进程注入的用户凭据读取，不继承宿主 Codex 登录状态。
- 已知问题：Runtime 二进制被 Git 忽略，公开仓库尚无可复现自动下载/构建流程；兼容门禁覆盖现有生成文件、方法、通知和反向请求保留，但不替代真实 smoke；旧 CODEX_HOME 迁移仍依赖同卷 `rename`，跨卷用户目录需要单独的可恢复复制方案；安装包中的 elevated UAC 实际设置流程、进程崩溃后的自动恢复尚未验证。实时 stderr 仅保存在当前窗口的有界内存中，应用退出后仍以 Core 的 SQLite 日志为长期诊断来源。
- 下一步：建立可复现的 Runtime 获取/校验流程，在干净 Windows 用户环境验证更新后的 UAC、sandbox readiness 和 elevated 命令执行闭环，并把协议兼容门禁纳入 CI。
- 验证证据：2026-09-04，`codex-cli 0.153.0-alpha.5` 与同目录 helper 通过协议兼容门禁并写入 manifest；真实第三方网关探针在低推理模式下产生两次 `commandExecution` 并完成 Turn。独立 Cargo target 中 `cargo check`、14 项 Rust 单元测试和严格 Clippy 均通过；配置就绪闸门与延迟重启由前端回归测试覆盖。
- 相关决策：[ADR-001：使用原版 Codex app-server](../decisions/ADR-001-unmodified-codex-app-server.md)、[ADR-002：隔离运行数据与凭据](../decisions/ADR-002-isolated-runtime-data.md)。
- 最后更新：2026-09-04
