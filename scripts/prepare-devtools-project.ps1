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
$sourceDir = Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin'
$targetDir = Join-Path $repoRoot '_mp_devtools'
$targetConfig = Join-Path $targetDir 'project.config.json'
$targetAppJson = Join-Path $targetDir 'app.json'

if (-not (Test-Path $sourceDir)) {
  throw "Source not found: $sourceDir. Please build mp-weixin first."
}

if (-not (Test-Path (Join-Path $sourceDir 'app.json'))) {
  throw "Source app.json missing: $sourceDir\\app.json. Please build mp-weixin first."
}

if (Test-Path $targetDir) {
  Remove-Item -Path $targetDir -Recurse -Force
}

New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
Copy-Item -Path (Join-Path $sourceDir '*') -Destination $targetDir -Recurse -Force

if (-not (Test-Path $targetConfig)) {
  throw "project.config.json missing in target: $targetConfig"
}

$cfg = Get-Content -Raw -Encoding UTF8 $targetConfig | ConvertFrom-Json
$cfg.miniprogramRoot = ''
$cfg.cloudfunctionRoot = 'cloudfunctions/'

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$targetConfigPath = (Get-Item -LiteralPath $targetConfig).FullName
[System.IO.File]::WriteAllText($targetConfigPath, ($cfg | ConvertTo-Json -Depth 64), $utf8NoBom)

if (-not (Test-Path $targetAppJson)) {
  throw "Target app.json missing: $targetAppJson"
}

Write-Host "Prepared DevTools project at: $targetDir"
Write-Host "Import this directory in WeChat DevTools."
