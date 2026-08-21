# Codex Shell

Codex Shell 是一个以原版 `codex app-server` 为执行核心的 Windows 个人智能体桌面工作台。项目使用 Tauri 2、React、TypeScript 与 Rust，不修改 Codex Core；用户自行填写 OpenAI 兼容的 Base URL、API Key 和模型 ID，API Key 仅保存在 Windows Credential Manager。

当前处于 Milestone 2：已经接通真实 app-server、多轮 Thread/Turn/Item 时间线、执行计划与命令/工具活动、实时 Diff、用户工作区与 `@文件`、完整本地线程管理、审批队列，以及基于原生模型目录的模型、推理强度和高级 Provider 设置。

## 数据隔离

Codex Shell 使用中性应用标识 `com.codexshell.desktop`，不会复用官方 Codex 的 `CODEX_HOME`：

- 应用配置：`%APPDATA%\com.codexshell.desktop`
- 本地数据：`%LOCALAPPDATA%\com.codexshell.desktop`
- 独立 CODEX_HOME：默认 `%USERPROFILE%\.codex-shell`，可在运行环境设置中改为其他隔离的绝对路径
- 默认项目目录：`%USERPROFILE%\Documents\Codex-Shell\YYYY-MM-DD`

因此会话、SQLite 数据库、日志、skills、缓存和临时文件都与官方 `%USERPROFILE%\.codex` 分离。历史列表读取独立 CODEX_HOME 中的非临时线程，不依赖 Runtime 对 session source 的具体标记。

用户可以在应用内选择任意项目目录；选择结果通过动态路径作为新线程的 `cwd`，不会复制项目，也不会改变上述独立 CODEX_HOME 边界。

## 开发

```powershell
pnpm install
pnpm dev
pnpm tauri dev
```

后台验证：

```powershell
pnpm typecheck
pnpm test
pnpm test:quality
pnpm build
pnpm rust:check
pnpm desktop:build
```

可通过 `CODEX_SHELL_RUNTIME` 指定开发时使用的 `codex.exe` 或其所在目录，相对路径按启动目录解析。未设置时依次检查桌面程序同目录的 sidecar 和系统 PATH；所有候选都会先验证并转为规范化绝对路径，不嵌入开发机仓库路径。

准备发行用固定 Runtime 与协议类型：

```powershell
pnpm runtime:stage
pnpm protocol:generate
```

项目规则见 [AGENTS.md](AGENTS.md)，完整文档关系与动态状态入口见 [docs/README.md](docs/README.md)。

独立测试与质量门禁脚本统一放在 [tests/scripts](tests/scripts)；源码旁的 `*.test.*` 与 Rust `*_tests.rs` 保持就地维护，方便复用模块夹具和类型。
