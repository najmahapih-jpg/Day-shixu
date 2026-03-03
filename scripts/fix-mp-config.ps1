$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
if (-not $scriptDir -and $MyInvocation.MyCommand.Path) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $scriptDir) {
  $scriptDir = (Get-Location).Path
}

$scriptDirResolved = (Resolve-Path -LiteralPath $scriptDir).Path
$repoRoot = Resolve-Path -LiteralPath (Split-Path -Parent $scriptDirResolved)
$rootConfigPath = Join-Path $repoRoot 'project.config.json'
$distConfigPath = Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin\project.config.json'

function Update-MiniprogramRoot {
  param(
    [Parameter(Mandatory = $true)][string]$ConfigPath,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$MiniprogramRoot
  )

  if (-not (Test-Path $ConfigPath)) {
    Write-Host "Skip: $ConfigPath (not found)"
    return
  }

  $json = Get-Content -Raw -Encoding UTF8 $ConfigPath | ConvertFrom-Json
  $json.miniprogramRoot = $MiniprogramRoot
  $output = $json | ConvertTo-Json -Depth 64
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $filePath = (Get-Item -LiteralPath $ConfigPath).FullName
  [System.IO.File]::WriteAllText($filePath, $output, $utf8NoBom)
  Write-Host "Updated: $ConfigPath -> miniprogramRoot='$MiniprogramRoot'"
}

# 稳定策略（适配 HBuilderX -> 微信开发者工具）：
# - root 与 dist 都设为空字符串
# - 避免 dist 工程出现 miniprogramRoot 二次拼接
Update-MiniprogramRoot -ConfigPath $rootConfigPath -MiniprogramRoot ''
Update-MiniprogramRoot -ConfigPath $distConfigPath -MiniprogramRoot ''

if (Test-Path (Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin\app.json')) {
  Write-Host 'Check: unpackage/dist/dev/mp-weixin/app.json exists'
} else {
  Write-Host 'Warning: unpackage/dist/dev/mp-weixin/app.json is missing'
}
