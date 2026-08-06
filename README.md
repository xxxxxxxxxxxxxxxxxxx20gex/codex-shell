# Codex Shell

Codex Shell 是一个以原版 `codex app-server` 为核心的 Windows 个人智能体桌面工作台。用户自行配置 OpenAI 兼容的 Base URL、API Key 和模型 ID；API Key 存在 Windows Credential Manager 中。

当前处于 Milestone 0：工程、模块边界、三栏 UI、模型能力模板和 app-server 通信骨架已经建立。实时线程和审批 UI 正在接入。

## 开发

```powershell
pnpm install
pnpm dev
pnpm tauri dev
```

可通过 `CODEX_SHELL_RUNTIME` 指定开发时使用的 `codex.exe`。未设置时从 PATH 查找 `codex.exe`。

准备发行用固定 Runtime 与协议类型：

```powershell
pnpm runtime:stage
pnpm protocol:generate
```

项目规则与状态入口见 [AGENTS.md](AGENTS.md) 和 [docs/status/PROJECT_STATUS.md](docs/status/PROJECT_STATUS.md)。
