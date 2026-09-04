param(
    [Parameter(Mandatory = $true)]
    [string]$BundleDirectory,
    [Parameter(Mandatory = $true)]
    [string]$Repository,
    [Parameter(Mandatory = $true)]
    [string]$Tag,
    [Parameter(Mandatory = $true)]
    [string]$OutputPath,
    [string]$Notes = "Signed Codex Shell update"
)

$ErrorActionPreference = "Stop"
$bundlePath = [IO.Path]::GetFullPath($BundleDirectory)
$outputFile = [IO.Path]::GetFullPath($OutputPath)
if (-not (Test-Path -LiteralPath $bundlePath -PathType Container)) {
    throw "Bundle directory does not exist: $bundlePath"
}

$tagValue = $Tag.Trim()
if ($tagValue -notmatch '^v') { $tagValue = "v$tagValue" }
$version = $tagValue.Substring(1)
$installers = @(Get-ChildItem -LiteralPath $bundlePath -Filter "*$version*-setup.exe" -File -Recurse)
if ($installers.Count -ne 1) {
    throw "Expected exactly one NSIS installer for version $version in the bundle directory; found $($installers.Count)."
}
$installer = $installers[0]
$signaturePath = "$($installer.FullName).sig"
if (-not (Test-Path -LiteralPath $signaturePath -PathType Leaf)) {
    throw "Missing updater signature beside installer: $signaturePath"
}

$repositoryPath = $Repository.Trim().TrimEnd('/')
if ($repositoryPath -match '^https://github\.com/') {
    $repositoryPath = $repositoryPath.Substring('https://github.com/'.Length)
}
if ($repositoryPath -match '^github\.com/') {
    $repositoryPath = $repositoryPath.Substring('github.com/'.Length)
}
if ($repositoryPath -notmatch '^[^/]+/[^/]+$') {
    throw "Repository must be OWNER/REPOSITORY."
}
$signature = [IO.File]::ReadAllText($signaturePath).Trim()
$manifest = [ordered]@{
    version = $version
    notes = $Notes
    pub_date = [DateTime]::UtcNow.ToString("o")
    platforms = [ordered]@{
        "windows-x86_64" = [ordered]@{
            signature = $signature
            url = "https://github.com/$repositoryPath/releases/download/$tagValue/$($installer.Name)"
        }
    }
}

$outputParent = Split-Path -Parent $outputFile
New-Item -ItemType Directory -Force -Path $outputParent | Out-Null
$json = $manifest | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($outputFile, "$json`n", [Text.UTF8Encoding]::new($false))
Write-Output "Updater manifest: $outputFile"
Write-Output "Installer asset: $($installer.Name)"
Write-Output "Release tag: $tagValue"
