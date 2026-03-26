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

# ── Step 2: Install ALL cloud function dependencies ──
$cfNames = @('user', 'habit', 'ritual', 'stats', 'ai', 'notify', 'journey')
Write-Host "[2/6] Installing cloud function dependencies..."
foreach ($cfName in $cfNames) {
  $cfDir = Join-Path $projectRoot "cloudfunctions\$cfName"
  $cfPkg = Join-Path $cfDir 'package.json'
  if (Test-Path $cfPkg) {
    Write-Host "  -> $cfName" -ForegroundColor DarkGray
    Push-Location $cfDir
    try {
      npm install --omit=dev --no-audit --no-fund 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { throw "npm install failed in cloudfunctions/$cfName" }
    } finally {
      Pop-Location
    }
  }
}
Write-Host "[2/6] All dependencies installed." -ForegroundColor Green

# ── Step 3: Deploy ALL cloud functions ──
Write-Host "[3/6] Deploying all cloud functions..."
$cfScript = Join-Path $scriptDirResolved 'cloudbase-fn.ps1'
& $cfScript deployAll
Write-Host "[3/6] All cloud functions deployed." -ForegroundColor Green

# ── Step 4: Prepare WeChat DevTools project ──
Write-Host "[4/6] Running prepare:wechat..."
Push-Location $projectRoot
try {
  npm run prepare:wechat 2>&1 | ForEach-Object { Write-Host "  $_" }
  if ($LASTEXITCODE -ne 0) { throw "prepare:wechat failed" }
} finally {
  Pop-Location
}
Write-Host "[4/6] DevTools project prepared." -ForegroundColor Green

# ── Step 5: Pre-flight checks ──
Write-Host "[5/6] Running pre-flight checks..."
$preflightScript = Join-Path $scriptDirResolved 'preflight-check.ps1'
if (Test-Path $preflightScript) {
  & $preflightScript
  if ($LASTEXITCODE -ne 0) { throw "Pre-flight checks failed" }
}
Write-Host "[5/6] Pre-flight checks passed." -ForegroundColor Green

# ── Step 6: Upload mini program ──
Write-Host "[6/6] Uploading mini program..."
$uploadScript = Join-Path $scriptDirResolved 'upload-miniprogram.js'
$uploadArgs = @('--version', $Version, '--robot', $Robot)
if (-not [string]::IsNullOrWhiteSpace($Desc)) {
  $uploadArgs += @('--desc', $Desc)
}
node $uploadScript @uploadArgs
if ($LASTEXITCODE -ne 0) { throw "Mini program upload failed" }
Write-Host "[6/6] Mini program uploaded." -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Release complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
