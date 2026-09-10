param(
    [Parameter(Mandatory = $true)]
    [string]$Runtime,
    [Parameter(Mandatory = $true)]
    [string]$ProtocolOutput
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$currentProtocolRoot = Join-Path $projectRoot "src\generated\app-server"

if (-not (Test-Path -LiteralPath $Runtime -PathType Leaf)) {
    throw "待检查的 Runtime 不存在：$Runtime"
}
$runtimePath = (Resolve-Path -LiteralPath $Runtime).Path
$protocolRoot = if ([System.IO.Path]::IsPathRooted($ProtocolOutput)) {
    $ProtocolOutput
} else {
    Join-Path (Get-Location) $ProtocolOutput
}

if (Test-Path -LiteralPath $protocolRoot) {
    throw "ProtocolOutput must be a new temporary directory: $protocolRoot"
}
New-Item -ItemType Directory -Force -Path $protocolRoot | Out-Null

try {
& $runtimePath app-server generate-ts --experimental --out $protocolRoot
if ($LASTEXITCODE -ne 0) {
    throw "Runtime 协议生成失败，退出码：$LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $currentProtocolRoot -PathType Container)) {
    throw "当前项目缺少已生成的 app-server 协议目录：$currentProtocolRoot"
}

    & node (Join-Path $PSScriptRoot "check-protocol-surface.mjs") $protocolRoot
    if ($LASTEXITCODE -ne 0) { throw "Runtime protocol surface check failed." }

    # 现有生成文件的任何变化都要求先重新生成并审查；候选 Runtime 可以新增文件。
    $protocolFiles = Get-ChildItem -LiteralPath $currentProtocolRoot -Recurse -File
    foreach ($protocolFile in $protocolFiles) {
        $relativePath = $protocolFile.FullName.Substring($currentProtocolRoot.Length + 1)
        $candidateFile = Join-Path $protocolRoot $relativePath
        if (-not (Test-Path -LiteralPath $candidateFile -PathType Leaf)) {
            throw "候选 Runtime 删除了现有生成协议文件：$relativePath"
        }
        $currentText = Get-Content -Raw -LiteralPath $protocolFile.FullName
        $candidateText = Get-Content -Raw -LiteralPath $candidateFile
        if ($currentText.Replace("`r`n", "`n") -cne $candidateText.Replace("`r`n", "`n")) {
            throw "Candidate Runtime changed generated protocol file: $relativePath. Run pnpm protocol:generate, review the diff, and run regression tests first."
        }
    }

Write-Output "Runtime protocol compatibility passed."
Write-Output "Existing client methods, notifications, reverse requests and generated types are preserved."
Write-Output "New Runtime protocol additions are allowed and can be adopted with pnpm protocol:generate."

}
finally {
    if (Test-Path -LiteralPath $protocolRoot) {
        Remove-Item -LiteralPath $protocolRoot -Recurse -Force
    }
}
