# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界。模块行为由对应状态文档维护，历史测试流水账由 Git 保留。
- 当前状态：v0.1.7 已正式发布，`main`、`release/v0.1.7` 和 `v0.1.7` Tag 指向同一提交；NSIS 安装器、Updater 签名和 `latest.json` 已上传 GitHub。后续开发从该提交继续，下一版本号尚未确定。未配置 Windows Authenticode，SmartScreen 仍可能提示未知发布者。
- 最近变更：高德 Skill 的 Bun 离线测试已接入完整质量门禁。内置 Skill 安装后默认禁用失败、有效状态仍启用、响应正文超时、永久 HTTP 错误不重试、暂时错误重试、网络错误脱敏和计时器释放均有回归覆盖。
- 当前接口：`pnpm test:quality` 依次执行 TypeScript、ESLint、Vitest、`pnpm test:amap`、production build、Knip、`pnpm rust:check` 和 diff 检查。完整门禁需要 Bun；Rust 入口包含 Cargo check、单元测试和严格 Clippy。协议、真实 Runtime 及五项四视口布局检查独立运行，入口见 [测试脚本说明](../../tests/scripts/README.md) 和 `package.json`。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；Vite 主 chunk 超过 500 kB；`cargo fmt --check` 尚未纳入门禁，现有 Rust 文件有格式差异。
- 下一步：补真实系统凭据、多渠道对话、第三方 MCP OAuth，以及干净 Windows 用户环境安装和升级验收。
- 最后更新：2026-09-20

## 当前开发验证基线

2026-09-20，`pnpm test:quality` 通过：TypeScript、ESLint、68 个文件 / 372 项前端测试、14 项高德 Bun 测试、production build、Knip、Cargo check、43 项 Rust 单测（1 项交互测试忽略）、严格 Clippy 和 `git diff --check`。发布前在最终应用代码基线上重新运行完整门禁通过；同日 `pnpm desktop:build` 成功生成 0.1.7 Debug。

四尺寸扩展布局通过，覆盖 1440×900、1280×780、1024×720 和 900×700。Knip 未发现未使用文件、导出或依赖。此基线不代表所有业务均经过真实桌面或外部服务验收。

## 仍有效的专项证据

| 范围 | 已验证 | 边界 |
| --- | --- | --- |
| 插件与 Skill | 2026-09-17 至 2026-09-20：隔离 Runtime 验证 CS Office 安装、技能发现、实际安装路径启停、重启持久化、卸载及高德中文元数据和禁用；组件与四尺寸扩展布局覆盖分组、详情、开关、焦点和关闭 | 未执行真实办公文件生成、高德 API、生图 API 或干净机器依赖验收；生图脚本的 2026-09-14 验证使用 MockTransport |
| 文件与右键 | 2026-09-17：四尺寸浏览器检查菜单、复制绝对路径、输入框编辑、焦点、Escape、图片预览与当前文件高亮；显式桌面定位测试经 Shell COM 确认普通及中文/空格路径的父目录和选中项 | Chromium 剪贴板验证不等于 WebView2 权限验收；未验收大型项目 watch 后长列表滚动 |
| 协议与 Runtime | 2026-09-16：codex-cli 0.154.0-alpha.6.2 兼容门禁、协议表面门禁及本地模拟网关协议探针通过；2026-09-14 内置 rg 经真实 app-server → PowerShell 调用通过 | 历史分页和运行中换模限制见 [协议状态](protocol-status.md)；不代表真实模型对话成功 |
| 渠道与凭据 | 2026-09-10：模拟凭据写入、失败补偿、配置冲突、切换互斥和重启重试回归通过；渠道四尺寸真实组件与模拟回调验证通过 | 未在真实 Windows Credential Manager 执行增删故障注入；未验收多渠道真实对话或第三方 MCP OAuth |
| 历史消息编辑 | 2026-09-18：控制器回归验证末回合替换、失败保留草稿及普通 Composer 呈现 | 真实 Runtime 编辑链路及对应四视口验收尚未完成 |

专项行为与更细的限制见 [模块状态索引](../README.md#当前状态)。不把旧版本测试总数或排障过程继续追加到当前基线。

## 最近发布基线

2026-09-20，v0.1.7：在上述完整质量门禁基础上，重新核验主 Runtime 与三个同源 helper 的 SHA-256，通过 codex-cli 0.154.0-alpha.6.2 协议兼容门禁、协议表面测试、隔离协议探针和扩展探针。探针覆盖 Thread 设置与队列、Skills 持久化启停、MCP 配置增删与 reload、本地插件安装卸载、CS Office 安装路径及重启后开关保持，以及高德发现与禁用。

`pnpm release:package` 生成 NSIS 安装器、`.sig` 和 `latest.json`，通过配置公钥的 Ed25519 / BLAKE2b 验签、可信注释签名及 manifest 版本、下载 URL 和签名一致性检查；三项资产作为 v0.1.7 上传 GitHub Release。安装器 SHA-256：`4a4d8ce2e0892f47ebed8c9a557225c7424eedea525994b153e518472608a75b`。

自动发现的更新 Runtime 因缺少 `thread/rollback` 被门禁拒绝，随后显式使用哈希匹配的暂存同源 Runtime 完成发布。用户已完成部分真实桌面检查且未报告问题，但未枚举具体场景；不据此宣称全量桌面、真实外部 API 或干净机器安装升级验收通过。
