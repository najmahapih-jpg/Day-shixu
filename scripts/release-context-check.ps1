<#
.SYNOPSIS
  Validate release context without deploying anything.

.DESCRIPTION
  This script is a non-destructive release guard. It checks the current
  branch/worktree, the tracked cloud env source of truth, WeChat upload
  credentials, build outputs, and whether the current envId/appid pair
  maps to a known named environment.
#>

$ErrorActionPreference = 'Stop'

$failed = 0
$warnings = 0

function Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:failed++ }
function Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow; $script:warnings++ }

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$helperScript = Join-Path $PSScriptRoot 'release-context-helper.ps1'
if (Test-Path -LiteralPath $helperScript) {
  . $helperScript
}

Write-Host "`nRelease Context Check" -ForegroundColor Cyan
Write-Host "=====================`n" -ForegroundColor Cyan

# 1) git worktree
Write-Host "1. Git worktree" -ForegroundColor White
$branch = (& git -C $projectRoot branch --show-current).Trim()
$statusLines = @(& git -C $projectRoot status --porcelain)
if ([string]::IsNullOrWhiteSpace($branch)) {
  Warn 'Could not determine current git branch'
} else {
  Pass "Current branch: $branch"
}
if ($statusLines.Count -gt 0) {
  Fail 'Git worktree is not clean. Commit or stash changes before release.'
} else {
  Pass 'Git worktree is clean'
}

# 1.5) public repo safety
Write-Host "`n1.5 Public repo safety" -ForegroundColor White
$repoSafetyScript = Join-Path $PSScriptRoot 'check-public-repo-safety.ps1'
if (Test-Path $repoSafetyScript) {
  & $repoSafetyScript
  if ($LASTEXITCODE -ne 0) {
    Fail 'Public-repo safety audit failed'
  } else {
    Pass 'Public-repo safety audit completed'
  }
} else {
  Warn 'check-public-repo-safety.ps1 is missing'
}

# 2) tracked release env
Write-Host "`n2. Release environment source of truth" -ForegroundColor White
$cloudbaseRcPath = Join-Path $projectRoot 'cloudbaserc.json'
$cloudEnvTsPath = Join-Path $projectRoot 'utils\cloudEnv.ts'
$releaseEnvConfigPath = Join-Path $projectRoot 'config\release-environments.json'
$projectConfigPath = Join-Path $projectRoot 'project.config.json'

$cloudbaseEnvId = ''
$runtimeEnvName = ''
$runtimeEnvId = ''
$activeNamedEnvironment = ''
$activeNamedStatus = ''
$projectAppId = ''
$effectiveBinding = if (Get-Command Resolve-EffectiveReleaseBinding -ErrorAction SilentlyContinue) {
  Resolve-EffectiveReleaseBinding -RepoRoot $projectRoot
} else {
  $null
}
$effectiveEnvId = if (Get-Command Resolve-EffectiveCloudEnvId -ErrorAction SilentlyContinue) {
  Resolve-EffectiveCloudEnvId -RepoRoot $projectRoot
} else {
  ''
}
$effectiveAppId = if (Get-Command Resolve-EffectiveWechatAppId -ErrorAction SilentlyContinue) {
  Resolve-EffectiveWechatAppId -RepoRoot $projectRoot
} else {
  ''
}
$effectiveNotifyTemplateId = if (Get-Command Resolve-EffectiveNotifyTemplateId -ErrorAction SilentlyContinue) {
  Resolve-EffectiveNotifyTemplateId -RepoRoot $projectRoot
} else {
  ''
}

if (-not (Test-Path $cloudbaseRcPath)) {
  Fail 'cloudbaserc.json is missing'
} else {
  $cloudbaseRc = Get-Content -Path $cloudbaseRcPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $cloudbaseEnvId = [string]$cloudbaseRc.envId
  if ([string]::IsNullOrWhiteSpace($cloudbaseEnvId)) {
    Fail 'cloudbaserc.json envId is empty'
  } elseif ((Get-Command Test-PlaceholderCloudEnvId -ErrorAction SilentlyContinue) -and (Test-PlaceholderCloudEnvId -Value $cloudbaseEnvId)) {
    if ([string]::IsNullOrWhiteSpace($effectiveEnvId)) {
      Fail 'cloudbaserc.json envId is placeholder, but no local release override is available'
    } else {
      Warn ("cloudbaserc.json envId uses public placeholder; effective envId resolves from local override: " + $effectiveEnvId)
    }
  } else {
    Pass ("cloudbaserc envId: " + $cloudbaseEnvId)
  }
}

