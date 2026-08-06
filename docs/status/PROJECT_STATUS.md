# 项目总状态

- 当前阶段：Milestone 1 — 真实线程纵向链路
- 总体状态：进行中
- 最后更新：2026-08-06

## 已完成

- 已创建独立 Tauri 2 + React + TypeScript 项目，不修改 Codex 核心仓库。
- 已确定 Windows 单平台、个人产品、内置固定 Codex Runtime 的边界。
- 已建立三栏工作台、模型配置交互、Rust 系统能力与 JSON-RPC 客户端骨架。
- 已建立项目总状态和核心模块动态状态文档体系。
- 已固定 `codex-cli 0.146.0-alpha.9.2` Runtime，并由同一二进制生成稳定协议类型。
- 已安装 Rust stable、MSVC Build Tools，并产出可执行的 Windows debug 桌面程序。

## 当前数据流

`React 工作台 → TypeScript JSON-RPC 客户端 → Tauri command/event → codex app-server stdio → OpenAI 兼容接口`。

## 当前风险

- UI 仍使用演示时间线，尚未绑定真实 thread/turn 通知。
- 固定 Runtime 已进入 Tauri sidecar 配置，但 MSI/NSIS 安装包尚未验证。

## 下一里程碑

打通 `initialize → thread/start → turn/start → agentMessage delta → turn/completed`，并实现任务停止。

## 验证证据

- `pnpm typecheck`：通过。
- `pnpm build`：通过。
- `pnpm rust:check`：通过。
- `pnpm desktop:build`：通过，产物为 `src-tauri/target/debug/codex-shell.exe`。
- 浏览器视觉烟测：三栏工作台与设置弹窗渲染正常，控制台无错误；基础兼容模板会隐藏不支持参数。
