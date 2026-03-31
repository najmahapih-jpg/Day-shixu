<#
.SYNOPSIS
  Pre-flight checks before uploading WeChat Mini Program.
  Verifies critical items that would cause rejection or runtime failures.
#>

$ErrorActionPreference = 'Stop'
$failed = 0
$warnings = 0

function Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:failed++ }
function Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow; $script:warnings++ }

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

Write-Host "`nPre-flight Checks" -ForegroundColor Cyan
Write-Host "==================`n"

# ── 1. Content Security Check ──
Write-Host "1. Content Security (msgSecCheck)" -ForegroundColor White
$cfFiles = @('habit', 'user', 'ritual')
foreach ($cf in $cfFiles) {
  $path = Join-Path $projectRoot "cloudfunctions\$cf\index.js"
  if (Test-Path $path) {
    $content = Get-Content $path -Raw
    if ($content -match 'msgSecCheck') {
      Pass "$cf cloud function has msgSecCheck"
    } else {
      Fail "$cf cloud function MISSING msgSecCheck"
    }
  }
}

# ── 2. Template ID ──
Write-Host "`n2. Notification Template ID" -ForegroundColor White
$notifyPath = Join-Path $projectRoot 'cloudfunctions\notify\index.js'
$notifyContent = Get-Content $notifyPath -Raw
if ($notifyContent -match 'REPLACE_WITH_REAL') {
  Fail "notify still has placeholder TEMPLATE_ID"
} else {
  Pass "Template ID is set"
}

# ── 3. Privacy Check ──
Write-Host "`n3. Privacy Configuration" -ForegroundColor White
$manifestPath = Join-Path $projectRoot 'manifest.json'
$manifest = Get-Content $manifestPath -Raw
if ($manifest -match '__usePrivacyCheck__.*true') {
  Pass "Privacy check enabled"
} else {
  Fail "Privacy check NOT enabled in manifest.json"
}

# ── 4. Version Number ──
Write-Host "`n4. Version Configuration" -ForegroundColor White
if ($manifest -match '"versionName"\s*:\s*"(\d+\.\d+\.\d+)"') {
  $version = $Matches[1]
  Pass "Version: $version"
} else {
  Warn "Could not parse version from manifest.json"
}

# ── 5. Share Capability ──
Write-Host "`n5. Share Capability" -ForegroundColor White
$homePath = Join-Path $projectRoot 'pages\index\index.vue'
$homeContent = Get-Content $homePath -Raw
if ($homeContent -match 'onShareAppMessage') {
  Pass "Home page has onShareAppMessage"
} else {
  Warn "Home page missing onShareAppMessage"
}

# ── 6. Update Manager ──
Write-Host "`n6. Version Update Mechanism" -ForegroundColor White
$appPath = Join-Path $projectRoot 'App.vue'
$appContent = Get-Content $appPath -Raw
if ($appContent -match 'getUpdateManager') {
  Pass "App.vue has getUpdateManager"
} else {
  Fail "App.vue missing getUpdateManager"
}

# ── 7. Feedback Channel ──
Write-Host "`n7. User Feedback" -ForegroundColor White
$settingsPath = Join-Path $projectRoot 'pages\sub\settings\index.vue'
$settingsContent = Get-Content $settingsPath -Raw
if ($settingsContent -match 'open-type="feedback"') {
  Pass "Settings has feedback button"
} else {
  Fail "Settings missing feedback button"
}

# ── 8. Cloud Function Dependencies ──
Write-Host "`n8. Cloud Function Dependencies" -ForegroundColor White
$allCfs = @('user', 'habit', 'ritual', 'stats', 'ai', 'notify', 'journey')
foreach ($cf in $allCfs) {
  $nmPath = Join-Path $projectRoot "cloudfunctions\$cf\node_modules"
  if (Test-Path $nmPath) {
    Pass "$cf has node_modules"
  } else {
    Warn "$cf missing node_modules (run cf:deps first)"
  }
}

# ── 9. Ritual Store ──
Write-Host "`n9. Ritual Store Implementation" -ForegroundColor White
$ritualStorePath = Join-Path $projectRoot 'stores\ritual.ts'
$ritualContent = Get-Content $ritualStorePath -Raw
if ($ritualContent -match 'TODO') {
  Fail "stores/ritual.ts still has TODO stubs"
} else {
  Pass "Ritual store fully implemented"
}

# ── 10. Build Output ──
Write-Host "`n10. Build Output" -ForegroundColor White
$devtoolsDir = Join-Path $projectRoot '_mp_devtools'
$distDir = Join-Path $projectRoot 'unpackage\dist\dev\mp-weixin'
if (Test-Path (Join-Path $distDir 'app.json')) {
  Pass "mp-weixin build exists"
} else {
  Warn "mp-weixin build not found (build in HBuilderX first)"
}

# ── Summary ──
Write-Host "`n==================" -ForegroundColor Cyan
if ($failed -gt 0) {
  Write-Host "FAILED: $failed check(s) failed, $warnings warning(s)" -ForegroundColor Red
  exit 1
} elseif ($warnings -gt 0) {
  Write-Host "PASSED with $warnings warning(s)" -ForegroundColor Yellow
  exit 0
} else {
  Write-Host "ALL CHECKS PASSED" -ForegroundColor Green
  exit 0
}
