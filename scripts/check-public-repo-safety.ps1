<#
.SYNOPSIS
  Prevent local-only secrets and private config from being committed to a public repo.

.DESCRIPTION
  FAIL:
    - local-only sensitive files are currently tracked by git

  WARN:
    - known local-only files appeared in git history before and may need history cleanup
#>

$ErrorActionPreference = 'Stop'

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path

$failCount = 0
$warnCount = 0

function Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:failCount++ }
function Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow; $script:warnCount++ }

Write-Host "`n[check:repo-safety]" -ForegroundColor Cyan
Write-Host "  Auditing public-repo sensitive paths...`n"

$trackedFiles = @(& git -C $projectRoot ls-files) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

$trackedSensitivePatterns = @(
  @{ Label = '.wxci private keys'; Regex = '^(?:\.wxci/|\.wxci\\)' }
  @{ Label = 'project.private.config.json'; Regex = '(^|[\\/])project\.private\.config\.json$' }
  @{ Label = 'config/release-environments.local.json'; Regex = '^config[\\/]release-environments\.local\.json$' }
  @{ Label = '.env files'; Regex = '(^|[\\/])\.env(\..+)?$' }
  @{ Label = '.pem files'; Regex = '\.pem$' }
  @{ Label = '.p12 files'; Regex = '\.p12$' }
  @{ Label = '.key files'; Regex = '\.key$' }
)

$trackedSensitiveHits = @()
foreach ($trackedFile in $trackedFiles) {
  foreach ($pattern in $trackedSensitivePatterns) {
    if ($trackedFile -match $pattern.Regex) {
      $trackedSensitiveHits += [PSCustomObject]@{
        Path = $trackedFile
        Label = $pattern.Label
      }
      break
    }
  }
}

if ($trackedSensitiveHits.Count -gt 0) {
  foreach ($hit in $trackedSensitiveHits) {
    Fail ("Tracked sensitive file: " + $hit.Path + " [" + $hit.Label + "]")
  }
} else {
  Pass 'No local-only sensitive files are tracked by git'
}

$historyAuditTargets = @(
  '.wxci',
  'project.private.config.json',
  'config/release-environments.local.json'
)

foreach ($target in $historyAuditTargets) {
  $historyHits = @(& git -C $projectRoot log --all --format=%H -- $target 2>$null) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  if ($historyHits.Count -gt 0) {
    $latestCommit = $historyHits[0]
    Warn ("Sensitive path appears in git history: " + $target + " (latest hit " + $latestCommit + ")")
  } else {
    Pass ("No git history hits for " + $target)
  }
}

Write-Host ""
if ($failCount -gt 0) {
  Write-Host ("  Result: FAIL - " + $failCount + " blocking issue(s), " + $warnCount + " warning(s)") -ForegroundColor Red
  exit 1
}

if ($warnCount -gt 0) {
  Write-Host ("  Result: PASS with " + $warnCount + " warning(s)") -ForegroundColor Yellow
  Write-Host "  Warnings do not block local work, but public-repo history cleanup should be considered." -ForegroundColor DarkYellow
  exit 0
}

Write-Host "  Result: PASS - no current public-repo safety issues found" -ForegroundColor Green
exit 0
