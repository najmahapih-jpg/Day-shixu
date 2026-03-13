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
$functionsRoot = Join-Path $repoRoot 'cloudfunctions'

if (-not (Test-Path $functionsRoot)) {
  throw "cloudfunctions directory not found: $functionsRoot"
}

$dirs = Get-ChildItem -Path $functionsRoot -Directory
if ($dirs.Count -eq 0) {
  Write-Host 'No cloud function directories found.'
  exit 0
}

foreach ($dir in $dirs) {
  $pkgPath = Join-Path $dir.FullName 'package.json'
  if (-not (Test-Path $pkgPath)) {
    Write-Host "Skip $($dir.Name): package.json not found"
    continue
  }

  Write-Host "Installing dependencies for $($dir.Name)..."
  Push-Location $dir.FullName
  try {
    npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed in $($dir.FullName)"
    }
  } finally {
    Pop-Location
  }
}

Write-Host 'Cloud function dependencies installed.'
