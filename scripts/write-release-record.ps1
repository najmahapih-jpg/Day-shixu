param(
  [string]$Version = '',
  [string]$Desc = '',
  [int]$Robot = 1,
  [string]$ReleasePhase = 'uploaded',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Remove-JsonComments([string]$Text) {
  $withoutBlockComments = [System.Text.RegularExpressions.Regex]::Replace(
    $Text,
    '/\*.*?\*/',
    '',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  return [System.Text.RegularExpressions.Regex]::Replace(
    $withoutBlockComments,
    '(?m)^\s*//.*$',
    ''
  )
}

function Get-JsonFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required file is missing: $Path"
  }

  $rawContent = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  $normalizedContent = Remove-JsonComments -Text $rawContent
  return $normalizedContent | ConvertFrom-Json
}

function Get-GitValue([string[]]$GitArgs) {
  $result = & git @GitArgs 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw ("Git command failed: git " + ($GitArgs -join ' '))
  }

  return ($result | Out-String).Trim()
}

function New-ReleaseId([string]$Timestamp, [string]$EnvironmentName, [string]$ReleaseVersion, [string]$ShortCommit) {
  $safeEnv = ($EnvironmentName -replace '[^a-zA-Z0-9_-]', '-').Trim('-')
  $safeVersion = ($ReleaseVersion -replace '[^a-zA-Z0-9._-]', '-').Trim('-')
  return "$Timestamp-$safeEnv-v$safeVersion-$ShortCommit"
}

function Get-RelativePath([string]$BasePath, [string]$TargetPath) {
  $baseUri = [System.Uri]((Resolve-Path -LiteralPath $BasePath).Path + [System.IO.Path]::DirectorySeparatorChar)
  $targetUri = [System.Uri](Resolve-Path -LiteralPath $TargetPath).Path
  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', '\')
}

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $scriptDir '..')).Path
$helperScript = Join-Path $scriptDir 'release-context-helper.ps1'
if (Test-Path -LiteralPath $helperScript) {
  . $helperScript
}

$manifestPath = Join-Path $projectRoot 'manifest.json'
$cloudbaseRcPath = Join-Path $projectRoot 'cloudbaserc.json'
$projectConfigPath = Join-Path $projectRoot 'project.config.json'
$cloudEnvTsPath = Join-Path $projectRoot 'utils\cloudEnv.ts'
$releaseEnvConfigPath = Join-Path $projectRoot 'config\release-environments.json'
$releasesRoot = Join-Path $projectRoot 'releases'
$historyRoot = Join-Path $releasesRoot 'history'

$manifestJson = Get-JsonFile -Path $manifestPath
$projectConfig = Get-JsonFile -Path $projectConfigPath
$cloudEnvTs = Get-Content -LiteralPath $cloudEnvTsPath -Raw -Encoding UTF8

$versionName = if ([string]::IsNullOrWhiteSpace($Version)) { [string]$manifestJson.versionName } else { $Version }
$versionCode = [string]$manifestJson.versionCode
$effectiveBinding = if (Get-Command Resolve-EffectiveReleaseBinding -ErrorAction SilentlyContinue) {
  Resolve-EffectiveReleaseBinding -RepoRoot $projectRoot
} else {
  $null
}
$envId = if (Get-Command Resolve-EffectiveCloudEnvId -ErrorAction SilentlyContinue) {
  Resolve-EffectiveCloudEnvId -RepoRoot $projectRoot
} else {
  ''
}
$appId = if (Get-Command Resolve-EffectiveWechatAppId -ErrorAction SilentlyContinue) {
  Resolve-EffectiveWechatAppId -RepoRoot $projectRoot
} else {
  [string]$projectConfig.appid
}
$publicEnvId = if (Get-Command Get-PublicPlaceholderCloudEnvId -ErrorAction SilentlyContinue) {
  Get-PublicPlaceholderCloudEnvId
} else {
  '<cloud env id redacted>'
}
$publicAppId = if (Get-Command Get-PublicPlaceholderWechatAppId -ErrorAction SilentlyContinue) {
  Get-PublicPlaceholderWechatAppId
} else {
  '<wechat appid redacted>'
}

$runtimeEnvName = ''
if ($cloudEnvTs -match "CLOUD_ENV_NAME\s*=\s*'([^']+)'") {
  $runtimeEnvName = [string]$Matches[1]
}

$environmentName = if ($effectiveBinding) { [string]$effectiveBinding.Name } else { $runtimeEnvName }
$environmentStatus = if ($effectiveBinding) { [string]$effectiveBinding.Status } else { 'UNKNOWN' }

if ([string]::IsNullOrWhiteSpace($environmentName)) {
  $environmentName = 'unknown-env'
}

$branch = Get-GitValue -GitArgs @('-C', $projectRoot, 'branch', '--show-current')
$commit = Get-GitValue -GitArgs @('-C', $projectRoot, 'rev-parse', 'HEAD')
$shortCommit = Get-GitValue -GitArgs @('-C', $projectRoot, 'rev-parse', '--short', 'HEAD')

$generatedAt = (Get-Date).ToUniversalTime().ToString('o')
$releaseStamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$releaseId = New-ReleaseId -Timestamp $releaseStamp -EnvironmentName $environmentName -ReleaseVersion $versionName -ShortCommit $shortCommit

