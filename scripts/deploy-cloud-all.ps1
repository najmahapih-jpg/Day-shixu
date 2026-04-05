param(
  [string]$EnvId = ''
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

$setEnvScript = Join-Path $scriptDirResolved 'set-cloud-env.ps1'
$installDepsScript = Join-Path $scriptDirResolved 'install-cloudfunction-deps.ps1'
$syncCfScript = Join-Path $scriptDirResolved 'sync-cloudfunctions.ps1'
$fixMpScript = Join-Path $scriptDirResolved 'fix-mp-config.ps1'
$prepareDevtoolsScript = Join-Path $scriptDirResolved 'prepare-devtools-project.ps1'
$cloudbaseFnScript = Join-Path $scriptDirResolved 'cloudbase-fn.ps1'

Push-Location $repoRoot
try {
  if (-not [string]::IsNullOrWhiteSpace($EnvId)) {
    Write-Host "Step 1/5: set cloud env -> $EnvId"
    & powershell -ExecutionPolicy Bypass -File $setEnvScript $EnvId
  } else {
    Write-Host 'Step 1/5: skip set env (use envId from cloudbaserc.json)'
  }

  Write-Host 'Step 2/5: install cloud function dependencies'
  & powershell -ExecutionPolicy Bypass -File $installDepsScript

  Write-Host 'Step 2b/5: sync shared modules into cloud functions'
  # Guarantee each cloud function carries byte-identical copies of
  # cloudfunctions/_shared/* before deploy. Runs even when this script
  # is invoked directly (bypassing npm pre* hooks).
  $syncSharedScript = Join-Path $repoRoot 'cloudfunctions\scripts\sync-shared.js'
  node $syncSharedScript
  if ($LASTEXITCODE -ne 0) { throw 'sync-shared.js failed' }

  Write-Host 'Step 3/5: deploy all cloud functions via CloudBase CLI'
  & powershell -ExecutionPolicy Bypass -File $cloudbaseFnScript deployAll

  Write-Host 'Step 4/5: sync cloudfunctions to dist project'
  & powershell -ExecutionPolicy Bypass -File $syncCfScript

  Write-Host 'Step 5/5: fix mp config and refresh _mp_devtools'
  & powershell -ExecutionPolicy Bypass -File $fixMpScript
  & powershell -ExecutionPolicy Bypass -File $prepareDevtoolsScript

  Write-Host ''
  Write-Host 'Done. Next: re-open WeChat DevTools and run project from _mp_devtools.'
}
finally {
  Pop-Location
}
