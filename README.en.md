[Chinese](README.md) | [English](README.en.md)

# Day时序

Day时序 is a WeChat Mini Program focused on habit tracking, ritual execution, journey progress, note capture, and timeline review. The repository is currently in a maintainable, handoff-ready, and release-traceable state for ongoing engineering work.

## Current Engineering Maturity

- The frontend, cloud functions, release scripts, and handoff docs are maintained in one repository
- The project has type checking, test entrypoints, release guards, named environments, and structured release records
- The release flow records release / rollback manifests for traceability
- `dev` is the only environment currently marked as `READY`
- `staging` and `prod` exist as named environments but are not configured as real release targets yet

## Tech Stack

| Area | Details |
| --- | --- |
| Frontend | `uni-app` + `Vue 3 Composition API` |
| Language | `TypeScript` + `JavaScript` |
| Styling | `SCSS` |
| State | `Pinia` |
| Cloud | WeChat Cloud Development / CloudBase |
| Target | WeChat Mini Program (`mp-weixin`) |
| Upload | `miniprogram-ci` |
| Node | `18.x` |

## First Steps for a New Maintainer

1. Install dependencies: `npm install`
2. Check types: `npm.cmd run typecheck`
3. Run baseline tests: `npx.cmd jest --runInBand`
4. Inspect environment status: `npm.cmd run env:list`
5. Follow the document map below based on what you are working on

If you are working on release-related tasks, read these first:

1. [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md)
2. [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md)
3. [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md)
4. [`releases/README.md`](releases/README.md)

Detailed operational and handoff docs currently remain in Chinese and are the source of truth for deep maintenance work.

## Common Commands

### Engineering Checks

```bash
npm.cmd run build:cloudfunctions:ts
npm.cmd run typecheck
npx.cmd jest --runInBand
powershell -ExecutionPolicy Bypass -File ./scripts/preflight-check.ps1
powershell -ExecutionPolicy Bypass -File ./scripts/check-hygiene.ps1
npm.cmd run check:repo-safety
```

### Environment and Release

```bash
npm.cmd run env:list
npm.cmd run env:use -- -Name dev
npm.cmd run release:check
npm.cmd run release:record:dry -- --Version 1.0.0 --Desc "dry run"
npm.cmd run release:guarded
```

Notes:

- `env:use` is the supported named-environment switch entrypoint
- `release:check` is a guard-only command and does not upload anything
- `release:guarded` runs cleanup, quality gates, release guards, and then attempts to write structured release records after a successful upload

### Cloud Functions

```bash
npm.cmd run cf:deps
npm.cmd run cf:sync:shared
npm.cmd run cf:deploy:all
npm.cmd run cf:deploy:one -- habit
npm.cmd run cf:deploy:changed
```

### Mini Program Build Prep

```bash
npm.cmd run fix:mp-config
npm.cmd run prepare:devtools
npm.cmd run prepare:wechat
```

## Release and Environment Entry Points

Release and environment responsibilities are split across these docs:

- Release operations: [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md)
- Release facts, rollback anchors, and public-repo security boundaries: [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md)
- Named environments and current status: [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md)
- Structured release record directory: [`releases/README.md`](releases/README.md)

Structured release records currently include at least:

- version
- environment name
- `envId`
- `appid`
- `branch`
- `commit`
- timestamp
- rollback anchor

## Document Map

| Document | Purpose |
| --- | --- |
| [`README.md`](README.md) | Chinese primary entrypoint |
| [`README.en.md`](README.en.md) | English overview and entrypoint |
| [`docs/PROJECT_STRUCTURE_OVERVIEW.md`](docs/PROJECT_STRUCTURE_OVERVIEW.md) | Repository map: directories, pages, state, services, release folders |
| [`docs/ENGINEERING_GOVERNANCE_HANDOFF.md`](docs/ENGINEERING_GOVERNANCE_HANDOFF.md) | Stable boundaries and next engineering topics |
| [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md) | Release execution guide |
| [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md) | Release facts, records, rollback entrypoints, public-repo safety boundaries |
| [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md) | Environment naming, status, and limitations |
| [`docs/ACCEPTANCE_TEST_CHECKLIST.md`](docs/ACCEPTANCE_TEST_CHECKLIST.md) | Pre-release acceptance checklist |
| [`docs/HOME_INDEX_HANDOFF.md`](docs/HOME_INDEX_HANDOFF.md) | Home page maintenance boundaries |
| [`docs/TIMELINE_INDEX_HANDOFF.md`](docs/TIMELINE_INDEX_HANDOFF.md) | Timeline maintenance boundaries |
| [`docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md) | Cloud function CLI workflow |

## Stable Boundaries

### Business and Structure

- Do not change business semantics
- Do not change route structure
- Do not change store contracts
- Do not reopen broad page-splitting or cloud-function governance work casually

### Release and Environment

- `dev` is the only `READY` environment
- `staging` and `prod` are reserved names, not active release targets
- Keep `cloudbaserc.json`, `utils/cloudEnv.ts`, and `project.config.json` aligned
- Do not skip `release:check`

### Local-only Files

These files are not repository facts:

- `project.private.config.json`
- `.wxci/private.<appid>.key`
- optional `config/release-environments.local.json`
- local runtime directories such as `.omx/`

## Most Natural Next Step

If work continues later, the most natural next step is not UI refactoring. It is:

1. configuring real `staging` / `prod` values under controlled rollout
2. extending structured release records toward environment-level approvals, rollback drills, and release-status transitions

Until then, avoid reopening broad homepage, timeline, or cloud-function restructuring work.
