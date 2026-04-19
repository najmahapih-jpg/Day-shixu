$script:PUBLIC_PLACEHOLDER_CLOUD_ENV_ID = 'cloud-public-placeholder-env'
$script:PUBLIC_PLACEHOLDER_WECHAT_APP_ID = 'wx0000000000000000'

function Get-PublicPlaceholderCloudEnvId {
  return $script:PUBLIC_PLACEHOLDER_CLOUD_ENV_ID
}

function Get-PublicPlaceholderWechatAppId {
  return $script:PUBLIC_PLACEHOLDER_WECHAT_APP_ID
}

function Test-PlaceholderCloudEnvId {
  param([string]$Value)
  return [string]::IsNullOrWhiteSpace($Value) -or $Value -eq $script:PUBLIC_PLACEHOLDER_CLOUD_ENV_ID
}

function Test-PlaceholderWechatAppId {
  param([string]$Value)
  return [string]::IsNullOrWhiteSpace($Value) -or $Value -eq $script:PUBLIC_PLACEHOLDER_WECHAT_APP_ID
}

function Read-JsonFileIfExists {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Get-TrackedReleaseEnvironmentConfigPath {
  param([string]$RepoRoot)
  return Join-Path $RepoRoot 'config\release-environments.json'
}

function Get-LocalReleaseEnvironmentConfigPath {
  param([string]$RepoRoot)
  return Join-Path $RepoRoot 'config\release-environments.local.json'
}

function Get-TrackedReleaseEnvironmentConfig {
  param([string]$RepoRoot)
  return Read-JsonFileIfExists -Path (Get-TrackedReleaseEnvironmentConfigPath -RepoRoot $RepoRoot)
}

function Get-LocalReleaseEnvironmentConfig {
  param([string]$RepoRoot)
  return Read-JsonFileIfExists -Path (Get-LocalReleaseEnvironmentConfigPath -RepoRoot $RepoRoot)
}

function Get-ConfiguredEnvironmentNameFromCloudEnvTs {
  param([string]$RepoRoot)

  $cloudEnvTsPath = Join-Path $RepoRoot 'utils\cloudEnv.ts'
  if (-not (Test-Path -LiteralPath $cloudEnvTsPath)) {
    return ''
  }

  $cloudEnvTs = Get-Content -LiteralPath $cloudEnvTsPath -Raw -Encoding UTF8
  if ($cloudEnvTs -match "CLOUD_ENV_NAME\s*=\s*'([^']+)'") {
    return [string]$Matches[1]
  }

  return ''
}

function Resolve-EffectiveEnvironmentName {
  param([string]$RepoRoot)

  $configuredName = Get-ConfiguredEnvironmentNameFromCloudEnvTs -RepoRoot $RepoRoot
  if (-not [string]::IsNullOrWhiteSpace($configuredName)) {
    return $configuredName
  }

  $localConfig = Get-LocalReleaseEnvironmentConfig -RepoRoot $RepoRoot
  if ($localConfig -and -not [string]::IsNullOrWhiteSpace([string]$localConfig.defaultEnvironment)) {
    return [string]$localConfig.defaultEnvironment
  }

  $trackedConfig = Get-TrackedReleaseEnvironmentConfig -RepoRoot $RepoRoot
  if ($trackedConfig -and -not [string]::IsNullOrWhiteSpace([string]$trackedConfig.defaultEnvironment)) {
    return [string]$trackedConfig.defaultEnvironment
  }

  return 'dev'
}

function Resolve-EffectiveReleaseBinding {
  param(
    [string]$RepoRoot,
    [string]$EnvironmentName = ''
  )

  $trackedConfig = Get-TrackedReleaseEnvironmentConfig -RepoRoot $RepoRoot
  $localConfig = Get-LocalReleaseEnvironmentConfig -RepoRoot $RepoRoot
  $resolvedName = if ([string]::IsNullOrWhiteSpace($EnvironmentName)) {
    Resolve-EffectiveEnvironmentName -RepoRoot $RepoRoot
  } else {
    $EnvironmentName
  }

  $trackedNode = $null
  if ($trackedConfig -and $trackedConfig.environments) {
    $trackedNode = $trackedConfig.environments.$resolvedName
  }

  $localNode = $null
  if ($localConfig -and $localConfig.environments) {
    $localNode = $localConfig.environments.$resolvedName
  }

  $status = ''
  if ($localNode -and -not [string]::IsNullOrWhiteSpace([string]$localNode.status)) {
    $status = [string]$localNode.status
  } elseif ($trackedNode -and -not [string]::IsNullOrWhiteSpace([string]$trackedNode.status)) {
    $status = [string]$trackedNode.status
  }
  if ([string]::IsNullOrWhiteSpace($status)) {
    $status = 'UNCONFIGURED'
  }

  $envId = ''
  if ($localNode -and -not [string]::IsNullOrWhiteSpace([string]$localNode.cloudEnvId)) {
    $envId = [string]$localNode.cloudEnvId
  } elseif ($trackedNode -and -not [string]::IsNullOrWhiteSpace([string]$trackedNode.cloudEnvId)) {
    $envId = [string]$trackedNode.cloudEnvId
  }

  $appId = ''
  if ($localNode -and -not [string]::IsNullOrWhiteSpace([string]$localNode.miniprogramAppId)) {
    $appId = [string]$localNode.miniprogramAppId
  } elseif ($trackedNode -and -not [string]::IsNullOrWhiteSpace([string]$trackedNode.miniprogramAppId)) {
    $appId = [string]$trackedNode.miniprogramAppId
  }

  $notifyTemplateId = ''
  if ($localNode -and -not [string]::IsNullOrWhiteSpace([string]$localNode.notifyTemplateId)) {
    $notifyTemplateId = [string]$localNode.notifyTemplateId
  } elseif ($trackedNode -and -not [string]::IsNullOrWhiteSpace([string]$trackedNode.notifyTemplateId)) {
    $notifyTemplateId = [string]$trackedNode.notifyTemplateId
  }

  return [PSCustomObject]@{
    Name = $resolvedName
    Status = $status
    EnvId = $envId
    AppId = $appId
    NotifyTemplateId = $notifyTemplateId
    HasLocalOverride = $null -ne $localConfig
    LocalConfigPath = Get-LocalReleaseEnvironmentConfigPath -RepoRoot $RepoRoot
    TrackedConfigPath = Get-TrackedReleaseEnvironmentConfigPath -RepoRoot $RepoRoot
  }
}

function Resolve-EffectiveCloudEnvId {
  param([string]$RepoRoot)

  $cloudbaseRcPath = Join-Path $RepoRoot 'cloudbaserc.json'
  $cloudbaseRc = Read-JsonFileIfExists -Path $cloudbaseRcPath
  $trackedEnvId = if ($cloudbaseRc) { [string]$cloudbaseRc.envId } else { '' }

  if (-not (Test-PlaceholderCloudEnvId -Value $trackedEnvId)) {
    return $trackedEnvId
  }

  return [string](Resolve-EffectiveReleaseBinding -RepoRoot $RepoRoot).EnvId
}

function Resolve-EffectiveWechatAppId {
  param([string]$RepoRoot)

  $projectConfigPath = Join-Path $RepoRoot 'project.config.json'
  $projectConfig = Read-JsonFileIfExists -Path $projectConfigPath
  $trackedAppId = if ($projectConfig) { [string]$projectConfig.appid } else { '' }

  if (-not (Test-PlaceholderWechatAppId -Value $trackedAppId)) {
    return $trackedAppId
  }

  return [string](Resolve-EffectiveReleaseBinding -RepoRoot $RepoRoot).AppId
}

function Resolve-EffectiveNotifyTemplateId {
  param([string]$RepoRoot)

  return [string](Resolve-EffectiveReleaseBinding -RepoRoot $RepoRoot).NotifyTemplateId
}