if (Test-Path $cloudEnvTsPath) {
  $cloudEnvTs = Get-Content -Path $cloudEnvTsPath -Raw -Encoding UTF8
  if ($cloudEnvTs -match "CLOUD_ENV_NAME\s*=\s*'([^']+)'") {
    $runtimeEnvName = $Matches[1]
    Pass ("utils/cloudEnv.ts env name: " + $runtimeEnvName)
  } else {
    Warn 'utils/cloudEnv.ts exists but CLOUD_ENV_NAME could not be parsed'
  }
  if ($cloudEnvTs -match "CLOUD_ENV_ID\s*=\s*'([^']+)'") {
    $runtimeEnvId = $Matches[1]
    if ((Get-Command Test-PlaceholderCloudEnvId -ErrorAction SilentlyContinue) -and (Test-PlaceholderCloudEnvId -Value $runtimeEnvId)) {
      if ([string]::IsNullOrWhiteSpace($effectiveEnvId)) {
        Fail 'utils/cloudEnv.ts envId is placeholder, but no local release override is available'
      } else {
        Warn ("utils/cloudEnv.ts envId uses public placeholder; release tooling will patch build output with local envId: " + $effectiveEnvId)
      }
    } elseif ($runtimeEnvId -eq $effectiveEnvId) {
      Pass ("utils/cloudEnv.ts matches envId: " + $runtimeEnvId)
    } else {
      Fail ("utils/cloudEnv.ts envId mismatch: " + $runtimeEnvId + " != " + $effectiveEnvId)
    }
  } else {
    Warn 'utils/cloudEnv.ts exists but CLOUD_ENV_ID could not be parsed'
  }
} else {
  Warn 'utils/cloudEnv.ts is missing'
}

if (Test-Path $releaseEnvConfigPath) {
  $releaseEnvConfig = Get-Content -Path $releaseEnvConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $defaultEnv = [string]$releaseEnvConfig.defaultEnvironment
  if ([string]::IsNullOrWhiteSpace($defaultEnv)) {
    Fail 'config/release-environments.json defaultEnvironment is empty'
  } else {
    Pass ("default environment: " + $defaultEnv)
  }

  $configuredNames = @($releaseEnvConfig.environments.PSObject.Properties.Name)
  if ($configuredNames.Count -eq 0) {
    Fail 'config/release-environments.json has no environments'
  } else {
    Pass ("named environments: " + ($configuredNames -join ', '))
  }
} else {
  Fail 'config/release-environments.json is missing'
}

# 3) WeChat project identity and local-only config
Write-Host "`n3. WeChat project config" -ForegroundColor White
if (-not (Test-Path $projectConfigPath)) {
  Fail 'project.config.json is missing'
} else {
  $projectConfig = Get-Content -Path $projectConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $projectAppId = [string]$projectConfig.appid
  if ([string]::IsNullOrWhiteSpace($projectAppId)) {
    Fail 'project.config.json appid is empty'
  } elseif ((Get-Command Test-PlaceholderWechatAppId -ErrorAction SilentlyContinue) -and (Test-PlaceholderWechatAppId -Value $projectAppId)) {
    if ([string]::IsNullOrWhiteSpace($effectiveAppId)) {
      Fail 'project.config.json appid is placeholder, but no local release override is available'
    } else {
      Warn ("project.config.json appid uses public placeholder; effective appid resolves from local override: " + $effectiveAppId)
    }
  } else {
    Pass ("project.config.json appid: " + $projectAppId)
  }

  if ($projectConfig.miniprogramRoot) {
    Pass ("miniprogramRoot: " + $projectConfig.miniprogramRoot)
  } else {
    Warn 'project.config.json miniprogramRoot is empty'
  }

  if ($projectConfig.cloudfunctionRoot) {
    Pass ("cloudfunctionRoot: " + $projectConfig.cloudfunctionRoot)
  } else {
    Warn 'project.config.json cloudfunctionRoot is empty'
  }

  $rootPrivateConfig = Join-Path $projectRoot 'project.private.config.json'
  if (Test-Path $rootPrivateConfig) {
    Pass 'project.private.config.json exists'
  } else {
    Warn 'project.private.config.json is absent (expected if local DevTools private config is not tracked)'
  }

  $envKeyPath = [Environment]::GetEnvironmentVariable('WECHAT_CI_PRIVATE_KEY_PATH')
  $fallbackKeyPath = Join-Path $projectRoot (".wxci\private." + $effectiveAppId + ".key")
  if (-not [string]::IsNullOrWhiteSpace($envKeyPath) -and (Test-Path $envKeyPath)) {
    Pass 'WeChat CI private key found via WECHAT_CI_PRIVATE_KEY_PATH'
  } elseif (Test-Path $fallbackKeyPath) {
    Pass 'WeChat CI private key found in repo-local .wxci'
  } else {
    Fail 'No WeChat CI private key found (set WECHAT_CI_PRIVATE_KEY_PATH or place .wxci/private.<appid>.key)'
  }

  if ([string]::IsNullOrWhiteSpace($effectiveNotifyTemplateId)) {
    Warn 'Notification template ID is not configured for the effective environment yet'
  } else {
    Pass 'Notification template ID is configured for the effective environment'
  }
}

