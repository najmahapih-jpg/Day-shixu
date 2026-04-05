param(
  [ValidateSet('list', 'deployAll', 'deploy', 'listChanged', 'deployChanged')]
  [string]$Action = 'list',
  [string]$FunctionName = '',
  [string]$FromRef = ''
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
$projectRoot = Resolve-Path -LiteralPath (Split-Path -Parent $scriptDirResolved)
$cfgPath = Join-Path $projectRoot 'cloudbaserc.json'

if (-not (Test-Path $cfgPath)) {
  throw "cloudbaserc.json not found: $cfgPath"
}

$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$envId = $cfg.envId
$functionRoot = if ($cfg.functionRoot) { [string]$cfg.functionRoot } else { 'cloudfunctions' }

if ([string]::IsNullOrWhiteSpace($envId)) {
  throw 'envId is empty in cloudbaserc.json'
}

if ($Action -eq 'deploy' -and [string]::IsNullOrWhiteSpace($FunctionName)) {
  # Support: npm run cf:deploy:one -- habit
  if ($args.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($args[0])) {
    $FunctionName = $args[0]
  }
}

if ($Action -eq 'deploy' -and [string]::IsNullOrWhiteSpace($FunctionName)) {
  throw 'Missing function name. Usage: npm run cf:deploy:one -- habit'
}

if (($Action -eq 'listChanged' -or $Action -eq 'deployChanged') -and [string]::IsNullOrWhiteSpace($FromRef)) {
  # Support:
  # npm run cf:list:changed -- main
  # npm run cf:deploy:changed -- main
  if ($args.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($args[0])) {
    $FromRef = $args[0]
  }
}

function Assert-GitRepo {
  git rev-parse --is-inside-work-tree 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'Current directory is not inside a git repository.'
  }
}

