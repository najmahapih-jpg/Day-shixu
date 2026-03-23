param(
  [string]$Version = '1.0.0',
  [string]$Desc = '',
  [int]$Robot = 1
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
if (-not $scriptDir -and $MyInvocation.MyCommand.Path) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $scriptDir) {
  $scriptDir = (Get-Location).Path
}
$scriptDirResolved = (Resolve-Path -LiteralPath $scriptDir).Path
$projectRoot = Resolve-Path -LiteralPath (Split-Path -Parent $scriptDirResolved)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Release WeChat Mini Program" -ForegroundColor Cyan
Write-Host "  Version: $Version  Robot: $Robot" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── Step 1: Validate mp-weixin build exists ──
$distAppJson = Join-Path $projectRoot 'unpackage\dist\dev\mp-weixin\app.json'
if (-not (Test-Path $distAppJson)) {
  throw @"
mp-weixin build not found at:
  $distAppJson

Please build in HBuilderX first (Run > Build > mp-weixin).
"@
}
Write-Host "[1/5] mp-weixin build verified." -ForegroundColor Green

# ── Step 2: Install user cloud function dependencies ──
$userCfDir = Join-Path $projectRoot 'cloudfunctions\user'
Write-Host "[2/5] Installing user cloud function dependencies..."
Push-Location $userCfDir
try {
  npm install --omit=dev --no-audit --no-fund 2>&1 | ForEach-Object { Write-Host "  $_" }
  if ($LASTEXITCODE -ne 0) { throw "npm install failed in cloudfunctions/user" }
} finally {
  Pop-Location
}
Write-Host "[2/5] Dependencies installed." -ForegroundColor Green

# ── Step 3: Deploy user cloud function ──
Write-Host "[3/5] Deploying user cloud function..."
$cfScript = Join-Path $scriptDirResolved 'cloudbase-fn.ps1'
& $cfScript deploy user
Write-Host "[3/5] User cloud function deployed." -ForegroundColor Green

# ── Step 4: Prepare WeChat DevTools project ──
Write-Host "[4/5] Running prepare:wechat..."
Push-Location $projectRoot
try {
  npm run prepare:wechat 2>&1 | ForEach-Object { Write-Host "  $_" }
  if ($LASTEXITCODE -ne 0) { throw "prepare:wechat failed" }
} finally {
  Pop-Location
}
Write-Host "[4/5] DevTools project prepared." -ForegroundColor Green

# ── Step 5: Upload mini program ──
Write-Host "[5/5] Uploading mini program..."
$uploadScript = Join-Path $scriptDirResolved 'upload-miniprogram.js'
$uploadArgs = @('--version', $Version, '--robot', $Robot)
if (-not [string]::IsNullOrWhiteSpace($Desc)) {
  $uploadArgs += @('--desc', $Desc)
}
node $uploadScript @uploadArgs
if ($LASTEXITCODE -ne 0) { throw "Mini program upload failed" }
Write-Host "[5/5] Mini program uploaded." -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Release complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
