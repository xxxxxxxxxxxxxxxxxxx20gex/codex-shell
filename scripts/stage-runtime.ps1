param(
    [string]$Source
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$binaryDirectory = Join-Path $projectRoot "src-tauri\binaries"
$target = Join-Path $binaryDirectory "codex-x86_64-pc-windows-msvc.exe"
$manifestPath = Join-Path $projectRoot "bundled\runtime-manifest.json"

if (-not $Source) {
    $command = Get-Command codex -ErrorAction Stop
    $Source = $command.Source
}

$resolvedSource = (Resolve-Path -LiteralPath $Source).Path
New-Item -ItemType Directory -Force -Path $binaryDirectory | Out-Null
Copy-Item -LiteralPath $resolvedSource -Destination $target -Force

$version = (& $resolvedSource --version | Out-String).Trim()
$stream = [System.IO.File]::OpenRead($target)
try {
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hash = (($sha256.ComputeHash($stream) | ForEach-Object { $_.ToString("x2") }) -join "")
}
finally {
    $stream.Dispose()
    if ($sha256) {
        $sha256.Dispose()
    }
}
$manifest = [ordered]@{
    schemaVersion = 1
    version = $version
    target = "x86_64-pc-windows-msvc"
    fileName = "codex-x86_64-pc-windows-msvc.exe"
    sha256 = $hash
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8

Write-Output "Staged $version"
Write-Output "SHA-256 $hash"
