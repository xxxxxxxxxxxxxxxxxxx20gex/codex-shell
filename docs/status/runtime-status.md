# Codex Runtime 状态

- 模块职责：动态发现、兼容性验证、启动、停止并最终打包 `codex.exe` 及其同源 companion binaries。
- 当前状态：待发布 `v0.1.10` 安装包使用兼容门禁的 `codex-cli 0.160.1` Runtime；当前版本已接入 Tauri Updater，设置中的“检查并更新”会校验正式 GitHub Release 的 minisign 签名后下载并安装。安装包同时携带可选的 CS 市场 Skill 资源，只有用户主动安装才写入 CODEX_HOME。个人发布使用本机 `pnpm release:package` 生成安装器、`.sig` 和 `latest.json` 后手动上传；Runtime 不进入 Git。
- 最近变更：v0.1.10 随包发布官方稳定版 `codex-cli 0.160.1`，主程序与三个 helper 来自同一官方文件组，哈希记录在 `bundled/runtime-manifest.json`。与 0.159.2 的生成协议完整比对一致，复用现有接口及事件消费。Rust 启动参数开启原生后台 legacy 历史迁移，保留旧会话的编辑能力；无需 Shell 改写历史文件，边界见 [ADR-005](../decisions/ADR-005-native-history-migration.md)。
- 工具边界：CS 独立携带官方 ripgrep 15.2.0 Windows x64 MSVC；Tauri dev/build 的前置步骤按固定 SHA-256 校验或下载工具。app-server 子进程 PATH 前置 CS 目录，不修改系统 PATH，也不依赖官方 Codex 工具目录。缺少 rg.exe 会明确报错；许可证随包分发。
- 启动与兼容行为：渠道保存等待 Runtime 重启、历史刷新及原 Session 恢复成功，失败返回 false 并显示明确错误；重试保留待恢复的 Session ID。删除最后一个渠道仅停止核心。切换入口在实际提交前检查全局任务并暂停新执行 RPC；app-server 启动参数改为按激活渠道生成：`model_provider` 固定为 `codex_shell_gateway`，`base_url`、`model` 与对话参数来自渠道配置，`model_catalog_json` 和 `web_search="disabled"` 只在 DeepSeek 渠道注入；启动前先把内置目录物化到 `<CODEX_HOME>/codex-shell/`，没有激活渠道或缺少该渠道密钥时直接报错而不启动进程。Runtime staging 不再要求与历史 manifest 完全匹配，改为运行 app-server 协议兼容门禁，允许新增协议并阻止当前调用面被删除；主 Runtime 与三个 helper 必须来自同一文件组（支持官方 npm 的 bin/codex-resources 布局）并分别校验 SHA-256。生成协议同步升级仍由 `pnpm protocol:generate` 显式触发。首条消息进入目标模式时，前端先创建普通 Session，再通过原生 `thread/goal/set` 写入目标，随后启动同一条 Turn，不再要求用户先发送无关消息。独立 `/` 仍直接唤出 Skills、MCP、计划和目标等命令菜单。每次 app-server 启动仍以进程代际隔离旧 reader 线程事件。首次启动会等待持久化模型网关成功读取，以及个性化和默认目录读取结束后再加载历史，避免 app-server 以默认网关抢先启动；高级渠道设置保存后的重启也在新状态提交后执行，并按新渠道目录校准参数后再发出请求。
- 当前接口：`resolve_codex_executable`、`resolve_codex_home`、`set_codex_home`、`resolve_default_project_directory`、按激活渠道生成启动参数的 `app_server_arguments`、`catalog::materialize_catalog`、返回进程身份的 `app_server_start`、`app_server_stop`。
- 路径边界：应用配置仍由 Tauri `app_config_dir` 计算；CODEX_HOME 默认由用户目录动态拼接为 `.codex-shell`；默认项目目录由系统文档已知目录动态拼接为 `Codex-Shell/YYYY-MM-DD`；Thread 的执行目录仍由 `thread/start.cwd` 决定，源码不包含开发机仓库绝对路径。
- 认证边界：app-server 使用独立 `codex_shell_gateway` provider，`env_key=OPENAI_API_KEY` 且 `requires_openai_auth=false`，密钥来自当前激活渠道的凭据，只从当前进程注入的环境变量读取，不继承宿主 Codex 登录状态；同一时刻只有一个 provider，切换渠道等于重启进程。
- 协议校正：兼容门禁统一使用实验导出并从源码检查调用面；生成基线与当前 Runtime 对齐。真实探针的分页及运行中换模限制见 [协议状态](protocol-status.md)，不修改历史发布资产或 Runtime 二进制。
- 发布选源：v0.1.10 通过 `CODEX_SHELL_RUNTIME` 显式选择经过验证的官方 0.160.1 同源文件组，避免自动发现其他版本。后续候选版本先审查生成协议差异，再用 `runtime:stage -Source` 验证暂存。
- 增量构建：`build.rs` 监听 binaries 目录变化，避免 Tauri 沿用旧 sidecar；`desktop:build` 在完成后逐项比较 Debug 目录中的主 Runtime 与三个 helper 的 SHA-256，输出与暂存 manifest 不一致即失败。
- 已知问题：Runtime 二进制被 Git 忽略，跨机器发布需要安全复制同版本 Runtime 与无密码 signing key；兼容门禁覆盖现有生成文件、方法、通知和反向请求保留，但不替代真实 smoke；旧 CODEX_HOME 迁移仍依赖同卷 `rename`，跨卷用户目录需要单独的可恢复复制方案；进程崩溃后的自动恢复尚未实现。实时 stderr 仅保存在当前窗口的有界内存中，应用退出后仍以 Core 的 SQLite 日志为长期诊断来源。
- 发布状态：v0.1.10 携带 codex-cli 0.160.1 与三个同源 helper；Updater 公钥未更换。主程序和 helper 哈希、协议兼容门禁、真实隔离协议及扩展探针通过；签名安装器、`.sig` 和 `latest.json` 已在本机生成并验签，GitHub 写入返回 500，尚未上传；公开版仍为 v0.1.9。签名验证与人工检查边界见 [测试与发布状态](testing-release-status.md)。
- 交互校正：Windows Sandbox 未配置或需要更新时，运行时提示会明确引导到“设置 → 运行环境 → 使用管理员权限配置”，不再指向不存在的右侧状态页。
- 提示跳转：运行提示携带明确目标；Windows Sandbox 配置与结果进入“运行环境”，其他 app-server、配置、Guardian、模型与 MCP 提示进入“诊断”，不再统一跳到无关的运行环境页面。
- 相关决策：[ADR-001：使用原版 Codex app-server](../decisions/ADR-001-unmodified-codex-app-server.md)、[ADR-002：隔离运行数据与凭据](../decisions/ADR-002-isolated-runtime-data.md)、[ADR-004：以厂商分组的渠道承载模型路由](../decisions/ADR-004-model-provider-channels.md)。
- 验证证据：2026-10-07；0.160.1 同源哈希及兼容门禁、隔离新旧会话升级探针、设置／队列协议探针、Goal 和内置 rg 探针通过；后台迁移参数通过 Rust 单测。未覆盖真实模型、完整用户旧库、elevated Sandbox 或干净机器。完整基线见 [测试与发布](testing-release-status.md)。
- 最后更新：2026-10-08
