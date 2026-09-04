param(
    [string]$Source,
    [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$binaryDirectory = Join-Path $projectRoot "src-tauri\binaries"
$helperNames = @(
    "codex-code-mode-host.exe",
    "codex-windows-sandbox-setup.exe",
    "codex-command-runner.exe"
)
$stagedHelperNames = @{
    "codex-code-mode-host.exe" = "codex-code-mode-host-x86_64-pc-windows-msvc.exe"
    "codex-windows-sandbox-setup.exe" = "codex-windows-sandbox-setup-x86_64-pc-windows-msvc.exe"
    "codex-command-runner.exe" = "codex-command-runner-x86_64-pc-windows-msvc.exe"
}

function Resolve-Runtime([string]$Candidate) {
    if (-not $Candidate -or -not (Test-Path -LiteralPath $Candidate)) { return $null }
    $resolved = (Resolve-Path -LiteralPath $Candidate).Path
    if ((Get-Item -LiteralPath $resolved).PSIsContainer) {
        $resolved = Join-Path $resolved "codex.exe"
    }
    if (Test-Path -LiteralPath $resolved -PathType Leaf) {
        return (Resolve-Path -LiteralPath $resolved).Path
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

if (-not $Source) { $Source = $env:CODEX_SHELL_RUNTIME }
if (-not $Source) { $Source = Join-Path $binaryDirectory "codex-x86_64-pc-windows-msvc.exe" }
$runtime = Resolve-Runtime $Source
if (-not $runtime) { throw "Cannot resolve Runtime. Pass -Source codex.exe or set CODEX_SHELL_RUNTIME." }

$runtimeDirectory = Split-Path -Parent $runtime
$stagingDirectory = Join-Path ([IO.Path]::GetTempPath()) ("codex-runtime-package-" + [Guid]::NewGuid().ToString("N"))
$outputRoot = if ($OutputDirectory) { [IO.Path]::GetFullPath($OutputDirectory) } else { Join-Path $projectRoot "bundled\runtime" }
New-Item -ItemType Directory -Force -Path $stagingDirectory, $outputRoot | Out-Null

try {
    $version = (& $runtime --version 2>$null | Out-String).Trim()
    if (-not $version.StartsWith("codex-cli ")) { throw "Runtime did not report a codex-cli version." }
    $safeVersion = ($version -replace '^codex-cli\s+', '') -replace '[^0-9A-Za-z._-]', '-'

    Copy-Item -LiteralPath $runtime -Destination (Join-Path $stagingDirectory "codex.exe") -Force
    foreach ($helperName in $helperNames) {
        $sourceCandidates = @(
            (Join-Path $runtimeDirectory $helperName),
            (Join-Path $runtimeDirectory $stagedHelperNames[$helperName]),
            (Join-Path $runtimeDirectory "codex-resources\$helperName"),
            (Join-Path $runtimeDirectory "codex-resources\$($stagedHelperNames[$helperName])")
        )
        if ((Split-Path -Leaf $runtimeDirectory) -eq "bin") {
            $sourceCandidates += Join-Path (Split-Path -Parent $runtimeDirectory) "codex-resources\$helperName"
            $sourceCandidates += Join-Path (Split-Path -Parent $runtimeDirectory) "codex-resources\$($stagedHelperNames[$helperName])"
        }
        $helperPath = $sourceCandidates | Where-Object {
            Test-Path -LiteralPath $_ -PathType Leaf
        } | Select-Object -First 1
        if (-not (Test-Path -LiteralPath $helperPath -PathType Leaf)) {
            throw "Runtime is missing companion binary $helperName beside codex.exe."
        }
        Copy-Item -LiteralPath $helperPath -Destination (Join-Path $stagingDirectory $helperName) -Force
    }

    $archivePath = Join-Path $outputRoot ("codex-runtime-$safeVersion-windows-x64.zip")
    if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
    Compress-Archive -Path (Join-Path $stagingDirectory "*") -DestinationPath $archivePath -CompressionLevel Optimal
    $hash = (Get-Sha256 $archivePath).ToLowerInvariant()
    $hashPath = "$archivePath.sha256"
    [IO.File]::WriteAllText($hashPath, "$hash  $(Split-Path -Leaf $archivePath)`n", [Text.UTF8Encoding]::new($false))
    Write-Output "Runtime archive: $archivePath"
    Write-Output "SHA-256: $hash"
}
finally {
    if (Test-Path -LiteralPath $stagingDirectory) {
        Remove-Item -LiteralPath $stagingDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
}