$environmentHistoryRoot = Join-Path $historyRoot $environmentName
$releaseManifestFile = Join-Path $environmentHistoryRoot ($releaseId + '.release-manifest.json')
$rollbackManifestFile = Join-Path $environmentHistoryRoot ($releaseId + '.rollback-manifest.json')

$previousRelease = $null
if (Test-Path -LiteralPath $environmentHistoryRoot) {
  $latestReleaseFile = Get-ChildItem -LiteralPath $environmentHistoryRoot -Filter '*.release-manifest.json' -File |
    Sort-Object Name |
    Select-Object -Last 1

  if ($latestReleaseFile) {
    $previousRelease = Get-JsonFile -Path $latestReleaseFile.FullName
  }
}

$targetReleaseId = $null
$targetVersion = $null
$targetCommit = $null
$targetBranch = $null
$targetGeneratedAt = $null

if ($previousRelease) {
  $targetReleaseId = [string]$previousRelease.releaseId
  $targetVersion = [string]$previousRelease.release.version
  $targetCommit = [string]$previousRelease.git.commit
  $targetBranch = [string]$previousRelease.git.branch
  $targetGeneratedAt = [string]$previousRelease.generatedAt
}

$releaseManifest = [ordered]@{
  schemaVersion = 1
  manifestType = 'release'
  releaseId = $releaseId
  generatedAt = $generatedAt
  release = [ordered]@{
    channel = 'wechat-mini-program'
    phase = $ReleasePhase
    version = $versionName
    versionCode = $versionCode
    description = $Desc
    robot = $Robot
  }
  environment = [ordered]@{
    name = $environmentName
    status = $environmentStatus
    envId = $publicEnvId
    appid = $publicAppId
  }
  git = [ordered]@{
    branch = $branch
    commit = $commit
    shortCommit = $shortCommit
  }
  rollbackAnchor = [ordered]@{
    strategy = 'previous-release-for-same-environment'
    targetReleaseId = $targetReleaseId
    targetVersion = $targetVersion
    targetCommit = $targetCommit
    targetBranch = $targetBranch
    targetGeneratedAt = $targetGeneratedAt
  }
  artifacts = [ordered]@{
    releaseManifestPath = ('releases\history\' + $environmentName + '\' + (Split-Path -Leaf $releaseManifestFile))
    rollbackManifestPath = ('releases\history\' + $environmentName + '\' + (Split-Path -Leaf $rollbackManifestFile))
  }
}

$rollbackNote = if ($previousRelease) {
  'Prefer rolling back to the previous recorded release for the same environment.'
} else {
  'No previous recorded release exists for this environment yet. The first cut only establishes the rollback anchor schema.'
}

$rollbackManifest = [ordered]@{
  schemaVersion = 1
  manifestType = 'rollback'
  rollbackId = ($releaseId + '-rollback')
  generatedAt = $generatedAt
  sourceRelease = [ordered]@{
    releaseId = $releaseId
    version = $versionName
    phase = $ReleasePhase
    branch = $branch
    commit = $commit
  }
  environment = [ordered]@{
    name = $environmentName
    status = $environmentStatus
    envId = $publicEnvId
    appid = $publicAppId
  }
  rollbackTarget = [ordered]@{
    releaseId = $targetReleaseId
    version = $targetVersion
    branch = $targetBranch
    commit = $targetCommit
    generatedAt = $targetGeneratedAt
    note = $rollbackNote
  }
  manualRecovery = [ordered]@{
    cloudFunctions = 'git checkout <targetCommit> -- cloudfunctions/<function_name> && npm run cf:deploy:one -- <function_name>'
    miniProgram = 'WeChat console -> Version Management -> Rollback, or upload a hotfix build and resubmit.'
  }
}

$releaseManifestJson = $releaseManifest | ConvertTo-Json -Depth 10
$rollbackManifestJson = $rollbackManifest | ConvertTo-Json -Depth 10

Write-Host "`nRelease record summary" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ("releaseId: " + $releaseId)
Write-Host ("version:   " + $versionName)
Write-Host ("env:       " + $environmentName + " [" + $environmentStatus + "]")
Write-Host ("envId:     " + $envId)
Write-Host ("appid:     " + $appId)
Write-Host ("branch:    " + $branch)
Write-Host ("commit:    " + $shortCommit)
Write-Host ("phase:     " + $ReleasePhase)
Write-Host ("previous:  " + $(if ($targetReleaseId) { $targetReleaseId } else { '<none>' }))

if ($DryRun) {
  Write-Host "`n[DRY-RUN] release manifest preview:" -ForegroundColor Yellow
  Write-Host $releaseManifestJson
  Write-Host "`n[DRY-RUN] rollback manifest preview:" -ForegroundColor Yellow
  Write-Host $rollbackManifestJson
  exit 0
}

New-Item -ItemType Directory -Path $environmentHistoryRoot -Force | Out-Null
Set-Content -LiteralPath $releaseManifestFile -Value $releaseManifestJson -Encoding UTF8
Set-Content -LiteralPath $rollbackManifestFile -Value $rollbackManifestJson -Encoding UTF8

Write-Host "`nRelease records written:" -ForegroundColor Green
Write-Host ("  - " + (Get-RelativePath -BasePath $projectRoot -TargetPath $releaseManifestFile))
Write-Host ("  - " + (Get-RelativePath -BasePath $projectRoot -TargetPath $rollbackManifestFile))
exit 0
