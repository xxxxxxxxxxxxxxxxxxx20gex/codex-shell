param(
    [string]$SigningKeyPath = "",
    [string]$Repository = "",
    [string]$Tag = "",
    [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
$previousCargoBuildJobs = $env:CARGO_BUILD_JOBS
try {
    if (-not $SigningKeyPath) { $SigningKeyPath = $env:TAURI_SIGNING_PRIVATE_KEY_PATH }
    if (-not $SigningKeyPath) {
        $defaultKey = Join-Path ([Environment]::GetFolderPath("UserProfile")) ".tauri\codex-shell.key"
        if (Test-Path -LiteralPath $defaultKey -PathType Leaf) { $SigningKeyPath = $defaultKey }
    }
    if (-not $SigningKeyPath -or -not (Test-Path -LiteralPath $SigningKeyPath -PathType Leaf)) {
        throw "Signing key not found. Pass -SigningKeyPath or set TAURI_SIGNING_PRIVATE_KEY_PATH."
    }
    if ([string]::IsNullOrWhiteSpace($env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD)) {
        throw "TAURI_SIGNING_PRIVATE_KEY_PASSWORD is not set. Set it only in the current process or user environment; never commit it."
    }
    if (-not $Repository) { $Repository = $env:GITHUB_REPOSITORY }
    if (-not $Repository) { throw "Pass -Repository OWNER/REPOSITORY." }
    if (-not $Tag) {
        $config = Get-Content -Raw (Join-Path $projectRoot "src-tauri\tauri.conf.json") | ConvertFrom-Json
        $Tag = "v$($config.version)"
    }
    if (-not $Tag.StartsWith("v")) { $Tag = "v$Tag" }
    if (-not $OutputDirectory) { $OutputDirectory = Join-Path $projectRoot "release-artifacts\$Tag" }
    $outputPath = [IO.Path]::GetFullPath($OutputDirectory)

    $env:TAURI_SIGNING_PRIVATE_KEY = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $SigningKeyPath).Path)
    $env:CARGO_BUILD_JOBS = "2"
    Write-Output "Staging the compatible Codex Runtime..."
    pnpm runtime:stage
    if ($LASTEXITCODE -ne 0) { throw "Runtime staging failed, exit code: $LASTEXITCODE" }

    Write-Output "Building the signed Windows installer..."
    pnpm tauri build
    if ($LASTEXITCODE -ne 0) { throw "Tauri release packaging failed, exit code: $LASTEXITCODE" }

    $bundleDirectory = Join-Path $projectRoot "src-tauri\target\release\bundle"
    $nsisDirectory = Join-Path $bundleDirectory "nsis"
    $installer = @(Get-ChildItem -LiteralPath $nsisDirectory -Filter "*-setup.exe" -File)
    if ($installer.Count -ne 1) { throw "Expected exactly one NSIS installer; found $($installer.Count)." }
    $signature = "$($installer[0].FullName).sig"
    if (-not (Test-Path -LiteralPath $signature -PathType Leaf)) { throw "Tauri did not create the updater signature: $signature" }

    if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
    Copy-Item -LiteralPath $installer[0].FullName -Destination $outputPath -Force
    Copy-Item -LiteralPath $signature -Destination $outputPath -Force
    $manifestPath = Join-Path $outputPath "latest.json"
    & (Join-Path $projectRoot "scripts\generate-updater-manifest.ps1") -BundleDirectory $nsisDirectory -Repository $Repository -Tag $Tag -OutputPath $manifestPath
    if ($LASTEXITCODE -ne 0) { throw "Updater manifest generation failed, exit code: $LASTEXITCODE" }

    Write-Output "Release assets ready: $outputPath"
    Get-ChildItem -LiteralPath $outputPath -File | Select-Object Name, Length
}
finally {
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
    if ($null -eq $previousCargoBuildJobs) { Remove-Item Env:CARGO_BUILD_JOBS -ErrorAction SilentlyContinue }
    else { $env:CARGO_BUILD_JOBS = $previousCargoBuildJobs }
    Pop-Location
}
