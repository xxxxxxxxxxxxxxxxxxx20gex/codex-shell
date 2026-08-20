param(
    [string]$Source
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$binaryDirectory = Join-Path $projectRoot "src-tauri\binaries"
$target = Join-Path $binaryDirectory "codex-x86_64-pc-windows-msvc.exe"
$manifestPath = Join-Path $projectRoot "bundled\runtime-manifest.json"
$sourceWasExplicit = $PSBoundParameters.ContainsKey("Source")
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

if (-not $Source) {
    $command = Get-Command codex -ErrorAction Stop
    $Source = $command.Source
}

$resolvedSource = (Resolve-Path -LiteralPath $Source).Path
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
        throw "The pinned Runtime is missing companion component: $($helper.sourceName)"
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
    if (-not $sourceWasExplicit -and (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        $expectedVersion = (Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json).version
        if ($expectedVersion -and $version -ne $expectedVersion) {
            throw "PATH Runtime $version does not match pinned version $expectedVersion. Pass -Source explicitly and regenerate the protocol to upgrade."
        }
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

    Write-Output "Staged $version"
    Write-Output "SHA-256 $hash"
    Write-Output "Staged Code Mode Host and elevated Windows Sandbox helpers"
}
finally {
    if (Test-Path -LiteralPath $stagingDirectory) {
        Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
    }
}
