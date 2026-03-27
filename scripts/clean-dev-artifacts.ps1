<#
.SYNOPSIS
  Clean local development artifacts that are safe to delete before release.
  _mp_devtools is intentionally preserved here because prepare:wechat already
  handles refresh + locked-directory fallback for that path.

.PARAMETER IncludeBuildOutput
  When specified, also removes unpackage/ (HBuilderX build output).
  Default: unpackage/ is preserved because release-wechat.ps1 requires it.

.EXAMPLE
  # Default: keep unpackage/
  powershell -ExecutionPolicy Bypass -File ./scripts/clean-dev-artifacts.ps1

  # Include build output (requires HBuilderX rebuild before next release)
  powershell -ExecutionPolicy Bypass -File ./scripts/clean-dev-artifacts.ps1 -IncludeBuildOutput
#>

param(
  [switch]$IncludeBuildOutput
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = Resolve-Path (Join-Path $scriptDir '..')

Write-Host "`n[clean:dev-artifacts]" -ForegroundColor Cyan

# ── Directories to always clean (safe: ignored, rebuildable) ──
$targets = @(
  '.verify'
)

# Glob: _mp_devtools_clean_* patterns
$dynamicTargets = Get-ChildItem -Path $projectRoot -Directory -Filter '_mp_devtools_clean_*' -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty FullName

foreach ($rel in $targets) {
  $full = Join-Path $projectRoot $rel
  if (Test-Path $full) {
    Remove-Item $full -Recurse -Force
    Write-Host "  [CLEAN] $rel" -ForegroundColor Green
  } else {
    Write-Host "  [SKIP]  $rel not found" -ForegroundColor DarkGray
  }
}

foreach ($full in $dynamicTargets) {
  $rel = Split-Path $full -Leaf
  Remove-Item $full -Recurse -Force
  Write-Host "  [CLEAN] $rel" -ForegroundColor Green
}

Write-Host "  [KEEP]  _mp_devtools/ (prepare-devtools-project.ps1 owns refresh and lock fallback)" -ForegroundColor DarkGray

# ── Optional: build output ──
if ($IncludeBuildOutput) {
  $unpackage = Join-Path $projectRoot 'unpackage'
  if (Test-Path $unpackage) {
    Remove-Item $unpackage -Recurse -Force
    Write-Host "  [CLEAN] unpackage/ (build output — rebuild in HBuilderX before next release)" -ForegroundColor Yellow
  } else {
    Write-Host "  [SKIP]  unpackage/ not found" -ForegroundColor DarkGray
  }
} else {
  Write-Host "  [KEEP]  unpackage/ (required by release-wechat.ps1 — use -IncludeBuildOutput to remove)" -ForegroundColor DarkGray
}

# ── Never touch these ──
# .wxci/                        miniprogram-ci private key
# project.private.config.json   local WeChat devtools config
# .claude/                      Claude Code session data
# node_modules/                 package dependencies
# cloudfunctions/*/node_modules cloud function dependencies
# _mp_devtools/                 prepare-devtools-project.ps1 refreshes this and handles lock fallback

Write-Host "`n  Done.`n" -ForegroundColor Cyan
