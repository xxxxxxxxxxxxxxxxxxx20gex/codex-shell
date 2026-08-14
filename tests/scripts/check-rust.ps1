$ErrorActionPreference = "Stop"
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$installationPath = (& $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Out-String).Trim()

if (-not $installationPath) {
    throw "未找到包含 x64 C++ 工具的 Visual Studio Build Tools"
}

$devShellModule = Join-Path $installationPath "Common7\Tools\Microsoft.VisualStudio.DevShell.dll"
Import-Module $devShellModule
Enter-VsDevShell -VsInstallPath $installationPath -SkipAutomaticLocation -DevCmdArguments "-arch=x64 -host_arch=x64"

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$env:CARGO_TARGET_DIR = Join-Path ([System.IO.Path]::GetTempPath()) "codex-shell-quality-target"
$cargoCommand = Get-Command cargo.exe -ErrorAction SilentlyContinue
if ($cargoCommand) {
    $cargo = $cargoCommand.Source
}
else {
    $cargoHome = if ($env:CARGO_HOME) {
        $env:CARGO_HOME
    }
    else {
        Join-Path ([Environment]::GetFolderPath("UserProfile")) ".cargo"
    }
    $cargo = Join-Path $cargoHome "bin\cargo.exe"
}
if (-not (Test-Path -LiteralPath $cargo -PathType Leaf)) {
    throw "未找到 cargo.exe；请将 Cargo 加入 PATH 或设置 CARGO_HOME"
}

& $cargo check --manifest-path (Join-Path $projectRoot "src-tauri\Cargo.toml")
if ($LASTEXITCODE -ne 0) {
    throw "cargo check 失败，退出码：$LASTEXITCODE"
}

& $cargo test --manifest-path (Join-Path $projectRoot "src-tauri\Cargo.toml") --lib
if ($LASTEXITCODE -ne 0) {
    throw "cargo test --lib 失败，退出码：$LASTEXITCODE"
}

& $cargo clippy --manifest-path (Join-Path $projectRoot "src-tauri\Cargo.toml") --all-targets -- -D warnings
if ($LASTEXITCODE -ne 0) {
    throw "cargo clippy 失败，退出码：$LASTEXITCODE"
}
