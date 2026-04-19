param(
  [Parameter(ParameterSetName = 'ByName')]
  [string]$Name = '',

  [Parameter(ParameterSetName = 'ByEnvId')]
  [string]$EnvId = '',

  [Parameter(ParameterSetName = 'List')]
  [switch]$ListAvailable,

  [string]$ConfigPath = ''
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
  $fullPath = $Path
  if (Test-Path $Path) {
    $fullPath = (Get-Item -LiteralPath $Path).FullName
  }
  [System.IO.File]::WriteAllText($fullPath, $json, $utf8NoBom)
}

function Set-OrAddProperty {
  param(
    [Parameter(Mandatory = $true)]$Target,
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)]$Value
  )

  if ($Target.PSObject.Properties.Name -contains $Name) {
    $Target.$Name = $Value
  } else {
    $Target | Add-Member -NotePropertyName $Name -NotePropertyValue $Value -Force
  }
}

function Resolve-EnvironmentConfigPath {
  param([string]$ConfigPath)

  if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    $localConfigPath = Join-Path $repoRoot 'config\release-environments.local.json'
    if (Test-Path -LiteralPath $localConfigPath) {
      return $localConfigPath
    }
    return (Join-Path $repoRoot 'config\release-environments.json')
  }
  return (Join-Path $repoRoot $ConfigPath)
}

function Load-EnvironmentConfig {
  param([string]$ResolvedConfigPath)

  if (-not (Test-Path $ResolvedConfigPath)) {
    throw "Environment config not found: $ResolvedConfigPath"
  }

  $cfg = Get-Content -Raw -Encoding UTF8 $ResolvedConfigPath | ConvertFrom-Json
  if (-not $cfg.environments) {
    throw "Invalid environment config: missing environments in $ResolvedConfigPath"
  }

  return $cfg
}

function Resolve-EnvironmentNode {
  param(
    [Parameter(Mandatory = $true)][string]$EnvironmentName,
    [Parameter(Mandatory = $true)]$Config
  )

  $envNode = $Config.environments.$EnvironmentName
  if (-not $envNode) {
    throw "Environment '$EnvironmentName' not found in release environment config."
  }

  return $envNode
}

function Write-NotifyRuntimeConfig {
  param(
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$TemplateId
  )

  $notifyConfigPath = Join-Path $RepoRoot 'cloudfunctions\notify\runtime-config.local.json'
  $payload = [ordered]@{
    subscribeTemplateId = $TemplateId
  }

  Write-JsonNoBom -Path $notifyConfigPath -Object $payload
  return $notifyConfigPath
}

$resolvedConfigPath = Resolve-EnvironmentConfigPath -ConfigPath $ConfigPath
$config = Load-EnvironmentConfig -ResolvedConfigPath $resolvedConfigPath
$localOverrideConfigPath = Join-Path $repoRoot 'config\release-environments.local.json'
$usesLocalOverrideConfig = (Test-Path -LiteralPath $localOverrideConfigPath) -and ((Resolve-Path -LiteralPath $resolvedConfigPath).Path -eq (Resolve-Path -LiteralPath $localOverrideConfigPath).Path)

if ($ListAvailable) {
  $defaultName = [string]$config.defaultEnvironment
  Write-Host "Available environments from: $resolvedConfigPath"
  foreach ($prop in $config.environments.PSObject.Properties) {
    $envName = [string]$prop.Name
    $envNode = $prop.Value
    $status = if ([string]::IsNullOrWhiteSpace([string]$envNode.status)) { 'UNCONFIGURED' } else { [string]$envNode.status }
    $defaultSuffix = if ($envName -eq $defaultName) { ' (default)' } else { '' }
    $templateState = if ([string]::IsNullOrWhiteSpace([string]$envNode.notifyTemplateId)) { 'template=<empty>' } else { 'template=<set>' }
    Write-Host ("- {0}{1} [{2}] envId={3} appid={4} {5}" -f $envName, $defaultSuffix, $status, $envNode.cloudEnvId, $envNode.miniprogramAppId, $templateState)
  }
  exit 0
}

$resolvedName = ''
$resolvedStatus = ''
$resolvedEnvId = ''
$resolvedAppId = ''
$resolvedNotifyTemplateId = ''

if (-not [string]::IsNullOrWhiteSpace($Name)) {
  $resolvedName = $Name
  $envNode = Resolve-EnvironmentNode -EnvironmentName $Name -Config $config
  $resolvedStatus = [string]$envNode.status
  $resolvedEnvId = [string]$envNode.cloudEnvId
  $resolvedAppId = [string]$envNode.miniprogramAppId
  $resolvedNotifyTemplateId = [string]$envNode.notifyTemplateId

  if ($resolvedStatus -eq 'INVALID') {
    throw "Environment '$Name' is marked INVALID and cannot be applied."
  }

  if ([string]::IsNullOrWhiteSpace($resolvedEnvId) -or [string]::IsNullOrWhiteSpace($resolvedAppId)) {
    throw "Environment '$Name' is not fully configured yet (missing cloudEnvId or miniprogramAppId)."
  }
  if (-not [string]::IsNullOrWhiteSpace($resolvedStatus) -and $resolvedStatus -eq 'READY' -and [string]::IsNullOrWhiteSpace($resolvedNotifyTemplateId)) {
    throw "Environment '$Name' is marked READY but notifyTemplateId is empty."
  }
} elseif (-not [string]::IsNullOrWhiteSpace($EnvId)) {
  $resolvedName = 'custom'
  $resolvedStatus = 'CUSTOM'
  $resolvedEnvId = $EnvId
  $resolvedAppId = ''
  $resolvedNotifyTemplateId = ''
} else {
  throw "Usage: set-cloud-env.ps1 -Name dev | -EnvId <envId> | -ListAvailable"
}