function Get-ChangedFunctionNames([string]$BaseRef) {
  Assert-GitRepo

  $lines = @()
  if ([string]::IsNullOrWhiteSpace($BaseRef)) {
    # Include modified + untracked files under cloudfunctions
    $lines = git status --porcelain -- cloudfunctions
  } else {
    # Compare against a ref/branch (e.g., main)
    $lines = git diff --name-only $BaseRef -- cloudfunctions
  }

  $names = New-Object 'System.Collections.Generic.HashSet[string]'

  foreach ($rawLine in $lines) {
    if ([string]::IsNullOrWhiteSpace($rawLine)) { continue }
    $line = $rawLine.Trim()

    $path = $line
    if ([string]::IsNullOrWhiteSpace($BaseRef)) {
      # porcelain line examples:
      # "M  cloudfunctions/habit/index.js"
      # "?? cloudfunctions/habit/index.js"
      # "R  old/path -> cloudfunctions/habit/index.js"
      if ($line.Contains('->')) {
        $path = ($line.Split('->')[-1]).Trim()
      } else {
        $path = ($line -replace '^[\?\! MARCUD]{1,2}\s+', '').Trim()
      }
    }

    $path = $path.Trim('"').Replace('\', '/')
    if ($path -match '^cloudfunctions/([^/]+)/') {
      [void]$names.Add($Matches[1])
    }
  }

  return @($names) | Sort-Object
}

function Deploy-One([string]$Name, [string]$EnvId) {
  $fnDir = Join-Path $projectRoot (Join-Path $functionRoot $Name)
  if (-not (Test-Path -LiteralPath $fnDir)) {
    throw ("Function directory not found: " + $fnDir)
  }

  Write-Output ("Updating function code: " + $Name)
  # Use code update to upload local node_modules, avoiding runtime missing-module errors.
  Invoke-Tcb -TcbArgs @('fn', 'code', 'update', $Name, '--dir', $fnDir, '-e', $EnvId)
  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Warning ("Code update failed for " + $Name + ", fallback to deploy...")
  Invoke-Tcb -TcbArgs @('fn', 'deploy', $Name, '--force', '--dir', $fnDir, '-e', $EnvId)
  if ($LASTEXITCODE -ne 0) {
    throw ("Failed to deploy function: " + $Name)
  }
}

function Get-ConfiguredFunctionNames {
  $names = @()

  if ($cfg.functions) {
    foreach ($item in $cfg.functions) {
      if ($item.name -and -not [string]::IsNullOrWhiteSpace([string]$item.name)) {
        $names += [string]$item.name
      }
    }
  }

  if ($names.Count -gt 0) {
    return @($names | Sort-Object -Unique)
  }

  $root = Join-Path $projectRoot $functionRoot
  if (-not (Test-Path -LiteralPath $root)) {
    throw ("Function root not found: " + $root)
  }

  return @(
    Get-ChildItem -Path $root -Directory |
      Select-Object -ExpandProperty Name |
      Sort-Object -Unique
  )
}

function Invoke-Tcb([string[]]$TcbArgs) {
  $localTcbCmd = Join-Path $projectRoot 'node_modules\.bin\tcb.cmd'
  if (Test-Path $localTcbCmd) {
    & $localTcbCmd @TcbArgs
  } else {
    npx --yes --package=@cloudbase/cli@latest tcb @TcbArgs
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Warning ("tcb returned non-zero exit code (" + $LASTEXITCODE + "): tcb " + ($TcbArgs -join ' '))
    Write-Warning 'Please inspect CLI output above to verify whether deployment/listing actually succeeded.'
  }
}

function Sync-SharedModules {
  # Central guard: every cloud-function deploy path must first refresh
  # the per-function copies of cloudfunctions/_shared/* so drift can't
  # ship. Covers every caller — npm scripts, release-wechat.ps1,
  # deploy-cloud-all.ps1, and direct `cloudbase-fn.ps1 deploy <name>`
  # invocations. Idempotent and fast.
  $syncScript = Join-Path $projectRoot 'cloudfunctions\scripts\sync-shared.js'
  if (Test-Path $syncScript) {
    Write-Output 'Syncing shared modules into cloud functions...'
    node $syncScript
    if ($LASTEXITCODE -ne 0) { throw 'sync-shared.js failed' }
  }
}

Push-Location $projectRoot
try {
  # Run shared-sync before any action that actually deploys code. List
  # actions stay read-only.
  if ($Action -in @('deploy', 'deployAll', 'deployChanged')) {
    Sync-SharedModules
  }
  switch ($Action) {
    'list' {
      Invoke-Tcb -TcbArgs @('fn', 'list', '-e', $envId)
    }
    'deployAll' {
      $allNames = Get-ConfiguredFunctionNames
      if ($allNames.Count -eq 0) {
        Write-Output 'No cloud functions found. Nothing to deploy.'
        break
      }

      Write-Output ('Will deploy all cloud functions (' + $allNames.Count + '): ' + ($allNames -join ', '))
      $failed = @()
      foreach ($fn in $allNames) {
        try {
          Deploy-One -Name $fn -EnvId $envId
        } catch {
          $failed += $fn
          Write-Output ("Failed: " + $fn + ' -> ' + $_.Exception.Message)
        }
      }

      if ($failed.Count -gt 0) {
        throw ('Deploy failed for: ' + ($failed -join ', '))
      }
    }
    'deploy' {
      Deploy-One -Name $FunctionName -EnvId $envId
    }
    'listChanged' {
      $changed = Get-ChangedFunctionNames -BaseRef $FromRef
      if ($changed.Count -eq 0) {
        if ([string]::IsNullOrWhiteSpace($FromRef)) {
          Write-Output 'No changed cloud functions found in git working tree.'
        } else {
          Write-Output ('No changed cloud functions found compared with ref: ' + $FromRef)
        }
      } else {
        Write-Output ('Changed cloud functions (' + $changed.Count + '):')
        $changed | ForEach-Object { Write-Output ('- ' + $_) }
      }
    }
    'deployChanged' {
      $changed = Get-ChangedFunctionNames -BaseRef $FromRef
      if ($changed.Count -eq 0) {
        Write-Output 'No changed cloud functions found. Nothing to deploy.'
        break
      }

      Write-Output ('Will deploy changed cloud functions (' + $changed.Count + '): ' + ($changed -join ', '))
      $failed = @()
      foreach ($fn in $changed) {
        try {
          Deploy-One -Name $fn -EnvId $envId
        } catch {
          $failed += $fn
          Write-Output ("Failed: " + $fn + ' -> ' + $_.Exception.Message)
        }
      }

      if ($failed.Count -gt 0) {
        throw ('Deploy failed for: ' + ($failed -join ', '))
      }
    }
  }
}
finally {
  Pop-Location
}
