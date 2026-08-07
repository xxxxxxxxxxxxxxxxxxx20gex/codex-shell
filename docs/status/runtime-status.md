# Codex Runtime 状态

- 模块职责：动态发现、验证、启动、停止并最终打包固定版本 `codex.exe`。
- 当前状态：固定 Runtime 已 staged，进程、认证和数据目录隔离已完成，安装包验证未完成。
- 最近变更：Runtime 不再返回未经验证的字符串路径；`CODEX_SHELL_RUNTIME` 支持文件或目录及相对路径，之后检查当前桌面程序同目录的 `codex.exe`，最后逐项扫描 PATH；命中后规范化为绝对路径。代码审查移除了调用方从未使用的 Runtime 来源标签，解析接口只返回已验证路径。构建脚本优先使用 PATH 中的 Cargo，再检查 `CARGO_HOME` 和当前用户默认 Cargo 目录。
- 当前接口：`resolve_codex_executable`、`app_server_start`、`app_server_stop`。
- 路径边界：应用配置和数据由 Tauri `app_config_dir/app_local_data_dir` 计算；CODEX_HOME 与 workspace 在应用本地数据目录下动态拼接；脚本项目根目录由 `$PSScriptRoot` 计算；源码不包含开发机仓库绝对路径。
- 认证边界：app-server 使用独立 `codex_shell_gateway` provider，`env_key=OPENAI_API_KEY` 且 `requires_openai_auth=false`，只从当前进程注入的用户凭据读取，不继承宿主 Codex 登录状态。
- 已知问题：Runtime 二进制被 Git 忽略，公开仓库尚无可复现自动下载/构建流程；installer sidecar 与崩溃恢复未验证。
- 下一步：在当前本机自动发现/复制策略稳定后，建立固定上游版本的 `runtime:fetch` 或 `runtime:build`，并验证安装后的 sidecar 同目录解析。
- 验证证据：相对覆盖、目录覆盖和 PATH 搜索有 Rust 单元测试；Rust Clippy `-D warnings` 通过；真实 app-server 使用新 provider 完成 turn；独立 rollout、SQLite、日志和临时文件只出现在中性应用目录。
- 最后更新：2026-08-07
