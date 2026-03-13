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

$didFullRebuild = $true
if (Test-Path $targetDir) {
  try {
    Remove-Item -Path $targetDir -Recurse -Force -ErrorAction Stop
  } catch {
    $didFullRebuild = $false
    Write-Warning "Target directory is in use. Falling back to incremental overwrite: $targetDir"
  }
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

$vendorPath = Join-Path $targetDir 'common\vendor.js'
if (Test-Path $vendorPath) {
  $vendorContent = Get-Content -Raw -Encoding UTF8 $vendorPath
  $needle = 'initRuntimeSocketService();'
  if ($vendorContent.Contains($needle)) {
    $patched = $vendorContent.Replace(
      $needle,
      "// Runtime socket channel disabled to avoid noisy 127.0.0.1:8090 errors in WeChat DevTools.`r`n// initRuntimeSocketService();"
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $vendorFullPath = (Get-Item -LiteralPath $vendorPath).FullName
    [System.IO.File]::WriteAllText($vendorFullPath, $patched, $utf8NoBom)
    Write-Host "Patched: disabled runtime socket channel in $vendorPath"
  }
}

Write-Host "Prepared DevTools project at: $targetDir"
if (-not $didFullRebuild) {
  Write-Host "Note: incremental overwrite mode was used because _mp_devtools was locked."
  Write-Host "For a clean rebuild, close WeChat DevTools and run this script again."
}
Write-Host "Import this directory in WeChat DevTools."
