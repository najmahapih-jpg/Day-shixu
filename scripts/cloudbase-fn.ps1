param(
  [ValidateSet('list', 'deployAll', 'deploy', 'listChanged', 'deployChanged')]
  [string]$Action = 'list',
  [string]$FunctionName = '',
  [string]$FromRef = ''
)

$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$cfgPath = Join-Path $projectRoot 'cloudbaserc.json'

if (-not (Test-Path $cfgPath)) {
  throw "cloudbaserc.json not found: $cfgPath"
}

$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$envId = $cfg.envId

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
  Write-Output ("Deploying function: " + $Name)
  npx --yes --package=@cloudbase/cli@latest tcb fn deploy $Name --force -e $EnvId
}

Push-Location $projectRoot
try {
  switch ($Action) {
    'list' {
      npx --yes --package=@cloudbase/cli@latest tcb fn list -e $envId
    }
    'deployAll' {
      npx --yes --package=@cloudbase/cli@latest tcb fn deploy --all --force -e $envId
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
