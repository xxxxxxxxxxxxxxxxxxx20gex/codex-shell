# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界。模块行为由对应状态文档维护，历史测试流水账由 Git 保留。
- 当前状态：v0.1.9 为内核升级前的发布基线，包含窗口尺寸、回复资源入口、输入区布局、临时提示及模型服务层级修复；Updater minisign 已启用，Windows Authenticode 尚未配置，SmartScreen 仍可能提示未知发布者。
- 当前接口：`pnpm test:quality` 依次执行 TypeScript、ESLint、Vitest、`pnpm test:amap`、production build、Knip、`pnpm rust:check` 和 diff 检查。协议、Runtime、四视口布局和 Skill 专项验证独立运行，入口见 [测试脚本说明](../../tests/scripts/README.md) 与 `package.json`。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；Vite 主 chunk 超过 500 kB；`cargo fmt --check` 尚未纳入门禁。
- 下一步：补真实系统凭据、多渠道对话、第三方 MCP OAuth，以及干净 Windows 用户环境安装和升级验收。
- 最后更新：2026-10-02

2026-10-01，新增 Markdown 代码块四尺寸 Edge 布局探针，验证短代码收拢、长行内部滚动、复制按钮焦点和截图；对应模块事实见 [任务时间线](timeline-status.md)。

2026-10-01，输入区探针扩展到真实待发送列表、添加、权限与发送控件，四尺寸 Edge 检查与截图复核通过；新增队列组件 5 项定向测试通过，覆盖编辑／删除、菜单交互、失败保留、重复点击保护、恢复发送与附件预览。TypeScript、ESLint、生产构建和 Cargo check 通过；该次定向验证不替代真实 WebView2 队列链路验收，布局与组件事实见 [桌面 UI](ui-shell-status.md)。

2026-10-01，输入区四尺寸 Edge 探针新增右上角高度手柄验证：向上拖动增高且底部固定、64–320px 限制、上下键和 Escape 均通过，截图已复核；TypeScript、ESLint、生产构建和 Cargo check 通过。未进行真实 WebView2 人工拖拽验收。

2026-10-02，草图编辑器视觉更新完成：浮动工具胶囊、左侧尺寸滑杆、底部颜色色板和紧凑 footer 已通过 TypeScript、production build 与 Cargo check；本轮尚未完成四视口真实浏览器探针和 WebView2 手写触控验收。全量 lint 仍受既有 `TurnResourceOutputs.tsx` Hook 依赖告警影响，全量测试仍有既有 `ComposerAddMenu.test.tsx` 菜单数量断言失败。

## 当前验证基线

2026-10-02，0.159.2 升级后审查修复通过 `pnpm test:quality`；最终基线：71 个文件 / 391 项前端测试、34 项高德离线测试、生产构建、Knip、Cargo check、Rust 51 项单测（1 项交互测试忽略）、严格 Clippy 和 diff 检查。新增回归覆盖侧聊分页分叉、回退通知去重及重置后迟到响应、已提交回退的刷新失败、入队确认前撤回、删除失败／已消费状态、取消期间会话互斥、原生队列恢复和清理 Thread 后的迟到队列响应。已删除旧 Runtime 的本地队列发送和伪能力检测分支。本轮四尺寸 Edge Composer／队列检查通过；附件与托管图片四尺寸验证沿用升级时证据。

0.159.2 同源 Runtime 兼容门禁、隔离设置／队列协议探针、新旧历史升级探针、Goal 和内置 rg 探针通过。旧版 fixture 验证官方 CLI 与启动后台迁移，随后测试恢复、分页、回退替换、普通分叉、分页临时侧聊分叉及实际发送和冷恢复；所有模型请求均到本机模拟 Responses 网关，不接触真实用户数据或收费模型。

审查修复后的 `pnpm desktop:build` 已通过，Debug 主程序及同目录 sidecar 为 0.159.2 适配版本；本次未启动真实用户 CODEX_HOME。实测发现并修复增量构建遗留旧 sidecar：在 Debug 输出放入旧内核、只触碰暂存二进制后重建，输出被更新到 0.159.2，主程序及三个 helper 的 manifest 哈希核验通过；修改 build.rs 后重新运行 Rust check／单测／Clippy 通过。

本轮协议／边界回归覆盖三页历史分页顺序、20 MiB 图片／PDF 预览上限、HTTPS／本机回环 HTTP 渠道校验和 `thread/project/updated` 的权威 Thread 刷新。图片/PDF 当前仍由 app-server `fs/readFile` 完整返回后才判断大小，尚未实现源端分段读取。

## 未覆盖范围

- 真实 Windows Credential Manager 故障注入、真实第三方 MCP OAuth、真实生图／高德 API 的账号权限与配额。
- 干净机器安装升级、跨实体显示器、完整 WebView2 工具栏交互、超长 Diff／活动性能验收。
- 源端分段读取超大文件、真实模型与完整 WebView2 消息编辑链路，以及真实大型旧库迁移。

模拟 Runtime、浏览器探针和局部手工检查不替代上述验收。模块定向证据分别见 [Runtime](runtime-status.md)、[协议](protocol-status.md)、[扩展能力](agent-capabilities-status.md)、[项目与线程](workspace-thread-status.md)、[桌面 UI](ui-shell-status.md)、[模型配置](model-config-status.md)、[凭据](credentials-status.md) 和 [时间线](timeline-status.md)。

## 最近发布

v0.1.9 使用 `codex-cli 0.154.0-alpha.6.2` 同源 Runtime，发布资产为 NSIS 安装器、`.sig` 和 `latest.json`。2026-10-01 本机打包通过 Runtime 哈希及协议兼容门禁；独立使用配置中的既有公钥验证安装器 minisign 签名、可信注释签名、manifest 版本及下载地址均通过。精确资产校验和发布记录由 GitHub Release 保留，不在状态文档重复。

v0.1.9 发布基线为 370 项前端测试、34 项高德测试及 51 项 Rust 测试通过，Debug 与签名安装包均构建完成；GitHub 三项资产已正式公开。内核升级在 main 后续提交中交付，不覆盖 v0.1.9 的 tag、发布分支或安装器。