if ($effectiveBinding) {
  $activeNamedEnvironment = [string]$effectiveBinding.Name
  $activeNamedStatus = [string]$effectiveBinding.Status

  if ([string]::IsNullOrWhiteSpace($activeNamedEnvironment)) {
    Fail 'Current envId/appid does not match any named environment in release environment config'
  } else {
    if ($activeNamedStatus -eq 'READY') {
      Pass ("active named environment: " + $activeNamedEnvironment)
      if ([string]::IsNullOrWhiteSpace($effectiveNotifyTemplateId)) {
        Fail ("active named environment is READY but notifyTemplateId is empty: " + $activeNamedEnvironment)
      }
    } elseif ($activeNamedStatus -eq 'INVALID') {
      Fail ("active named environment is INVALID: " + $activeNamedEnvironment)
    } else {
      Warn ("active named environment is not READY: " + $activeNamedEnvironment + " [" + $activeNamedStatus + "]")
    }

    if (-not [string]::IsNullOrWhiteSpace($runtimeEnvName) -and $runtimeEnvName -ne $activeNamedEnvironment) {
      Fail ("utils/cloudEnv.ts env name mismatch: " + $runtimeEnvName + " != " + $activeNamedEnvironment)
    }
  }
}

# 4) build outputs
Write-Host "`n4. Build outputs" -ForegroundColor White
$distAppJson = Join-Path $projectRoot 'unpackage\dist\dev\mp-weixin\app.json'
$devtoolsAppJson = Join-Path $projectRoot '_mp_devtools\app.json'

if (Test-Path $distAppJson) {
  Pass 'mp-weixin build output exists'
} else {
  Fail 'mp-weixin build output missing (build in HBuilderX first)'
}

if (Test-Path $devtoolsAppJson) {
  Pass '_mp_devtools build exists'
} else {
  Warn '_mp_devtools is missing (npm run prepare:wechat will regenerate it before upload)'
}

# 4.5) Build freshness — block release when HBuilderX output is older than source
Write-Host "`n4.5 Build freshness" -ForegroundColor White
$distAppJs = Join-Path $projectRoot 'unpackage\dist\dev\mp-weixin\app.js'
if (Test-Path $distAppJs) {
  try {
    $buildTime = (Get-Item -LiteralPath $distAppJs).LastWriteTimeUtc
    $headEpoch = [long](& git -C $projectRoot log -1 --format='%ct').Trim()
    $headTime = [DateTimeOffset]::FromUnixTimeSeconds($headEpoch).UtcDateTime
    if ($headTime -gt $buildTime.AddMinutes(2)) {
      $buildStr = $buildTime.ToString('yyyy-MM-dd HH:mm UTC')
      $commitStr = $headTime.ToString('yyyy-MM-dd HH:mm UTC')
      Fail "mp-weixin build is STALE (built $buildStr, HEAD committed $commitStr). Rebuild in HBuilderX before releasing."
    } else {
      Pass 'mp-weixin build is current with HEAD commit'
    }
  } catch {
    Warn ("Could not verify build freshness: " + $_.Exception.Message)
  }
} else {
  Warn 'Skipped build freshness check (no app.js found)'
}

# 5) npm release entrypoints
Write-Host "`n5. Release entrypoints" -ForegroundColor White
$packageJsonPath = Join-Path $projectRoot 'package.json'
if (Test-Path $packageJsonPath) {
  $packageJson = Get-Content -Path $packageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $scripts = $packageJson.scripts

  foreach ($scriptName in @('check:gate', 'check:repo-safety', 'release:check', 'release:record', 'release:guarded', 'env:list', 'env:use')) {
    if ($scripts.PSObject.Properties.Name -contains $scriptName) {
      Pass ("npm script exists: " + $scriptName)
    } else {
      Fail ("Missing npm script: " + $scriptName)
    }
  }
} else {
  Fail 'package.json is missing'
}

Write-Host "`n=====================" -ForegroundColor Cyan
if ($failed -gt 0) {
  Write-Host ("FAILED: " + $failed + " blocking issue(s), " + $warnings + " warning(s)") -ForegroundColor Red
  exit 1
}
if ($warnings -gt 0) {
  Write-Host ("PASSED with " + $warnings + " warning(s)") -ForegroundColor Yellow
  exit 0
}
Write-Host 'ALL CHECKS PASSED' -ForegroundColor Green
exit 0