$updated = @()

if ($usesLocalOverrideConfig -and -not [string]::IsNullOrWhiteSpace($resolvedName) -and (Test-Path -LiteralPath $resolvedConfigPath)) {
  $config.defaultEnvironment = $resolvedName
  Write-JsonNoBom -Path $resolvedConfigPath -Object $config
  $updated += $resolvedConfigPath
}

# 1) cloudbaserc.json
$cloudbaseRc = Join-Path $repoRoot 'cloudbaserc.json'
if (-not $usesLocalOverrideConfig -and (Test-Path $cloudbaseRc)) {
  $cfg = Get-Content -Raw -Encoding UTF8 $cloudbaseRc | ConvertFrom-Json
  $cfg.envId = $resolvedEnvId
  Write-JsonNoBom -Path $cloudbaseRc -Object $cfg
  $updated += $cloudbaseRc
}

# 2) project.config.json + generated build configs
$projectConfigPaths = @(
  (Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin\project.config.json'),
  (Join-Path $repoRoot '_mp_devtools\project.config.json')
)

if (-not $usesLocalOverrideConfig) {
  $projectConfigPaths = @((Join-Path $repoRoot 'project.config.json')) + $projectConfigPaths
}

if (-not [string]::IsNullOrWhiteSpace($resolvedAppId)) {
  foreach ($cfgPath in $projectConfigPaths) {
    if (-not (Test-Path $cfgPath)) { continue }
    $cfg = Get-Content -Raw -Encoding UTF8 $cfgPath | ConvertFrom-Json
    $cfg.appid = $resolvedAppId
    Write-JsonNoBom -Path $cfgPath -Object $cfg
    $updated += $cfgPath
  }
}

# 3) project.private.config.json files used by DevTools
$privateConfigs = @(
  (Join-Path $repoRoot 'project.private.config.json'),
  (Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin\project.private.config.json'),
  (Join-Path $repoRoot '_mp_devtools\project.private.config.json')
)

foreach ($cfgPath in $privateConfigs) {
  if (-not (Test-Path $cfgPath)) { continue }
  $cfg = Get-Content -Raw -Encoding UTF8 $cfgPath | ConvertFrom-Json
  if (-not $cfg.cloud) {
    $cfg | Add-Member -NotePropertyName cloud -NotePropertyValue ([pscustomobject]@{})
  }
  Set-OrAddProperty -Target $cfg.cloud -Name 'type' -Value 'tcb'
  Set-OrAddProperty -Target $cfg.cloud -Name 'env' -Value $resolvedEnvId
  if (-not [string]::IsNullOrWhiteSpace($resolvedAppId) -and ($cfg.PSObject.Properties.Name -contains 'appid')) {
    $cfg.appid = $resolvedAppId
  }
  Write-JsonNoBom -Path $cfgPath -Object $cfg
  $updated += $cfgPath
}

# 4) utils/cloudEnv.ts
$cloudEnvTsPath = Join-Path $repoRoot 'utils\cloudEnv.ts'
if (-not $usesLocalOverrideConfig) {
  $cloudEnvTsFullPath = $cloudEnvTsPath
  if ($cloudEnvTsFullPath -like 'Microsoft.PowerShell.Core\FileSystem::*') {
    $cloudEnvTsFullPath = $cloudEnvTsFullPath -replace '^Microsoft\.PowerShell\.Core\\FileSystem::', ''
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $cloudEnvTsContent = @"
// Generated / maintained by scripts/set-cloud-env.ps1.
// Keep these values aligned with cloudbaserc.json and config/release-environments.json.

export const CLOUD_ENV_NAME = '$resolvedName'
export const CLOUD_ENV_ID = '$resolvedEnvId'
"@
  [System.IO.File]::WriteAllText($cloudEnvTsFullPath, $cloudEnvTsContent, $utf8NoBom)
  $updated += $cloudEnvTsPath
}

# 5) notify runtime config
if (-not [string]::IsNullOrWhiteSpace($resolvedNotifyTemplateId)) {
  $notifyRuntimeConfigPath = Write-NotifyRuntimeConfig -RepoRoot $repoRoot -TemplateId $resolvedNotifyTemplateId
  $updated += $notifyRuntimeConfigPath
}

Write-Host "Cloud environment context updated."
Write-Host ("- name:   " + $resolvedName)
Write-Host ("- status: " + $resolvedStatus)
Write-Host ("- envId:  " + $resolvedEnvId)
if (-not [string]::IsNullOrWhiteSpace($resolvedAppId)) {
  Write-Host ("- appid:  " + $resolvedAppId)
}
if ($updated.Count -gt 0) {
  Write-Host 'Updated files:'
  $updated | Sort-Object -Unique | ForEach-Object { Write-Host "- $_" }
} else {
  Write-Host 'No target files found to update.'
}
