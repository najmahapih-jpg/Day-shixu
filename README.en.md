[中文](README.md) | [English](README.en.md)

# Day Shixu

Day Shixu is a WeChat Mini Program for personal growth tracking. It combines habits, rituals, journeys, inspiration notes, timeline review, statistics, and reflection into one product loop. This repository contains the frontend, WeChat CloudBase functions, engineering scripts, release records, and handoff documentation.

This README is the primary engineering entrypoint. Use it first to understand the current state, local workflow, quality gates, release boundaries, and deeper documentation map.

## Project Snapshot

| Item | Current Fact |
| --- | --- |
| Product type | Personal-growth WeChat Mini Program |
| Current version | `v1.0.2`, from `manifest.json` |
| Runtime target | `mp-weixin` |
| Main package pages | `pages/index`, `pages/timeline`, `pages/board`, `pages/profile` |
| Subpackage pages | Habit create/detail, ritual edit/execute, journey list/detail/complete, stats detail, AI insight, archive, settings, onboarding |
| Frontend stack | `uni-app`, Vue 3 Composition API, Pinia, SCSS |
| Cloud stack | WeChat Cloud Development / CloudBase, `wx-server-sdk`, TypeScript cloud functions |
| Node version | `18.x`, from `package.json` and `.nvmrc` |
| Quality gate | `npm.cmd run check:gate` combines type checks, tests, preflight checks, repo hygiene, and public-repo safety checks |
| Release records | `releases/history/<environment>/` stores release and rollback manifests |
| Environment status | In tracked public config, only `dev` is `READY`; `staging` and `prod` remain `UNCONFIGURED`, and real releases require local overrides plus WeChat backend resources |

## Core Capabilities

| Module | Capabilities |
| --- | --- |
| Habits | Create, edit, archive, restore, reorder, check in, undo check-in, streaks, freeze days |
| Home | Today's work, progress cards, weekly comparison, journey entry, ritual entry, AI insight entry |
| Timeline | Calendar and timeline views, historical check-in review, date switching, future-date guard |
| Board | Text notes, checklist notes, tags, pinning, layout positions, linked habits, content safety checks |
| Rituals | Timed execution, linked habits, batch check-in, execution summary |
| Journeys | Preset journeys, user progress, step completion, completion page |
| AI Insights | Weekly comparison, recommendations, and local fallback copy based on habit data |
| Statistics | Heatmap, streaks, weekly comparison, habit statistics detail |
| User and Settings | Silent login, WeChat profile sync, reduce motion, notification toggle, week-start preference |
| Notifications | `notify` cloud function sends subscription messages based on reminder windows and user settings |

## Architecture

```text
Day时序/
├─ pages/                    # Page layer: tab pages and subpackage pages
├─ components/               # UI components and page sections
├─ composables/              # Interactions, animation, page data flow, reusable logic
├─ stores/                   # Pinia state layer
├─ services/                 # Frontend boundary for cloud-function calls
├─ cloudfunctions/           # WeChat cloud functions, tests, mocks, shared modules
├─ types/                    # Shared frontend/backend types
├─ utils/                    # Date, environment, cache, safe data, display helpers
├─ styles/                   # Global styles, design tokens, animations, dark mode
├─ scripts/                  # Checks, env switching, cloud deploy, release automation
├─ config/                   # Named environment config and local override example
├─ docs/                     # Engineering, handoff, release, and acceptance docs
└─ releases/                 # Structured release records and templates
```

Primary call path:

```text
pages -> components / composables -> stores -> services -> cloudfunctions -> CloudBase database / openapi
```

Maintenance rules:

- Pages own user flows and page-level boundaries.
- Components own reusable display and local interaction.
- `stores/` own state aggregation, caching, duplicate-action guards, and shared page data.
- `services/` are the frontend buffer for cloud calls; avoid scattering `wx.cloud.callFunction` directly across pages.
- Cloud functions isolate user data by `OPENID` and run content safety checks on UGC write paths.
- `cloudfunctions/_shared/` is distributed through sync scripts. Do not hand-copy shared code into functions.

## Getting Started

### Prerequisites

- Node.js `18.x`
- npm
- Windows PowerShell, because most repository scripts are PowerShell-based
- HBuilderX / uni-app build support
- WeChat DevTools
- For cloud function deployment, log in to CloudBase CLI first: `npx tcb login`

### Install and Validate

