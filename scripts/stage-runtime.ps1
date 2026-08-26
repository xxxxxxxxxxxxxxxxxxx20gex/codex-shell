param(
    [string]$Source
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$binaryDirectory = Join-Path $projectRoot "src-tauri\binaries"
$target = Join-Path $binaryDirectory "codex-x86_64-pc-windows-msvc.exe"
$manifestPath = Join-Path $projectRoot "bundled\runtime-manifest.json"
$targetTriple = "x86_64-pc-windows-msvc"
$helperDefinitions = @(
    [ordered]@{
        sourceName = "codex-code-mode-host.exe"
        targetName = "codex-code-mode-host-$targetTriple.exe"
    },
    [ordered]@{
        sourceName = "codex-windows-sandbox-setup.exe"
        targetName = "codex-windows-sandbox-setup-$targetTriple.exe"
    },
    [ordered]@{
        sourceName = "codex-command-runner.exe"
        targetName = "codex-command-runner-$targetTriple.exe"
    }
)

function Resolve-RuntimeCandidate([string]$Candidate) {
    if (-not $Candidate -or -not (Test-Path -LiteralPath $Candidate)) {
        return $null
    }
    $resolved = (Resolve-Path -LiteralPath $Candidate).Path
    if ((Get-Item -LiteralPath $resolved).PSIsContainer) {
        $resolved = Join-Path $resolved "codex.exe"
    }
    if (Test-Path -LiteralPath $resolved -PathType Leaf) {
        $resolved = (Resolve-Path -LiteralPath $resolved).Path
        try {
            $probeVersion = (& $resolved --version 2>$null | Out-String).Trim()
            if ($probeVersion -and $probeVersion.StartsWith("codex-cli ")) { return $resolved }
        }
        catch {
            return $null
        }
    }
    return $null
}

if (-not $Source) {
    $candidates = [System.Collections.Generic.List[string]]::new()
    if ($env:CODEX_SHELL_RUNTIME) {
        $candidates.Add($env:CODEX_SHELL_RUNTIME)
    }
    $userProfile = [Environment]::GetFolderPath("UserProfile")
    if ($userProfile) {
        $candidates.Add((Join-Path $userProfile ".codex\plugins\.plugin-appserver\codex.exe"))
    }
    $pathCommand = Get-Command codex -ErrorAction SilentlyContinue
    if ($pathCommand) { $candidates.Add($pathCommand.Source) }
    $candidates.Add($target)
    $Source = $candidates | ForEach-Object { Resolve-RuntimeCandidate $_ } | Where-Object { $_ } | Select-Object -First 1
}

if (-not $Source) { throw "No readable Codex Runtime found. Set CODEX_SHELL_RUNTIME or add Codex to PATH." }

$resolvedSource = Resolve-RuntimeCandidate $Source
if (-not $resolvedSource) { throw "Runtime path does not exist or cannot be read: $Source" }
$sourceDirectory = Split-Path -Parent $resolvedSource
$stagingDirectory = Join-Path $binaryDirectory (".runtime-stage-" + [Guid]::NewGuid().ToString("N"))
$stagedTarget = Join-Path $stagingDirectory "codex-x86_64-pc-windows-msvc.exe"
foreach ($helper in $helperDefinitions) {
    $sourceCandidates = @(
        (Join-Path $sourceDirectory $helper.sourceName),
        (Join-Path $sourceDirectory "codex-resources\$($helper.sourceName)")
    )
    if ((Split-Path -Leaf $sourceDirectory) -eq "bin") {
        $sourceCandidates += Join-Path (Split-Path -Parent $sourceDirectory) "codex-resources\$($helper.sourceName)"
    }
    $helper.sourcePath = $sourceCandidates | Where-Object {
        Test-Path -LiteralPath $_ -PathType Leaf
    } | Select-Object -First 1
    if (-not $helper.sourcePath) {
        throw "Runtime is missing its same-directory companion: $($helper.sourceName)"
    }
    $helper.targetPath = Join-Path $stagingDirectory $helper.targetName
}

New-Item -ItemType Directory -Force -Path $binaryDirectory, $stagingDirectory | Out-Null
try {
    Copy-Item -LiteralPath $resolvedSource -Destination $stagedTarget -Force
    foreach ($helper in $helperDefinitions) {
        Copy-Item -LiteralPath $helper.sourcePath -Destination $helper.targetPath -Force
    }

    $version = (& $stagedTarget --version | Out-String).Trim()
    if (-not $version) {
        throw "Unable to read Runtime version; refusing unknown binary."
    }

    $protocolNonce = [Guid]::NewGuid().ToString("N")
    $protocolCheckDirectoryName = "codex-shell-protocol-check-" + $protocolNonce
    $protocolCheckDirectory = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath $protocolCheckDirectoryName
    & (Join-Path $projectRoot "scripts\check-runtime-compatibility.ps1") -Runtime $stagedTarget -ProtocolOutput $protocolCheckDirectory
    if ($LASTEXITCODE -ne 0) {
        throw "Runtime protocol compatibility check failed: exit code $LASTEXITCODE"
    }

    function Get-Sha256([string]$Path) {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $sha256 = [System.Security.Cryptography.SHA256]::Create()
            try {
                return ([System.BitConverter]::ToString($sha256.ComputeHash($stream))).Replace("-", "").ToLowerInvariant()
            }
            finally {
                $sha256.Dispose()
            }
        }
        finally {
            $stream.Dispose()
        }
    }

    $hash = Get-Sha256 $stagedTarget
    $helpers = @($helperDefinitions | ForEach-Object {
        [ordered]@{
            fileName = $_.targetName
            sha256 = Get-Sha256 $_.targetPath
        }
    })
    $manifest = [ordered]@{
        schemaVersion = 1
        version = $version
        updatePolicy = 'compatible-protocol-updates'
        protocolCheck = 'required-surface-v1'
        target = $targetTriple
        fileName = 'codex-x86_64-pc-windows-msvc.exe'
        sha256 = $hash
        helpers = $helpers
    }

    Copy-Item -LiteralPath $stagedTarget -Destination $target -Force
    foreach ($helper in $helperDefinitions) {
        Copy-Item -LiteralPath $helper.targetPath -Destination (Join-Path $binaryDirectory $helper.targetName) -Force
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8

    Write-Output "Staged compatible Runtime $version"
    Write-Output "SHA-256 $hash"
    Write-Output "Staged same-directory Code Mode Host and elevated Windows Sandbox helpers"
}
finally {
    if ($protocolCheckDirectory -and (Test-Path -LiteralPath $protocolCheckDirectory)) {
        Remove-Item -LiteralPath $protocolCheckDirectory -Recurse -Force
    }
    if (Test-Path -LiteralPath $stagingDirectory) {
        Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
    }
}
