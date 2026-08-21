$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
$previousCargoBuildJobs = $env:CARGO_BUILD_JOBS
try {
    # Tauri pulls a large Windows/WebView dependency graph into the release
    # build. Keep the installer build usable on ordinary 16 GB developer
    # machines; this only affects the packaging process and is restored below.
    $env:CARGO_BUILD_JOBS = "2"
    Write-Output "Staging the pinned Codex Runtime and companion binaries..."
    pnpm runtime:stage
    if ($LASTEXITCODE -ne 0) {
        throw "Runtime staging failed, exit code: $LASTEXITCODE"
    }

    Write-Output "Building the Windows release bundle..."
    pnpm tauri build
    if ($LASTEXITCODE -ne 0) {
        throw "Tauri release packaging failed, exit code: $LASTEXITCODE"
    }

    $bundleDirectory = Join-Path $projectRoot "src-tauri\target\release\bundle"
    if (-not (Test-Path -LiteralPath $bundleDirectory -PathType Container)) {
        throw "Tauri completed without creating the release bundle directory"
    }
    $packages = @(Get-ChildItem -LiteralPath $bundleDirectory -Recurse -File |
        Where-Object { $_.Extension -in @('.msi', '.exe') })
    if ($packages.Count -eq 0) {
        throw "Tauri completed without creating an installer package"
    }
    Write-Output "Release packages: $bundleDirectory"
    $packages | Select-Object FullName, Length
}
finally {
    if ($null -eq $previousCargoBuildJobs) {
        Remove-Item Env:CARGO_BUILD_JOBS -ErrorAction SilentlyContinue
    }
    else {
        $env:CARGO_BUILD_JOBS = $previousCargoBuildJobs
    }
    Pop-Location
}
