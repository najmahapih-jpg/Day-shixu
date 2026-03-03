$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$src = Join-Path $projectRoot 'cloudfunctions'
$dest = Join-Path $projectRoot 'unpackage\dist\dev\mp-weixin\cloudfunctions'

if (-not (Test-Path $src)) {
  throw "Source cloudfunctions not found: $src"
}

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -Path (Join-Path $src '*') -Destination $dest -Recurse -Force

Write-Output "Synced cloudfunctions to: $dest"
