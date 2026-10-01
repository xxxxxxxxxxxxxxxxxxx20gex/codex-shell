param([string]$Runtime = "")

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $Runtime) {
    $Runtime = Join-Path $projectRoot "src-tauri\binaries\codex-x86_64-pc-windows-msvc.exe"
}
$output = Join-Path $projectRoot "src\generated\app-server"

if (-not (Test-Path -LiteralPath $Runtime -PathType Leaf)) {
    throw "Runtime not found. Use -Runtime to select the candidate binary."
}
$runtimePath = (Resolve-Path -LiteralPath $Runtime).Path
$temporaryOutput = Join-Path ([IO.Path]::GetTempPath()) ("cs-protocol-generate-" + [guid]::NewGuid().ToString("N"))

try {
    & $runtimePath app-server generate-ts --experimental --out $temporaryOutput
    if ($LASTEXITCODE -ne 0) { throw "Protocol generation failed: exit code $LASTEXITCODE" }
    foreach ($required in @("ClientRequest.ts", "ServerNotificationEnvelope.ts", "ServerRequest.ts")) {
        if (-not (Test-Path -LiteralPath (Join-Path $temporaryOutput $required) -PathType Leaf)) {
            throw "Incomplete candidate protocol: $required"
        }
    }
    New-Item -ItemType Directory -Force -Path $output | Out-Null
    # Remove only obsolete generated TypeScript files, never hand-written source.
    Get-ChildItem -LiteralPath $output -Recurse -File -Filter *.ts | ForEach-Object {
        $relative = $_.FullName.Substring($output.Length + 1)
        if (-not (Test-Path -LiteralPath (Join-Path $temporaryOutput $relative) -PathType Leaf)) {
            if (-not ((Get-Content -LiteralPath $_.FullName -TotalCount 1) -match 'GENERATED CODE')) {
                throw "Refusing to remove a hand-written file: $relative"
            }
            Remove-Item -LiteralPath $_.FullName
        }
    }
    Copy-Item -Path (Join-Path $temporaryOutput '*') -Destination $output -Recurse -Force
    Write-Output "Generated candidate protocol. Review the diff, adapt consumers, run tests, then stage the same Runtime."
}
finally {
    if (Test-Path -LiteralPath $temporaryOutput) { Remove-Item -LiteralPath $temporaryOutput -Recurse -Force }
}
