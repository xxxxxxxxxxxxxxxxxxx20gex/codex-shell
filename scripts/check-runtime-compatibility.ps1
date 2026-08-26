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
    Remove-Item -LiteralPath $protocolRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $protocolRoot | Out-Null

try {
& $runtimePath app-server generate-ts --out $protocolRoot
if ($LASTEXITCODE -ne 0) {
    throw "Runtime 协议生成失败，退出码：$LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $currentProtocolRoot -PathType Container)) {
    throw "当前项目缺少已生成的 app-server 协议目录：$currentProtocolRoot"
}

    # 允许上游新增能力，但不能删除 CS 当前调用的 JSON-RPC 方法或事件。
    $requiredMethods = @('initialize','thread/start','thread/resume','thread/read','thread/fork','thread/list','thread/archive','thread/unarchive','thread/delete','thread/unsubscribe','thread/name/set','thread/metadata/update','thread/section/move','thread/goal/get','thread/goal/set','thread/goal/clear','thread/compact/start','turn/start','turn/steer','turn/interrupt','review/start','model/list','modelProvider/capabilities/read','skills/list','mcpServerStatus/list','mcpServer/oauth/login','config/mcpServer/reload','mcpServer/resource/read','fs/readDirectory','fs/readFile','fs/watch','fs/unwatch','windowsSandbox/readiness','windowsSandbox/setupStart','fuzzyFileSearch')
    $requiredNotifications = @('turn/started','turn/completed','thread/status/changed','thread/name/updated','thread/settings/updated','thread/goal/updated','thread/goal/cleared','thread/tokenUsage/updated','item/agentMessage/delta','item/plan/delta','item/commandExecution/outputDelta','item/commandExecution/terminalInteraction','item/fileChange/outputDelta','item/fileChange/patchUpdated','item/mcpToolCall/progress','thread/compacted','fs/changed','serverRequest/resolved','app-server/stopped')
    $candidateRequest = Get-Content -Raw -LiteralPath (Join-Path $protocolRoot "ClientRequest.ts")
    $candidateClientNotification = Get-Content -Raw -LiteralPath (Join-Path $protocolRoot "ClientNotification.ts")
    $candidateNotification = Get-Content -Raw -LiteralPath (Join-Path $protocolRoot "ServerNotificationEnvelope.ts")
    $candidateServerRequest = Get-Content -Raw -LiteralPath (Join-Path $protocolRoot "ServerRequest.ts")
    foreach ($method in $requiredMethods) {
        if ($candidateRequest -notmatch ('"method"\s*:\s*"' + [regex]::Escape($method) + '"')) { throw "候选 Runtime 缺少 CS 使用的请求方法：$method" }
    }
    if ($candidateClientNotification -notmatch '"method"\s*:\s*"initialized"') { throw "候选 Runtime 缺少 CS 使用的客户端通知：initialized" }
    foreach ($method in $requiredNotifications) {
        if (($candidateNotification -notmatch ('"method"\s*:\s*"' + [regex]::Escape($method) + '"')) -and ($method -ne "app-server/stopped")) { throw "候选 Runtime 缺少 CS 使用的通知：$method" }
    }
    foreach ($method in @("item/commandExecution/requestApproval", "item/fileChange/requestApproval", "item/tool/requestUserInput", "mcpServer/elicitation/request", "item/permissions/requestApproval")) {
        if ($candidateServerRequest -notmatch ('"method"\s*:\s*"' + [regex]::Escape($method) + '"')) { throw "候选 Runtime 缺少 CS 使用的反向请求：$method" }
    }

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
        if ($currentText -ne $candidateText) {
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
