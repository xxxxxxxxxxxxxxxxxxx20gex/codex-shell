# ADR-002：隔离 Codex Shell 的运行数据与凭据

- 状态：accepted
- 记录日期：2026-08-21
- 影响范围：CODEX_HOME、应用配置、工作区、凭据安全

## 背景

Codex Shell 与官方 Codex 可以安装在同一台机器上。若直接共享配置、Session、缓存或凭据，两个产品可能互相修改状态，也会模糊数据归属和安全边界。

## 决策

Codex Shell 使用独立的应用配置和 `CODEX_HOME`，不复用官方 `%USERPROFILE%\.codex`。默认 `CODEX_HOME` 为用户目录下的 `.codex-shell`；用户可配置其他绝对路径，但必须保持与官方目录隔离。API Key 只保存在 Windows Credential Manager，并在启动授权的 app-server 子进程时注入。默认项目目录位于系统文档目录下的 `Codex-Shell/YYYY-MM-DD`。

## 选择理由与未采用方案

独立数据目录让配置、Session、SQLite、Skills、日志和缓存具有明确所有者，并降低版本差异造成的数据破坏风险。项目不采用共享官方 `CODEX_HOME` 或把 API Key 写入普通 JSON、源码、日志和命令行参数的方案。

## 后果

- 官方 Codex 与 Codex Shell 的 Session、Skills、MCP 配置和缓存默认互不可见。
- 自定义 `CODEX_HOME` 必须验证为绝对路径，且不能等于或位于官方目录内。
- 数据迁移需要显式、可恢复地处理，不能依赖两个产品隐式共享目录。
- 使用者文档中的数据位置必须随路径策略同步更新。

## 关联状态文档

- [Codex Runtime](../status/runtime-status.md)
- [凭据安全](../status/credentials-status.md)
- [项目目录与线程](../status/workspace-thread-status.md)
