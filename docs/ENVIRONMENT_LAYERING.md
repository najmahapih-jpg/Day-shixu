# Environment layering first cut

## Goal

This document explains the project's first practical environment-layering pass.
It does **not** build a full dev/staging/prod deployment platform yet.
Instead, it turns environment context into something explicit, named, and guardable.

## Current sources of truth

### Shared / tracked in git
- `config/release-environments.json`
- `cloudbaserc.json`
- `utils/cloudEnv.ts`
- `project.config.json`

### Local / private
- `project.private.config.json`
- `.wxci/private.<appid>.key`
- optional `config/release-environments.local.json`

## Current environment statuses

### dev
- `READY`
- Has real `cloudEnvId`
- Has real `miniprogramAppId`
- Can be applied through `npm run env:use -- -Name dev`

### staging
- `UNCONFIGURED`
- Exists as a named environment
- Fails loudly if you try to apply it before supplying real values

### prod
- `UNCONFIGURED`
- Exists as a named environment
- Fails loudly if you try to apply it before supplying real values

## What changed in this first cut

1. Introduced a named environment map in `config/release-environments.json`
2. Extended `scripts/set-cloud-env.ps1` so it can:
   - list named environments
   - apply a named environment
   - still accept raw `-EnvId` for fallback/manual use
3. Added explicit npm entrypoints:
   - `npm run env:list`
   - `npm run env:use -- -Name dev`
4. Upgraded `release-context-check.ps1` so it verifies:
   - envId drift
   - runtime cloud env drift
   - appid alignment
   - current named environment recognition
   - `READY / UNCONFIGURED / INVALID` style status handling

## Important limitation

Right now only `dev` is fully configured.
`staging` and `prod` are intentionally present as reserved named environments,
but they are not provisioned yet. Trying to switch to them should fail loudly
instead of silently applying partial config.

## Recommended usage

```bash
npm run env:list
npm run env:use -- -Name dev
npm run release:check
```

## Most natural next step

After this first cut, the next engineering step should be:
- provision real staging/prod values
- add per-environment release / rollback metadata
- separate release approvals or checklists by environment
