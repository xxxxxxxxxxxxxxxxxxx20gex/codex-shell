# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界。模块行为由对应状态文档维护，历史测试流水账由 Git 保留。
- 当前状态：v0.1.7 已正式发布，`release/v0.1.7` 和 `v0.1.7` Tag 指向发布提交，`main` 从该提交继续开发；NSIS 安装器、Updater 签名和 `latest.json` 已上传 GitHub。后续功能从 `main` 开发，下一版本号尚未确定。未配置 Windows Authenticode，SmartScreen 仍可能提示未知发布者。
- 最近变更：新增会话标题纯文本清理、字素截断、完整改名输入及历史请求期间名称更新回归。高德 Python 出图专项仍独立于通用质量门禁，命令与依赖见 [测试脚本说明](../../tests/scripts/README.md)。
- 当前接口：`pnpm test:quality` 依次执行 TypeScript、ESLint、Vitest、`pnpm test:amap`、production build、Knip、`pnpm rust:check` 和 diff 检查。完整门禁需要 Bun；Rust 入口包含 Cargo check、单元测试和严格 Clippy。协议、真实 Runtime 及五项四视口布局检查独立运行，入口见 [测试脚本说明](../../tests/scripts/README.md) 和 `package.json`。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；Vite 主 chunk 超过 500 kB；`cargo fmt --check` 尚未纳入门禁，现有 Rust 文件有格式差异。
- 下一步：补真实系统凭据、多渠道对话、第三方 MCP OAuth，以及干净 Windows 用户环境安装和升级验收。
- 最后更新：2026-09-22

## 当前开发验证基线

2026-09-22，高德增强后的代码基线上分别执行 TypeScript、ESLint、69 个文件 / 376 项前端测试、34 项高德 Bun 测试、production build、Knip、Cargo check、44 项 Rust 单测（1 项交互测试忽略）与严格 Clippy，均通过；diff 检查和高德 Skill 格式校验通过。新增 CLI 测试首次因 Windows Bun npm 包装器拒绝脚本参数而未启动子进程，改用当前可执行文件后复跑 34 项全部通过。`pnpm desktop:build` 成功生成 0.1.7 Debug，19 个高德资源文件与源码哈希一致，未生成新 Release。Vite 仍有既有主 chunk 大小提示，Debug 链接器输出创建库的信息警告，不影响构建成功。

同日较早的四尺寸扩展布局通过，覆盖 1440×900、1280×780、1024×720 和 900×700；办公辅助脚本 7 项测试、插件及五项 Skill 校验、真实隔离扩展探针通过，本次高德脚本改动未重跑这些专项。Knip 未发现未使用文件、导出或依赖。LibreOffice 调用使用模拟，未验证真实 Office 转换及模型驱动的办公产物；高德使用模拟 API 响应，未验证真实权限、配额和路线；此基线不代表全量桌面或外部服务验收。

## 专项验证与未覆盖范围

2026-09-22，会话名称优化通过 16 项定向测试、TypeScript、ESLint 和四尺寸浏览器探针（完整标题提示／改名、焦点、外部点击和横向溢出）；Cargo check 初次因 Debug 文件占用导致资源复制失败，改用独立临时 target 后通过。`pnpm desktop:build` 的 production build 与 Debug 构建成功，仍有既有 chunk 大小及链接器信息警告。浏览器探针不代替真实 WebView2 端到端验收；没有模型调用。新 DOM 测试首次因 happy-dom 未实现 prompt 而失败，显式提供测试替身后通过。

2026-09-22，扩展固定排序改动通过 31 项扩展管理／插件详情测试、TypeScript、ESLint、四尺寸扩展布局及 Cargo check；覆盖内置项混合安装状态与卸载、启停引起的 Core 返回乱序、插件刷新乱序。`pnpm desktop:build` 的 production build 与 Debug 构建成功，保留既有 chunk 大小和链接器信息警告。未重新执行真实 app-server 扩展探针。

2026-09-22，内置 Skill 资源路径与简介修复后，TypeScript、ESLint、19 项扩展组件测试、四尺寸扩展布局、Cargo check、46 项 Rust 单测（1 项忽略）及严格 Clippy 通过。`pnpm desktop:build` 包含的 production build 与 Debug 构建成功，仍有既有 chunk 大小和链接器信息警告。资源解析使用临时目录模拟 Tauri 实际打包结构，未运行干净机器 NSIS 安装；不代表生产安装端到端验收。

2026-09-22，高德出图模板更新后，6 项 Python 专项、34 项 Bun 查询测试、Skill 格式校验、TypeScript、production build 和 Cargo check 通过；真实高德静态底图的杭州示例已生成并查看预览，旧缓存错配探针被新实现正确拒绝。Debug 重建成功，包内 23 个高德资源文件与源码哈希一致。路线数据沿用历史示例，未验证当前客运、景区或价格。此次未改桌面 UI 和 Rust 行为，未重跑完整前端、Clippy 或四视口专项；上方完整门禁记录属于同日较早基线。

模块的定向验证由各模块状态维护，完整历史由 Git 保存：

- [Runtime](runtime-status.md) 与 [协议](protocol-status.md)：隔离探针不等于真实模型对话；分页和运行中换模仍受 Runtime 限制。
- [扩展能力](agent-capabilities-status.md)：真实办公产物、生图／高德 API 和干净机器依赖未验收。
- [项目与线程](workspace-thread-status.md) 与 [桌面 UI](ui-shell-status.md)：保留真实资源管理器定位证据；Chromium 测试不等于 WebView2 剪贴板权限验收，大型项目 watch 滚动仍缺人工验证。
- [模型配置](model-config-status.md) 与 [凭据](credentials-status.md)：真实系统凭据故障注入、多渠道对话及第三方 MCP OAuth 尚需验收。
- [时间线](timeline-status.md)：历史消息编辑仍缺真实 Runtime 链路及对应四视口验收。

## 最近发布基线

2026-09-20，v0.1.7：发布时完整门禁为 68 文件 / 372 项前端测试、14 项高德测试、43 项 Rust 单测（1 项忽略），以及类型、Lint、构建、Knip、Cargo check、Clippy 和 diff 检查。重新核验主 Runtime 与三个同源 helper 的 SHA-256，通过 codex-cli 0.154.0-alpha.6.2 协议兼容门禁、协议表面测试、隔离协议探针和扩展探针。探针覆盖 Thread 设置与队列、Skills 持久化启停、MCP 配置增删与 reload、本地插件安装卸载、当时三项 CS Office Skill 的安装路径及重启后开关保持，以及高德发现与禁用。

`pnpm release:package` 生成 NSIS 安装器、`.sig` 和 `latest.json`，通过配置公钥的 Ed25519 / BLAKE2b 验签、可信注释签名及 manifest 版本、下载 URL 和签名一致性检查；三项资产作为 v0.1.7 上传 GitHub Release。安装器 SHA-256：`4a4d8ce2e0892f47ebed8c9a557225c7424eedea525994b153e518472608a75b`。

自动发现的更新 Runtime 因缺少 `thread/rollback` 被门禁拒绝，随后显式使用哈希匹配的暂存同源 Runtime 完成发布。用户已完成部分真实桌面检查且未报告问题，但未枚举具体场景；不据此宣称全量桌面、真实外部 API 或干净机器安装升级验收通过。
