# 可复用测试脚本

这里存放需要从项目根目录之外也能稳定复用的测试与质量门禁脚本。脚本通过自身路径动态定位项目根目录，不依赖开发机盘符、用户名或当前终端目录。

## 脚本

- `check-rust.ps1`：加载 Windows C++ 编译环境，在独立临时 target 目录中依次执行 `src-tauri` 的 `cargo check`、`cargo test --lib` 和严格 Clippy（警告视为错误）。
- `run-quality-gates.ps1`：依次运行类型检查、Vitest、生产构建、Knip、完整 Rust 质量检查和 `git diff --check`。

## 调用

推荐使用 package 入口：

```powershell
pnpm typecheck
pnpm test
pnpm test:quality
```

直接调用脚本时也不要求当前目录是项目根目录：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/scripts/run-quality-gates.ps1
```

模块级测试仍与源码放在一起（例如 `src/**/*.test.tsx` 和 `src-tauri/src/**/*_tests.rs`），这样可以保持测试与被测模块的导入、夹具和职责边界清晰；它们不是独立运行脚本，不移动到这里。
# 扩展管理检查

- `pnpm runtime:probe-extensions`：使用临时 CODEX_HOME 验证 Skills、MCP 配置和本地 Plugin 安装/卸载，不读取个人凭据或官方目录。
- `pnpm test:extension-layout <playwright/index.mjs绝对路径> <浏览器可执行文件绝对路径>`：先启动 `pnpm dev --host 127.0.0.1 --port 1435`；脚本在浏览器中挂载真实组件及模拟回调，检查四尺寸布局、字号、焦点和 reduced-motion，截图保存到系统临时目录。

## 模型渠道检查

- `pnpm test:channel-layout <playwright/index.mjs绝对路径> <浏览器可执行文件绝对路径> [端口]`：先启动 `pnpm dev --host 127.0.0.1 --port 1435`；脚本挂载真实的 `PreferencesPanel`（模型渠道分区）与 `ModelSettingsPanel`，检查四尺寸布局、模态框边界、字号下限、键盘焦点、删除二次确认、Escape 关闭和 reduced-motion，截图保存到系统临时目录。
