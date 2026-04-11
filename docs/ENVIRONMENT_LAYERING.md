# Environment layering first cut

## Goal

This document explains the project's first environment-layering pass.
It does **not** create a full dev/staging/prod deployment platform yet.
Instead, it makes the environment boundary explicit and machine-checkable.

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

## Important limitation

Right now only `dev` is fully configured.
`staging` and `prod` are intentionally present as reserved names, but they are not provisioned yet.
Trying to switch to them should fail loudly instead of silently applying partial config.

## Recommended usage

```bash
npm run env:list
npm run env:use -- -Name dev
npm run release:check
```

## Next step after this first cut

The natural next engineering step is:
- provision real staging/prod values
- add per-environment release records / rollback metadata
- separate release approvals by environment
