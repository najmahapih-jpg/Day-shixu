$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$src = Join-Path $projectRoot 'cloudfunctions'
$dest = Join-Path $projectRoot 'unpackage\dist\dev\mp-weixin\cloudfunctions'

if (-not (Test-Path $src)) {
  throw "Source cloudfunctions not found: $src"
}

Push-Location $projectRoot
try {
  Write-Output 'Building TypeScript cloud functions...'
  npm.cmd run build:cloudfunctions:ts
  if ($LASTEXITCODE -ne 0) {
    throw 'build:cloudfunctions:ts failed'
  }
}
finally {
  Pop-Location
}

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -Path (Join-Path $src '*') -Destination $dest -Recurse -Force

Write-Output "Synced cloudfunctions to: $dest"