```bash
npm install
npm.cmd run env:list
npm.cmd run typecheck
npx.cmd jest --runInBand
```

### Local WeChat Mini Program Debugging

1. Build the project as `mp-weixin` in HBuilderX. The output directory is `unpackage/dist/dev/mp-weixin`.
2. After the build, run:

   ```bash
   npm.cmd run prepare:wechat
   ```

3. Open either the repository root or the generated `_mp_devtools` directory in WeChat DevTools.

Notes:

- `prepare:wechat` fixes the mini-program project config and prepares the DevTools directory.
- If `unpackage/dist/dev/mp-weixin/app.json` does not exist, the script reports missing build output.
- `unpackage/` and `_mp_devtools/` are generated local directories and must not be committed.

## Environment and Private Config

### Versioned Sources of Truth

| File | Purpose |
| --- | --- |
| `config/release-environments.json` | Named environments, statuses, placeholder `envId` / `appid` |
| `cloudbaserc.json` | Current CloudBase CLI environment |
| `utils/cloudEnv.ts` | Frontend runtime cloud environment constants |
| `project.config.json` | WeChat DevTools project config |
| `manifest.json` | Mini Program version, version code, and `mp-weixin` config |

### Local Private Files

| File | Purpose |
| --- | --- |
| `config/release-environments.local.json` | Real local environment override |
| `project.private.config.json` | Local private WeChat DevTools config |
| `.wxci/private.<appid>.key` | `miniprogram-ci` upload private key |
| `cloudfunctions/*/runtime-config.local.json` | Function runtime config, such as subscription template IDs |

These files are excluded by `.gitignore`. Public files keep placeholders only; real `appid`, `envId`, template IDs, and private keys must stay local or in a managed secret system.

Common environment commands:

```bash
npm.cmd run env:list
npm.cmd run env:use -- -Name dev
```

To enable `staging` or `prod`, first fill real values in the local override, mark the target as `READY`, then run `release:check`.

## Common Commands

| Scenario | Command |
| --- | --- |
| List environments | `npm.cmd run env:list` |
| Switch environment | `npm.cmd run env:use -- -Name dev` |
| Frontend + cloud TypeScript check | `npm.cmd run typecheck` |
| Cloud function TypeScript build | `npm.cmd run build:cloudfunctions:ts` |
| All tests | `npx.cmd jest --runInBand` |
| Specific cloud-function tests | `npm.cmd run test:habit`, `npm.cmd run test:user`, `npm.cmd run test:ritual`, `npm.cmd run test:stats` |
| Shared module parity | `npm.cmd run cf:check:shared` |
| Repo hygiene | `npm.cmd run check:hygiene` |
| Public-repo safety | `npm.cmd run check:repo-safety` |
| Standard quality gate | `npm.cmd run check:gate` |
| Release context check | `npm.cmd run release:check` |
| Guarded release | `npm.cmd run release:guarded` |

## Cloud Function Workflow

Main cloud functions:

| Function | Responsibility |
| --- | --- |
| `user` | Login, user profile, settings, WeChat profile sync |
| `habit` | Habit CRUD, check-in, undo check-in, freeze days, reorder, archive |
| `board` | Board notes, checklists, tags, pinning, batch position updates |
| `ritual` | Ritual CRUD, execution, linked habit check-ins |
| `journey` | Preset journeys, user journeys, step completion |
| `stats` | Heatmap, streaks, weekly comparison |
| `ai` | Habit insights and recommendations |
| `notify` | Subscription message reminders |
| `backfill-streaks` | One-time streak backfill utility; not part of the default `cloudbaserc.json` deployment list |

Common commands:

```bash
npm.cmd run cf:deps
npm.cmd run cf:list
npm.cmd run cf:list:changed
npm.cmd run cf:deploy:changed
npm.cmd run cf:deploy:one -- habit
npm.cmd run cf:deploy:all
```

Deployment notes:

- All `cf:deploy:*` npm scripts run `cf:sync:shared` first.
- If you bypass npm scripts and call `tcb` directly, run `npm.cmd run cf:sync:shared` manually first.
- `deploy:cloud:all` is the broader cloud pipeline: install function dependencies, sync shared modules, deploy functions, sync to build output, fix config, and prepare the DevTools project.
- See [`docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md) for the full workflow.

## Quality and CI

The repository has four quality layers:

| Layer | Coverage |
| --- | --- |
| Type checks | `vue-tsc --noEmit` and `tsc -p cloudfunctions/tsconfig.json` |
| Unit tests | Jest covers cloud functions, stores, and component/page contracts |
| Preflight | `scripts/preflight-check.ps1` checks key engineering constraints |
| Repo safety | `check:hygiene` and `check:repo-safety` check debug traces, private files, and public-repo risks |

CI lives in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and runs on push and pull request targeting `main`:

```bash
npm ci
npm run build:cloudfunctions:ts
npm run typecheck
npx jest
```

Before local handoff or release, run:

```bash
npm.cmd run check:gate
```

## Release Workflow

Release prerequisites:

- HBuilderX has rebuilt `mp-weixin`.
- `env:list` confirms the target environment.
- Local private key, real `appid` / `envId`, and subscription template ID are ready.
- The worktree is clean. `release:check` rejects dirty worktrees.

Recommended sequence:

```bash
npm.cmd run env:list
npm.cmd run check:gate
npm.cmd run release:check
npm.cmd run release:guarded
```

`release:guarded` performs cleanup, quality gates, release context checks, WeChat Mini Program upload, and then attempts to write:

- `*.release-manifest.json`
- `*.rollback-manifest.json`

After upload, WeChat backend work is still required: experience-version validation, audit submission, and formal release. Before a production release, run device and first-user acceptance against [`docs/ACCEPTANCE_TEST_CHECKLIST.md`](docs/ACCEPTANCE_TEST_CHECKLIST.md) and [`docs/PROD_RELEASE_MINIMUM_CHECKLIST.md`](docs/PROD_RELEASE_MINIMUM_CHECKLIST.md).

Current rollback support is a traceable rollback anchor, not a fully automated rollback platform. Mini Program rollback is handled in the WeChat backend. Cloud function rollback means restoring the target function directory from a target commit and redeploying it.

## Data, Safety, and Time Rules

- User data is scoped by WeChat `OPENID`; cloud functions return permission errors for cross-user access.
- Habit, ritual, board, and profile UGC write paths call WeChat content safety checks.
- The frontend classifies cloud-call errors in `services/cloud.ts`, including offline, permission, unavailable function, and business errors.
- Dates and times use UTC+8 semantics. `getToday()`, check-ins, freeze days, reminder windows, and statistics are centered on Beijing time.
- Public-repo safety is maintained by `.gitignore`, `check-public-repo-safety.ps1`, and the release guard.

## Document Map

| Document | Purpose |
| --- | --- |
| [`docs/PROJECT_STRUCTURE_OVERVIEW.md`](docs/PROJECT_STRUCTURE_OVERVIEW.md) | Directories, pages, state layer, service layer, release folders |
| [`docs/ENGINEERING_GOVERNANCE_HANDOFF.md`](docs/ENGINEERING_GOVERNANCE_HANDOFF.md) | Current governance status, stable boundaries, next engineering topics |
| [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md) | Release execution guide |
| [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md) | Release chain boundaries, env sources, guard coverage, rollback entrypoints |
| [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md) | Named environments, statuses, current limitations |
| [`docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md) | Cloud function CLI deployment flow |
| [`docs/ACCEPTANCE_TEST_CHECKLIST.md`](docs/ACCEPTANCE_TEST_CHECKLIST.md) | Pre-release happy path, error path, and experience acceptance |
| [`docs/PROD_RELEASE_MINIMUM_CHECKLIST.md`](docs/PROD_RELEASE_MINIMUM_CHECKLIST.md) | Minimum checklist before pushing to a real production release |
| [`docs/HOME_INDEX_HANDOFF.md`](docs/HOME_INDEX_HANDOFF.md) | Home page maintenance boundaries |
| [`docs/TIMELINE_INDEX_HANDOFF.md`](docs/TIMELINE_INDEX_HANDOFF.md) | Timeline maintenance boundaries |
| [`releases/README.md`](releases/README.md) | Release / rollback manifest directory guide |

## Known Limits

- `staging` and `prod` in public tracked config are not directly usable real environments yet.
- The HBuilderX `mp-weixin` build is not wrapped by an npm script; it must be run manually before release.
- Structured release / rollback manifests record rollback anchors but do not execute automatic rollback.
- WeChat experience version, audit, formal release, and version rollback remain manual backend operations.
- GitHub remote state, Notion retrospectives, and local docs can provide context, but repository facts are defined by versioned config, scripts, and source code.
