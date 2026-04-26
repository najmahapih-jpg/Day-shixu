<#
.SYNOPSIS
  Prevent local-only secrets and private config from being committed to a public repo.

.DESCRIPTION
  FAIL:
    - local-only sensitive files are currently tracked by git

  WARN:
    - unacknowledged local-only files appeared in git history before and may need history cleanup
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
  @{ Label = 'cloud function runtime-config.local.json'; Regex = '^cloudfunctions[\\/].+[\\/]runtime-config\.local\.json$' }
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

$publicPlaceholderEnvId = 'cloud-public-placeholder-env'
$publicPlaceholderAppId = 'wx0000000000000000'

function Assert-PublicPlaceholder {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$ExpectedValue,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  $matches = [regex]::Matches($content, $Pattern)
  foreach ($match in $matches) {
    $value = [string]$match.Groups[1].Value
    if (-not [string]::IsNullOrWhiteSpace($value) -and $value -ne $ExpectedValue) {
      Fail ("Tracked public-repo identifier must be placeholder in $Path [$Label]: $value")
    }
  }
}

Write-Host "  Auditing tracked public-repo identifiers...`n"

Assert-PublicPlaceholder -Path (Join-Path $projectRoot 'cloudbaserc.json') -Pattern '"envId"\s*:\s*"([^"]+)"' -ExpectedValue $publicPlaceholderEnvId -Label 'cloudbaserc envId'
Assert-PublicPlaceholder -Path (Join-Path $projectRoot 'project.config.json') -Pattern '"appid"\s*:\s*"([^"]+)"' -ExpectedValue $publicPlaceholderAppId -Label 'project config appid'
Assert-PublicPlaceholder -Path (Join-Path $projectRoot 'manifest.json') -Pattern '"mp-weixin"\s*:\s*\{[\s\S]*?"appid"\s*:\s*"([^"]+)"' -ExpectedValue $publicPlaceholderAppId -Label 'manifest mp-weixin appid'
Assert-PublicPlaceholder -Path (Join-Path $projectRoot 'utils\cloudEnv.ts') -Pattern "CLOUD_ENV_ID\s*=\s*'([^']+)'" -ExpectedValue $publicPlaceholderEnvId -Label 'tracked cloud env export'
Assert-PublicPlaceholder -Path (Join-Path $projectRoot 'config\release-environments.json') -Pattern '"cloudEnvId"\s*:\s*"([^"]*)"' -ExpectedValue $publicPlaceholderEnvId -Label 'tracked release env cloudEnvId'
Assert-PublicPlaceholder -Path (Join-Path $projectRoot 'config\release-environments.json') -Pattern '"miniprogramAppId"\s*:\s*"([^"]*)"' -ExpectedValue $publicPlaceholderAppId -Label 'tracked release env miniprogramAppId'

$historyFiles = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'releases\history') -Recurse -File -Filter '*.json' -ErrorAction SilentlyContinue
foreach ($historyFile in $historyFiles) {
  Assert-PublicPlaceholder -Path $historyFile.FullName -Pattern '"envId"\s*:\s*"([^"]+)"' -ExpectedValue $publicPlaceholderEnvId -Label 'release history envId'
  Assert-PublicPlaceholder -Path $historyFile.FullName -Pattern '"appid"\s*:\s*"([^"]+)"' -ExpectedValue $publicPlaceholderAppId -Label 'release history appid'
}

$historyAuditTargets = @(
  '.wxci',
  'project.private.config.json',
  'config/release-environments.local.json',
  'cloudfunctions/*/runtime-config.local.json'
)

$acknowledgedHistoryHits = @{
  # Audited in docs/RELEASE_HANDOFF.md:
  # This was a WeChat DevTools private config without private keys, tokens, or cloud credentials.
  # Keep warning on any future, unaudited commits that touch the same path.
  'project.private.config.json' = @(
    'aea7e29016deef1f5b9ee78eaca44ade7c1ce81d',
    '7e334383a0f2e7af5cf540493d987d907f68dad5'
  )
}

foreach ($target in $historyAuditTargets) {
  $historyHits = @(& git -C $projectRoot log --all --format=%H -- $target 2>$null) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  if ($historyHits.Count -gt 0) {
    $acknowledgedHits = @()
    if ($acknowledgedHistoryHits.ContainsKey($target)) {
      $acknowledgedHits = @($acknowledgedHistoryHits[$target])
    }

    $unacknowledgedHits = @($historyHits | Where-Object { $acknowledgedHits -notcontains $_ })
    if ($unacknowledgedHits.Count -gt 0) {
      $latestCommit = $unacknowledgedHits[0]
      Warn ("Sensitive path appears in git history: " + $target + " (latest unacknowledged hit " + $latestCommit + ")")
    } else {
      Pass ("Acknowledged non-secret git history hit for " + $target + " (" + $historyHits.Count + " audited commit(s))")
    }
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
