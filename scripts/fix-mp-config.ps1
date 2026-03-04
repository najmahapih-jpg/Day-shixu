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

# 稳定策略（兼容两种导入方式）：
# - 导入仓库根目录时：root 指向 dist，避免 root 下无 app.json 报错
# - 导入 dist 目录时：dist 设为空，避免路径二次拼接
$distApp = Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin\app.json'
if (Test-Path $distApp) {
  Update-MiniprogramRoot -ConfigPath $rootConfigPath -MiniprogramRoot 'unpackage/dist/dev/mp-weixin/'
} else {
  Update-MiniprogramRoot -ConfigPath $rootConfigPath -MiniprogramRoot ''
}
Update-MiniprogramRoot -ConfigPath $distConfigPath -MiniprogramRoot ''

if (Test-Path (Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin\app.json')) {
  Write-Host 'Check: unpackage/dist/dev/mp-weixin/app.json exists'
} else {
  Write-Host 'Warning: unpackage/dist/dev/mp-weixin/app.json is missing'
}
