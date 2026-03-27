<#
.SYNOPSIS
  Scan the main frontend source tree for development artifacts that must not reach production.

  FAIL (exit 1): debugger, localhost, 127.0.0.1
  WARN (exit 0): console.log, FIXME, HACK

  Add "// hygiene-ignore" anywhere on a line to exempt that specific line.

.SCOPE
  Scans: pages/ components/ composables/ services/ stores/ utils/ styles/ App.vue main.js
  Excludes: cloudfunctions/ src/ scripts/ docs/ node_modules/ unpackage/ _mp_devtools/ .verify/
#>

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = Resolve-Path (Join-Path $scriptDir '..')

$failCount = 0
$warnCount = 0

function Report-Match($level, $file, $lineNum, $line, $pattern) {
  $rel = $file.FullName.Replace($projectRoot.Path, '').TrimStart('\').TrimStart('/')
  $trimmed = $line.Trim()
  if ($level -eq 'FAIL') {
    Write-Host "  [FAIL] ${rel}:${lineNum}  ($pattern)" -ForegroundColor Red
    Write-Host "         $trimmed" -ForegroundColor DarkRed
    $script:failCount++
  } else {
    Write-Host "  [WARN] ${rel}:${lineNum}  ($pattern)" -ForegroundColor Yellow
    Write-Host "         $trimmed" -ForegroundColor DarkYellow
    $script:warnCount++
  }
}

# ── File targets ──
$scanPaths = @(
  'pages', 'components', 'composables', 'services', 'stores', 'utils', 'styles'
) | ForEach-Object { Join-Path $projectRoot $_ } | Where-Object { Test-Path $_ }

$rootFiles = @('App.vue', 'main.js') |
  ForEach-Object { Join-Path $projectRoot $_ } |
  Where-Object { Test-Path $_ } |
  ForEach-Object { Get-Item $_ }

$allFiles = @()
foreach ($dir in $scanPaths) {
  $allFiles += Get-ChildItem -Path $dir -Recurse -Include '*.vue','*.ts','*.js' -File
}
$allFiles += $rootFiles

# ── Rules ──
# [pattern, level, description]
$rules = @(
  @{ Pattern = 'debugger';   Level = 'FAIL'; Regex = '\bdebugger\b' }
  @{ Pattern = 'localhost';  Level = 'FAIL'; Regex = 'localhost' }
  @{ Pattern = '127.0.0.1'; Level = 'FAIL'; Regex = '127\.0\.0\.1' }
  @{ Pattern = 'console.log'; Level = 'WARN'; Regex = 'console\.log\s*\(' }
  @{ Pattern = 'FIXME';      Level = 'WARN'; Regex = '\bFIXME\b' }
  @{ Pattern = 'HACK';       Level = 'WARN'; Regex = '\bHACK\b' }
)

Write-Host "`n[check:hygiene]" -ForegroundColor Cyan
Write-Host "  Scanning $($allFiles.Count) files in main source tree...`n"

foreach ($file in $allFiles) {
  $lines = Get-Content $file.FullName -ErrorAction SilentlyContinue
  if (-not $lines) { continue }

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    # Skip hygiene-ignore lines
    if ($line -match 'hygiene-ignore') { continue }

    foreach ($rule in $rules) {
      if ($line -match $rule.Regex) {
        Report-Match $rule.Level $file ($i + 1) $line $rule.Pattern
      }
    }
  }
}

Write-Host ""
if ($failCount -gt 0) {
  Write-Host "  Result: FAIL — $failCount blocking issue(s), $warnCount warning(s)" -ForegroundColor Red
  Write-Host "  Fix FAIL items or add '// hygiene-ignore' to exempt a specific line.`n" -ForegroundColor DarkRed
  exit 1
} elseif ($warnCount -gt 0) {
  Write-Host "  Result: PASS with $warnCount warning(s)" -ForegroundColor Yellow
  Write-Host "  Warnings do not block release.`n" -ForegroundColor DarkYellow
  exit 0
} else {
  Write-Host "  Result: PASS — no issues found`n" -ForegroundColor Green
  exit 0
}
