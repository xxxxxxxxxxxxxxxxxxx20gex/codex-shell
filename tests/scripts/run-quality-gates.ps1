$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $projectRoot
try {
    & pnpm typecheck
    if ($LASTEXITCODE -ne 0) { throw "TypeScript 类型检查失败，退出码：$LASTEXITCODE" }

    & pnpm lint
    if ($LASTEXITCODE -ne 0) { throw "前端 ESLint 检查失败，退出码：$LASTEXITCODE" }

    & pnpm test
    if ($LASTEXITCODE -ne 0) { throw "Vitest 测试失败，退出码：$LASTEXITCODE" }

    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw "生产构建失败，退出码：$LASTEXITCODE" }

    & pnpm quality:knip
    if ($LASTEXITCODE -ne 0) { throw "Knip 无效代码检查失败，退出码：$LASTEXITCODE" }

    & pnpm rust:check
    if ($LASTEXITCODE -ne 0) { throw "Rust 校验失败，退出码：$LASTEXITCODE" }

    & git diff --check
    if ($LASTEXITCODE -ne 0) { throw "Git diff 格式检查失败，退出码：$LASTEXITCODE" }
}
finally {
    Pop-Location
}
