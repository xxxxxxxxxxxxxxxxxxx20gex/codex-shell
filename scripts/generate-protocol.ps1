$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $projectRoot "src-tauri\binaries\codex-x86_64-pc-windows-msvc.exe"
$output = Join-Path $projectRoot "src\generated\app-server"

if (-not (Test-Path -LiteralPath $runtime -PathType Leaf)) {
    throw "固定 Runtime 不存在，请先运行 scripts\stage-runtime.ps1"
}

New-Item -ItemType Directory -Force -Path $output | Out-Null
& $runtime app-server generate-ts --out $output
if ($LASTEXITCODE -ne 0) {
    throw "app-server TypeScript 协议生成失败，退出码：$LASTEXITCODE"
}

Write-Output "Generated stable app-server protocol from the staged runtime."
