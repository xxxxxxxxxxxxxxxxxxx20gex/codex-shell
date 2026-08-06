# Codex Runtime 状态

- 模块职责：发现、启动、停止并最终打包固定版本 `codex.exe`。
- 当前状态：固定 Runtime 已 staged，安装包验证未完成。
- 最近变更：增加 `CODEX_SHELL_RUNTIME`、安装目录与 PATH 三级发现；增加 sidecar staging、SHA-256 清单、异常退出后重启和应用退出清理。
- 当前接口：`runtime_status`、`app_server_start`、`app_server_stop`。
- 已知问题：尚未完成 installer 中的 sidecar 启动验证和进程级崩溃恢复策略。
- 下一步：验证 MSI/NSIS 中固定 Runtime 的文件名、哈希和启动路径。
- 验证证据：已生成 `bundled/runtime-manifest.json`；当前固定版本为 `codex-cli 0.146.0-alpha.9.2`，并已记录 SHA-256。
- 最后更新：2026-08-06
