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
$rootConfig = Join-Path $repoRoot 'project.config.json'
$rootPrivateConfig = Join-Path $repoRoot 'project.private.config.json'
$sourceDir = Join-Path $repoRoot 'unpackage\dist\dev\mp-weixin'
$sourceConfig = Join-Path $sourceDir 'project.config.json'
$sourcePrivateConfig = Join-Path $sourceDir 'project.private.config.json'
$targetDir = Join-Path $repoRoot '_mp_devtools'
$targetConfig = Join-Path $targetDir 'project.config.json'
$targetPrivateConfig = Join-Path $targetDir 'project.private.config.json'
$targetAppJson = Join-Path $targetDir 'app.json'
$memoSource = Join-Path $repoRoot 'components\board\MemoEditor.vue'
$memoDistJs = Join-Path $sourceDir 'components\board\MemoEditor.js'
$memoDistWxml = Join-Path $sourceDir 'components\board\MemoEditor.wxml'

function Warn-IfSourceNewerThanDist {
  param(
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [Parameter(Mandatory = $true)][string[]]$DistPaths
  )

  if (-not (Test-Path $SourcePath)) {
    return
  }

  $sourceTime = (Get-Item -LiteralPath $SourcePath).LastWriteTimeUtc
  $staleTargets = @()
  foreach ($distPath in $DistPaths) {
    if (-not (Test-Path $distPath)) {
      $staleTargets += $distPath
      continue
    }

    $distTime = (Get-Item -LiteralPath $distPath).LastWriteTimeUtc
    if ($sourceTime -gt $distTime) {
      $staleTargets += $distPath
    }
  }

  if ($staleTargets.Count -gt 0) {
    Write-Warning 'Detected possible stale mp-weixin build output.'
    Write-Warning ("Source newer than dist: {0}" -f $SourcePath)
    foreach ($stale in $staleTargets) {
      Write-Warning ("Stale target: {0}" -f $stale)
    }
    Write-Warning 'Please rebuild mp-weixin in HBuilderX before running prepare:devtools to avoid stale interaction logic.'
  }
}

function Disable-RuntimeSocketChannel {
  param(
    [Parameter(Mandatory = $true)][string]$VendorPath
  )

  if (-not (Test-Path $VendorPath)) {
    return
  }

  $vendorContent = Get-Content -Raw -Encoding UTF8 $VendorPath
  $callPattern = '(?m)^(?<indent>\s*)initRuntimeSocketService\(\);\s*$'
  if (-not [regex]::IsMatch($vendorContent, $callPattern)) {
    return
  }

  $replacement = '$1// Runtime socket channel disabled to avoid noisy 127.0.0.1:8090 errors in WeChat DevTools.' +
    "`r`n" +
    '$1// initRuntimeSocketService();'
  $patched = [regex]::Replace(
    $vendorContent,
    $callPattern,
    $replacement,
    1
  )

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $vendorFullPath = (Get-Item -LiteralPath $VendorPath).FullName
  [System.IO.File]::WriteAllText($vendorFullPath, $patched, $utf8NoBom)
  Write-Host "Patched: disabled runtime socket channel in $VendorPath"
}

function Patch-RenderPropsNullFallback {
  param(
    [Parameter(Mandatory = $true)][string]$VendorPath
  )

  if (-not (Test-Path $VendorPath)) {
    return
  }

  $vendorContent = Get-Content -Raw -Encoding UTF8 $VendorPath
  $patchedSignature = "const instance = getCurrentInstance();`r`n  const uid2 = instance ? instance.uid : 0;"
  if ($vendorContent.Contains($patchedSignature)) {
    return
  }

  $pattern = 'function renderProps\(props\)\s*\{\s*const \{ uid: uid2, __counter \} = getCurrentInstance\(\);\s*const propsId = \(propsCaches\[uid2\] \|\| \(propsCaches\[uid2\] = \[\]\)\)\.push\(guardReactiveProps\(props\)\) - 1;\s*return uid2 \+ "," \+ propsId \+ "," \+ __counter;\s*\}'
  $replacement = @"
function renderProps(props) {
  const instance = getCurrentInstance();
  const uid2 = instance ? instance.uid : 0;
  const __counter = instance ? instance.__counter : 0;
  const propsId = (propsCaches[uid2] || (propsCaches[uid2] = [])).push(guardReactiveProps(props)) - 1;
  return uid2 + "," + propsId + "," + __counter;
}
"@

  if (-not [regex]::IsMatch($vendorContent, $pattern)) {
    Write-Warning "Skipped: renderProps patch pattern not found in $VendorPath"
    return
  }

  $patched = [regex]::Replace($vendorContent, $pattern, $replacement, 1)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $vendorFullPath = (Get-Item -LiteralPath $VendorPath).FullName
  [System.IO.File]::WriteAllText($vendorFullPath, $patched, $utf8NoBom)
  Write-Host "Patched: renderProps null-instance fallback in $VendorPath"
}

function Ensure-LazyCodeLoadingRequiredComponents {
  param(
    [Parameter(Mandatory = $true)][string]$AppJsonPath
  )

  if (-not (Test-Path $AppJsonPath)) {
    return
  }

  $json = Get-Content -Raw -Encoding UTF8 $AppJsonPath | ConvertFrom-Json
  if ($json.lazyCodeLoading -eq 'requiredComponents') {
    return
  }

  $json | Add-Member -NotePropertyName lazyCodeLoading -NotePropertyValue 'requiredComponents' -Force
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $fullPath = (Get-Item -LiteralPath $AppJsonPath).FullName
  [System.IO.File]::WriteAllText($fullPath, ($json | ConvertTo-Json -Depth 64), $utf8NoBom)
  Write-Host "Patched: lazyCodeLoading='requiredComponents' in $AppJsonPath"
}

