# 可复用测试脚本

这里存放需要从项目根目录之外也能稳定复用的测试与质量门禁脚本。脚本通过自身路径动态定位项目根目录，不依赖开发机盘符、用户名或当前终端目录。

## 脚本

- `check-rust.ps1`：加载 Windows C++ 编译环境，在独立临时 target 目录中依次执行 `src-tauri` 的 `cargo check`、`cargo test --lib` 和严格 Clippy（警告视为错误）。
- `run-quality-gates.ps1`：依次运行类型检查、ESLint、Vitest、高德 Bun 离线测试、生产构建、Knip、完整 Rust 质量检查和 `git diff --check`。完整门禁需要 Bun，高德测试不访问真实 API。
- `probe-runtime-upgrade.mjs [候选 exe] [旧版 exe]`：默认验证暂存 Runtime 的分页、回退替换、分叉、归档、设置、队列和冷恢复；提供旧版 exe 时在隔离目录生成 legacy 历史，验证官方 CLI 及启动后台迁移。仅调用本机模拟 Responses 网关，不访问用户会话或真实模型服务。
- `check-terminal-interaction-layout.mjs`：挂载真实终端交互组件，在四种窗口尺寸下检查默认折叠、键盘切换、字号和横向溢出。

## 调用

推荐使用 package 入口：

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:amap
pnpm test:quality
```

直接调用脚本时也不要求当前目录是项目根目录：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/scripts/run-quality-gates.ps1
```

模块级测试仍与源码放在一起（例如 `src/**/*.test.tsx` 和 `src-tauri/src/**/*_tests.rs`），这样可以保持测试与被测模块的导入、夹具和职责边界清晰；它们不是独立运行脚本，不移动到这里。
## 扩展管理检查

- `pnpm test:mcp-layout <playwright/index.mjs绝对路径> <浏览器可执行文件绝对路径> [端口]`：先启动对应端口的 Vite（默认 1435）；挂载真实 MCP 管理组件与模拟配置，验证四尺寸列表／编辑表单、长名称截断、刷新保留草稿、焦点、模态删除取消、Escape、外部关闭及 reduced-motion。截图保存至系统临时目录，不访问真实 MCP 服务或凭据。

- `python -B -X utf8 tests/scripts/test_tuzi_skill.py`：需要 httpx、Pillow；模拟 Windows 注册表和 HTTP 响应，验证兔子生图配置优先级、默认地址、请求路由、不重试及错误脱敏，不读取真实密钥或发送收费请求。此专项不在通用 `test:quality` 中。

- `python -B -X utf8 tests/scripts/test-amap-travel-map.py`：需要 Pillow 和中文字体；离线验证高德底图缓存参数、旧缓存拒绝、错误脱敏、公交与其他路线线型、示例四类产物及拒绝覆盖。合成底图测试不代表真实地图对齐验收；此专项不在通用 `test:quality` 中。

- `python -X utf8 tests/scripts/test-office-helpers.py`：使用具备 PyMuPDF、python-docx、python-pptx、openpyxl 和 PyYAML 的 Python 环境验证办公渲染与模板边界。PDF 渲染为真实调用，LibreOffice 分支使用模拟转换；此独立检查不在通用 `test:quality` 中。
- `pnpm test:extension-layout <playwright/index.mjs绝对路径> <浏览器可执行文件绝对路径>`：先启动 `pnpm dev --host 127.0.0.1 --port 1435`；脚本在浏览器中挂载真实组件及模拟回调，检查四尺寸布局、字号、焦点和 reduced-motion，截图保存到系统临时目录。

## 模型渠道检查

- `pnpm test:channel-layout <playwright/index.mjs绝对路径> <浏览器可执行文件绝对路径> [端口]`：先启动 `pnpm dev --host 127.0.0.1 --port 1435`；脚本挂载真实的 `PreferencesPanel`（模型渠道分区）与 `ModelSettingsPanel`，检查四尺寸布局、模态框边界、字号下限、键盘焦点、删除二次确认、Escape 关闭和 reduced-motion，截图保存到系统临时目录。
- `pnpm test:composer-layout <playwright/index.mjs绝对路径> <浏览器可执行文件绝对路径> [端口]`：先启动 `pnpm dev --host 127.0.0.1 --port 1435`；脚本挂载真实目标栏、提示、待发送列表及添加／权限／发送控件，检查四尺寸布局、输入区向上拖拽／底部固定／高度上下限／键盘调整、行与按钮尺寸、缩略图、长文截断、滚动上限、菜单边界、Escape 焦点返回、外部关闭、文字下限与 reduced-motion，截图保存到系统临时目录。使用模拟回调，不代表真实 Runtime 或 WebView2 链路验收。
- `pnpm test:markdown-code-layout <playwright/index.mjs绝对路径> <浏览器可执行文件绝对路径> [端口]`：先启动 `pnpm dev --host 127.0.0.1 --port 1435`；脚本挂载真实 Markdown 回复，检查代码块整列宽度、长行滚动与换行切换、复制按钮焦点和四尺寸边界，截图保存到系统临时目录。

- `pnpm test:workbench-layout <playwright/index.mjs绝对路径> <浏览器可执行文件绝对路径> [端口]`：Vite 默认端口 1435；使用实际历史列表、菜单和 Markdown 组件与模拟工作台，检查四尺寸深浅主题、历史标题 hover 稳定、截断、消息列与 Composer 对齐、菜单焦点、Tab、Shift+F10、Escape、外部点击与 reduced-motion。截图写入临时目录，不代表真实 WebView2 人工验收。
