$ErrorActionPreference = "Stop"
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$installationPath = (& $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Out-String).Trim()

if (-not $installationPath) {
    throw "未找到包含 x64 C++ 工具的 Visual Studio Build Tools"
}

$devShellModule = Join-Path $installationPath "Common7\Tools\Microsoft.VisualStudio.DevShell.dll"
Import-Module $devShellModule
Enter-VsDevShell -VsInstallPath $installationPath -SkipAutomaticLocation -DevCmdArguments "-arch=x64 -host_arch=x64"

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
$env:Path = "$(Split-Path -Parent $cargo);$env:Path"

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    # A running debug build keeps the staged app-server executable in
    # src-tauri\target\debug open on Windows. Stop only processes launched
    # from this project's target directory; never touch an installed Codex.
    $targetRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot "src-tauri\target")).TrimEnd('\')
    $targetPrefix = "$targetRoot\"
    $runningProjectProcesses = Get-CimInstance Win32_Process | Where-Object {
        $_.ExecutablePath -and (
            $_.ExecutablePath.Replace('\\?\', '') -eq $targetRoot -or
            $_.ExecutablePath.Replace('\\?\', '').StartsWith($targetPrefix, [StringComparison]::OrdinalIgnoreCase)
        )
    }
    foreach ($processInfo in $runningProjectProcesses) {
        if ($processInfo.ProcessId -eq $PID) { continue }
        Stop-Process -Id $processInfo.ProcessId -Force -ErrorAction SilentlyContinue
    }
    if ($runningProjectProcesses) {
        Start-Sleep -Milliseconds 250
    }
    pnpm tauri build --debug --no-bundle
    if ($LASTEXITCODE -ne 0) {
        throw "Tauri 桌面构建失败，退出码：$LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