function Sync-ProjectIdentity {
  param(
    [Parameter(Mandatory = $true)][string]$RootConfigPath,
    [Parameter(Mandatory = $true)][string[]]$ConfigPaths
  )

  if (-not (Test-Path $RootConfigPath)) {
    return
  }

  $rootCfg = Get-Content -Raw -Encoding UTF8 $RootConfigPath | ConvertFrom-Json
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  foreach ($configPath in $ConfigPaths) {
    if (-not (Test-Path $configPath)) {
      continue
    }

    $cfg = Get-Content -Raw -Encoding UTF8 $configPath | ConvertFrom-Json
    $cfg.projectname = $rootCfg.projectname
    if ($null -ne $rootCfg.description) {
      $cfg.description = $rootCfg.description
    }

    $fullPath = (Get-Item -LiteralPath $configPath).FullName
    [System.IO.File]::WriteAllText($fullPath, ($cfg | ConvertTo-Json -Depth 64), $utf8NoBom)
    Write-Host "Patched: synced project identity in $configPath"
  }
}

function Sync-PrivateProjectConfig {
  param(
    [Parameter(Mandatory = $true)][string]$RootPrivateConfigPath,
    [Parameter(Mandatory = $true)][string[]]$ConfigPaths
  )

  if (-not (Test-Path $RootPrivateConfigPath)) {
    return
  }

  $privateCfg = Get-Content -Raw -Encoding UTF8 $RootPrivateConfigPath
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  foreach ($configPath in $ConfigPaths) {
    $parentDir = Split-Path -Parent $configPath
    if (-not (Test-Path $parentDir)) {
      continue
    }

    [System.IO.File]::WriteAllText($configPath, $privateCfg, $utf8NoBom)
    Write-Host "Patched: synced private project config in $configPath"
  }
}

if (-not (Test-Path $sourceDir)) {
  throw "Source not found: $sourceDir. Please build mp-weixin first."
}

if (-not (Test-Path (Join-Path $sourceDir 'app.json'))) {
  throw "Source app.json missing: $sourceDir\\app.json. Please build mp-weixin first."
}

Warn-IfSourceNewerThanDist -SourcePath $memoSource -DistPaths @($memoDistJs, $memoDistWxml)

$didFullRebuild = $true
if (Test-Path $targetDir) {
  try {
    Remove-Item -Path $targetDir -Recurse -Force -ErrorAction Stop
  } catch {
    $didFullRebuild = $false
    Write-Warning "Target directory is in use. Falling back to incremental overwrite: $targetDir"
  }
}

New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
Copy-Item -Path (Join-Path $sourceDir '*') -Destination $targetDir -Recurse -Force

if (-not (Test-Path $sourceConfig)) {
  throw "project.config.json missing in source: $sourceConfig"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$sourceCfg = Get-Content -Raw -Encoding UTF8 $sourceConfig | ConvertFrom-Json
$sourceCfg.miniprogramRoot = ''
$sourceCfgPath = (Get-Item -LiteralPath $sourceConfig).FullName
[System.IO.File]::WriteAllText($sourceCfgPath, ($sourceCfg | ConvertTo-Json -Depth 64), $utf8NoBom)

if (-not (Test-Path $targetConfig)) {
  throw "project.config.json missing in target: $targetConfig"
}

$cfg = Get-Content -Raw -Encoding UTF8 $targetConfig | ConvertFrom-Json
$cfg.miniprogramRoot = ''
$cfg.cloudfunctionRoot = '../cloudfunctions/'

$targetConfigPath = (Get-Item -LiteralPath $targetConfig).FullName
[System.IO.File]::WriteAllText($targetConfigPath, ($cfg | ConvertTo-Json -Depth 64), $utf8NoBom)

Sync-ProjectIdentity -RootConfigPath $rootConfig -ConfigPaths @($sourceConfig, $targetConfig)
Sync-PrivateProjectConfig -RootPrivateConfigPath $rootPrivateConfig -ConfigPaths @($sourcePrivateConfig, $targetPrivateConfig)

if (-not (Test-Path $targetAppJson)) {
  throw "Target app.json missing: $targetAppJson"
}

Ensure-LazyCodeLoadingRequiredComponents -AppJsonPath (Join-Path $sourceDir 'app.json')
Ensure-LazyCodeLoadingRequiredComponents -AppJsonPath $targetAppJson

# Patch both dist and DevTools copies because some workflows import root project
# (miniprogramRoot -> unpackage/dist/dev/mp-weixin), while others import _mp_devtools.
Disable-RuntimeSocketChannel -VendorPath (Join-Path $sourceDir 'common\vendor.js')
Disable-RuntimeSocketChannel -VendorPath (Join-Path $targetDir 'common\vendor.js')
Patch-RenderPropsNullFallback -VendorPath (Join-Path $sourceDir 'common\vendor.js')
Patch-RenderPropsNullFallback -VendorPath (Join-Path $targetDir 'common\vendor.js')


# Downgrade ?? (nullish coalescing) to ES5-compatible ternary expressions.
# miniprogram-ci rejects ?? syntax even with es6/es7 disabled.
$downgradeScript = Join-Path $scriptDirResolved 'downgrade-nullish-coalescing.js'
node $downgradeScript $sourceDir
node $downgradeScript $targetDir
Write-Host "Prepared DevTools project at: $targetDir"
if (-not $didFullRebuild) {
  Write-Host "Note: incremental overwrite mode was used because _mp_devtools was locked."
  Write-Host "For a clean rebuild, close WeChat DevTools and run this script again."
}
Write-Host "Import this directory in WeChat DevTools."
