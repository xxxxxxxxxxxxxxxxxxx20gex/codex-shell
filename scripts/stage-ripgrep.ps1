param(
    [string]$Source,
    [string]$Proxy
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot "src-tauri\binaries\rg-x86_64-pc-windows-msvc.exe"
$version = "15.2.0"
$archiveHash = "71b2fef860abe467217a538ff31de02f5258807c0129f771846f87bd029aafc5"
$binaryHash = "14231169855ec5205cf5a1b6f1db358ff4aed4247c86b69ce8aae647c77f6680"

function Get-Sha256([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    $sha256 = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($sha256.ComputeHash($stream))).Replace("-", "").ToLowerInvariant()
    }
    finally {
        $sha256.Dispose()
        $stream.Dispose()
    }
}

if (-not $Source -and (Test-Path -LiteralPath $target -PathType Leaf)) {
    if ((Get-Sha256 $target) -eq $binaryHash) {
        Write-Output "Bundled ripgrep $version already verified."
        exit 0
    }
    throw "Bundled ripgrep hash mismatch. Restore it with tools:stage -Source <verified rg.exe>."
}

$temporaryDirectory = $null
try {
    if (-not $Source) {
        $temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ("codex-shell-ripgrep-" + [guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
        $archive = Join-Path $temporaryDirectory "ripgrep.zip"
        $download = @{
            Uri = "https://github.com/BurntSushi/ripgrep/releases/download/$version/ripgrep-$version-x86_64-pc-windows-msvc.zip"
            OutFile = $archive
            UseBasicParsing = $true
            TimeoutSec = 60
        }
        if ($Proxy) { $download.Proxy = $Proxy }
        Invoke-WebRequest @download
        if ((Get-Sha256 $archive) -ne $archiveHash) {
            throw "ripgrep archive SHA-256 mismatch."
        }
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [IO.Compression.ZipFile]::ExtractToDirectory($archive, $temporaryDirectory)
        $Source = Join-Path $temporaryDirectory "ripgrep-$version-x86_64-pc-windows-msvc\rg.exe"
    }
    if ((Get-Sha256 $Source) -ne $binaryHash) {
        throw "ripgrep executable SHA-256 mismatch; expected the official $version Windows x64 MSVC build."
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item -LiteralPath $Source -Destination $target -Force
    Write-Output "Staged verified ripgrep $version."
}
finally {
    if ($temporaryDirectory) {
        $resolvedTemporary = (Resolve-Path -LiteralPath $temporaryDirectory).Path
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
        if (-not $resolvedTemporary.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or
            (Split-Path -Leaf $resolvedTemporary) -notlike 'codex-shell-ripgrep-*') {
            throw "Refusing cleanup outside the ripgrep staging directory."
        }
        Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
    }
}
