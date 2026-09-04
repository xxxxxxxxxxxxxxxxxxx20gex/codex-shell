param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [Parameter(Mandatory = $true)]
    [string]$Sha256,
    [Parameter(Mandatory = $true)]
    [string]$Destination
)

$ErrorActionPreference = "Stop"
$expectedFiles = @(
    "codex.exe",
    "codex-code-mode-host.exe",
    "codex-windows-sandbox-setup.exe",
    "codex-command-runner.exe"
)

if ($Sha256 -notmatch '^[0-9a-fA-F]{64}$') {
    throw "Runtime SHA-256 must be exactly 64 hexadecimal characters."
}

$destinationPath = [IO.Path]::GetFullPath($Destination)
$parent = Split-Path -Parent $destinationPath
if (-not $parent) {
    throw "Runtime destination must be a directory path."
}
New-Item -ItemType Directory -Force -Path $parent | Out-Null

$archivePath = Join-Path ([IO.Path]::GetTempPath()) ("codex-runtime-" + [Guid]::NewGuid().ToString("N") + ".zip")
$downloadedDirectory = Join-Path ([IO.Path]::GetTempPath()) ("codex-runtime-extract-" + [Guid]::NewGuid().ToString("N"))

function Resolve-LocalSource([string]$Candidate) {
    if ($Candidate -match '^file://') {
        return ([Uri]$Candidate).LocalPath
    }
    if (Test-Path -LiteralPath $Candidate -PathType Leaf) {
        return (Resolve-Path -LiteralPath $Candidate).Path
    }
    return $null
}

function Get-Sha256([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    try {
        $sha256 = [Security.Cryptography.SHA256]::Create()
        try {
            return ([BitConverter]::ToString($sha256.ComputeHash($stream))).Replace("-", "")
        }
        finally { $sha256.Dispose() }
    }
    finally { $stream.Dispose() }
}

try {
    $localSource = Resolve-LocalSource $Url
    if ($localSource) {
        Copy-Item -LiteralPath $localSource -Destination $archivePath -Force
    }
    else {
        if ($Url -notmatch '^https://') {
            throw "Runtime URL must use HTTPS or point to a local ZIP file for local verification."
        }
        Invoke-WebRequest -Uri $Url -OutFile $archivePath -UseBasicParsing
    }

    $actualSha256 = Get-Sha256 $archivePath
    if (-not $actualSha256.Equals($Sha256, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Runtime archive SHA-256 mismatch. Expected $Sha256, got $actualSha256."
    }

    if (Test-Path -LiteralPath $destinationPath) {
        Remove-Item -LiteralPath $destinationPath -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $downloadedDirectory | Out-Null
    Expand-Archive -LiteralPath $archivePath -DestinationPath $downloadedDirectory -Force

    $matches = @(Get-ChildItem -LiteralPath $downloadedDirectory -Filter "codex.exe" -File -Recurse)
    if ($matches.Count -ne 1) {
        throw "Runtime archive must contain exactly one codex.exe; found $($matches.Count)."
    }
    $runtimeDirectory = $matches[0].Directory.FullName
    foreach ($fileName in $expectedFiles) {
        $filePath = Join-Path $runtimeDirectory $fileName
        if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
            throw "Runtime archive is missing $fileName beside codex.exe."
        }
    }

    Copy-Item -LiteralPath $runtimeDirectory -Destination $destinationPath -Recurse -Force
    $version = (& (Join-Path $destinationPath "codex.exe") --version 2>$null | Out-String).Trim()
    if (-not $version.StartsWith("codex-cli ")) {
        throw "Downloaded Runtime did not report a codex-cli version."
    }
    Write-Output "Fetched and verified Runtime $version"
    Write-Output "Runtime directory: $destinationPath"
}
finally {
    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $downloadedDirectory) {
        Remove-Item -LiteralPath $downloadedDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
}
