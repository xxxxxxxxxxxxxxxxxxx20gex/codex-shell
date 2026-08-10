# Codex Runtime 状态

- 模块职责：动态发现、验证、启动、停止并最终打包固定版本 `codex.exe`。
- 当前状态：固定 Runtime 已 staged，进程、认证和数据目录隔离已完成，安装包验证未完成。
- 最近变更：默认 CODEX_HOME 从应用 LocalData 子目录迁移到 `~/.codex-shell`，与官方 Codex 的 `~/.codex` 规则保持一致但名称隔离；空的新默认目录不会阻断旧历史迁移，新旧目录都非空时为保护数据明确停止。默认和自定义路径均在解析真实路径后检查与官方 `.codex` 的重叠。
- 当前接口：`resolve_codex_executable`、`resolve_codex_home`、`set_codex_home`、`app_server_start`、`app_server_stop`。
- 路径边界：应用配置和默认工作区仍由 Tauri `app_config_dir/app_local_data_dir` 计算；CODEX_HOME 默认由 Tauri 用户目录动态拼接为 `.codex-shell`，自定义值规范化为绝对路径；脚本项目根目录由 `$PSScriptRoot` 计算；源码不包含开发机仓库绝对路径。
- 认证边界：app-server 使用独立 `codex_shell_gateway` provider，`env_key=OPENAI_API_KEY` 且 `requires_openai_auth=false`，只从当前进程注入的用户凭据读取，不继承宿主 Codex 登录状态。
- 已知问题：Runtime 二进制被 Git 忽略，公开仓库尚无可复现自动下载/构建流程；旧 CODEX_HOME 迁移仍依赖同卷 `rename`，跨卷用户目录需要单独的可恢复复制方案；installer sidecar 与崩溃恢复未验证。
- 下一步：在当前本机自动发现/复制策略稳定后，建立固定上游版本的 `runtime:fetch` 或 `runtime:build`，并验证安装后的 sidecar 同目录解析。
- 验证证据：8 项 Rust 单元测试通过，其中路径测试覆盖相对 Runtime、目录覆盖、PATH 搜索、旧 CODEX_HOME 整体迁移、空目标迁移、双非空目录无损拒绝及官方目录重叠拦截；真实 app-server 使用独立 provider 完成 turn。新默认目录的安装后迁移 smoke 尚待桌面程序重启验证。
- 最后更新：2026-08-10
