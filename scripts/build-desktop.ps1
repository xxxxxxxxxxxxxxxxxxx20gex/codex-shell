$ErrorActionPreference = "Stop"
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$installationPath = (& $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Out-String).Trim()

if (-not $installationPath) {
    throw "未找到包含 x64 C++ 工具的 Visual Studio Build Tools"
}

$devShellModule = Join-Path $installationPath "Common7\Tools\Microsoft.VisualStudio.DevShell.dll"
Import-Module $devShellModule
Enter-VsDevShell -VsInstallPath $installationPath -SkipAutomaticLocation -DevCmdArguments "-arch=x64 -host_arch=x64"
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    pnpm tauri build --debug --no-bundle
    if ($LASTEXITCODE -ne 0) {
        throw "Tauri 桌面构建失败，退出码：$LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
