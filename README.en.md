[Chinese](README.md) | [English](README.en.md)

# Day时序

A WeChat Mini Program for personal growth tracking. It brings habits, rituals, journeys, inspiration notes, and weekly review into one timeline. This repository contains the frontend, cloud functions, release scripts, and handoff docs.

## Quick Links

| Goal | Start Here |
| --- | --- |
| Understand scope | [Core Modules](#core-modules) |
| Check stack and layout | [Engineering Facts](#engineering-facts) |
| Run locally | [Getting Started](#getting-started) |
| Release or inspect envs | [Release Cheatsheet](#release-cheatsheet) |
| Find docs | [Document Map](#document-map) |

## Core Modules

| Module | Scope |
| --- | --- |
| Habits | Create habits, check in, track streaks, use freeze days |
| Board | Text and checklist notes with content safety checks |
| Rituals | Timed ritual runs linked to habits, with batch check-in |
| Journeys | Preset steps, progress, completion celebration |
| Timeline | Monthly calendar for historical check-ins |
| AI Insights | Weekly comparison and improvement suggestions |
| Stats | Heatmap, streaks, weekly comparison |

## Project Status

- `dev` is the only `READY` environment; `staging` and `prod` are reserved names.
- Release and rollback manifests are recorded for traceability.
- Public files keep placeholder `envId` / `appid` values; real local values belong in ignored config.

## Engineering Facts

| Item | Details |
| --- | --- |
| Target | WeChat Mini Program `mp-weixin`; main package pages are `pages/index`, `pages/timeline`, `pages/board`, `pages/profile` |
| Local runtime | Node `18.x` + npm; release and DevTools prep scripts run through PowerShell |
| Frontend | `uni-app`, `Vue 3 Composition API`, `Pinia`, `SCSS` |
| Cloud | WeChat Cloud Development / CloudBase; functions live in `cloudfunctions/`, shared code in `cloudfunctions/_shared/` |
| Quality gate | `typecheck` covers frontend and cloud functions; `jest` covers frontend and cloud-function tests; CI lives in `.github/workflows/ci.yml` |
| Release chain | `miniprogram-ci` uploads; `release:guarded` runs cleanup, quality gates, release guard, then writes release / rollback manifests |
| Private config | Real environment values belong in ignored `config/release-environments.local.json` |

## Getting Started

```bash
npm install
npm.cmd run typecheck
npx.cmd jest --runInBand
npm.cmd run env:list
```

For local release config, copy `config/release-environments.local.example.json` to `config/release-environments.local.json` and fill in real values. Release scripts prefer the local override.

## Release Cheatsheet

| Scenario | Commands / Docs |
| --- | --- |
| Engineering checks | `npm.cmd run build:cloudfunctions:ts`, `npm.cmd run typecheck`, `npx.cmd jest --runInBand` |
| Repo safety | `npm.cmd run check:hygiene`, `npm.cmd run check:repo-safety` |
| Environments | `npm.cmd run env:list`, `npm.cmd run env:use -- -Name dev` |
| Release guard | `npm.cmd run release:check` |
| Guarded release | `npm.cmd run release:guarded` |
| Cloud functions | `npm.cmd run cf:deps`, `npm.cmd run cf:deploy:changed`, `npm.cmd run cf:deploy:one -- habit` |
| Mini Program prep | `npm.cmd run fix:mp-config`, `npm.cmd run prepare:wechat` |

Read before release work: [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md), [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md), [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md), [`docs/PROD_RELEASE_MINIMUM_CHECKLIST.md`](docs/PROD_RELEASE_MINIMUM_CHECKLIST.md).

## Document Map

| Document | Purpose |
| --- | --- |
| [`docs/PROJECT_STRUCTURE_OVERVIEW.md`](docs/PROJECT_STRUCTURE_OVERVIEW.md) | Directories, pages, state, services, release folders |
| [`docs/ENGINEERING_GOVERNANCE_HANDOFF.md`](docs/ENGINEERING_GOVERNANCE_HANDOFF.md) | Engineering governance handoff |
| [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md) | Release execution guide |
| [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md) | Release facts, records, rollback entrypoints, public-repo boundaries |
| [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md) | Environment names, status, limitations |
| [`docs/ACCEPTANCE_TEST_CHECKLIST.md`](docs/ACCEPTANCE_TEST_CHECKLIST.md) | Pre-release acceptance |
| [`docs/HOME_INDEX_HANDOFF.md`](docs/HOME_INDEX_HANDOFF.md) | Home page maintenance boundaries |
| [`docs/TIMELINE_INDEX_HANDOFF.md`](docs/TIMELINE_INDEX_HANDOFF.md) | Timeline maintenance boundaries |
| [`docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md) | Cloud function CLI flow |
