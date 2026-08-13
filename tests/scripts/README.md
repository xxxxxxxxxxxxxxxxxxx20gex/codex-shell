# 可复用测试脚本

这里存放需要从项目根目录之外也能稳定复用的测试与质量门禁脚本。脚本通过自身路径动态定位项目根目录，不依赖开发机盘符、用户名或当前终端目录。

## 脚本

- `check-rust.ps1`：加载 Windows C++ 编译环境并执行 `src-tauri` 的 `cargo check`。
- `run-quality-gates.ps1`：依次运行类型检查、Vitest、生产构建、Knip、Rust 检查和 `git diff --check`。

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
