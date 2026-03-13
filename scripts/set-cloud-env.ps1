param(
  [Parameter(Mandatory = $true)]
  [string]$EnvId
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
$repoRoot = Resolve-Path -LiteralPath (Split-Path -Parent $scriptDirResolved)

function Write-JsonNoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Object
  )
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $json = $Object | ConvertTo-Json -Depth 64
  $fullPath = (Get-Item -LiteralPath $Path).FullName
  [System.IO.File]::WriteAllText($fullPath, $json, $utf8NoBom)
}

if ([string]::IsNullOrWhiteSpace($EnvId)) {
  throw 'EnvId cannot be empty'
}

$updated = @()

# 1) cloudbaserc.json
$cloudbaseRc = Join-Path $repoRoot 'cloudbaserc.json'
if (Test-Path $cloudbaseRc) {
  $cfg = Get-Content -Raw -Encoding UTF8 $cloudbaseRc | ConvertFrom-Json
  $cfg.envId = $EnvId
  Write-JsonNoBom -Path $cloudbaseRc -Object $cfg
  $updated += $cloudbaseRc
}

# 2) project.private.config.json files used by DevTools
$privateConfigs = @(
  (Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin\project.private.config.json'),
  (Join-Path $repoRoot '_mp_devtools\project.private.config.json')
)

foreach ($cfgPath in $privateConfigs) {
  if (-not (Test-Path $cfgPath)) { continue }
  $cfg = Get-Content -Raw -Encoding UTF8 $cfgPath | ConvertFrom-Json
  if (-not $cfg.cloud) {
    $cfg | Add-Member -NotePropertyName cloud -NotePropertyValue ([pscustomobject]@{})
  }
  $cfg.cloud.type = 'tcb'
  $cfg.cloud.env = $EnvId
  Write-JsonNoBom -Path $cfgPath -Object $cfg
  $updated += $cfgPath
}

# 3) utils/cloudEnv.ts (runtime explicit env)
$cloudEnvTsPath = Join-Path $repoRoot 'utils\cloudEnv.ts'
$cloudEnvTsPathForIo = $cloudEnvTsPath
if ($cloudEnvTsPathForIo -like 'Microsoft.PowerShell.Core\FileSystem::*') {
  $cloudEnvTsPathForIo = $cloudEnvTsPathForIo -replace '^Microsoft\.PowerShell\.Core\\FileSystem::', ''
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$cloudEnvTsContent = @"
// Single source of truth for Mini Program cloud env.
// Keep this in sync with cloudbaserc.json envId.
export const CLOUD_ENV_ID = '$EnvId'
"@
[System.IO.File]::WriteAllText($cloudEnvTsPathForIo, $cloudEnvTsContent, $utf8NoBom)
$updated += $cloudEnvTsPath

Write-Host "Cloud env updated to: $EnvId"
if ($updated.Count -gt 0) {
  Write-Host 'Updated files:'
  $updated | ForEach-Object { Write-Host "- $_" }
} else {
  Write-Host 'No target files found to update.'
}
