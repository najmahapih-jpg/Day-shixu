[中文](README.md) | [English](README.en.md)

# Day时序

微信小程序，面向个人成长记录。它把习惯、仪式、旅程、灵感和复盘放在同一条时间线上。当前仓库同时维护前端、云函数、发布脚本和交接文档。

## 快速入口

| 目标 | 入口 |
| --- | --- |
| 看功能范围 | [核心模块](#核心模块) |
| 本地验证 | [快速上手](#快速上手) |
| 发版与环境 | [发布速查](#发布速查) |
| 找代码和文档 | [文档地图](#文档地图) |

## 核心模块

| 模块 | 内容 |
| --- | --- |
| 习惯 | 创建、打卡、连续天数、冻结日 |
| 灵感板 | 文本和清单笔记，带内容安全检查 |
| 仪式 | 计时执行，关联习惯并支持批量打卡 |
| 旅程 | 预设步骤、进度推进、完成庆祝 |
| 时间轴 | 月历回看历史打卡 |
| AI 洞察 | 周对比分析和改进建议 |
| 统计 | 热力图、连续天数、周对比 |

## 项目状态

- `dev` 是当前唯一 `READY` 环境；`staging` / `prod` 只是预留命名。
- 发布链会记录 release / rollback manifest，便于追溯。
- 公开仓库只保留占位 `envId` / `appid`；真实值放在被忽略的 `config/release-environments.local.json`。
- 栈：`uni-app`、`Vue 3 Composition API`、`Pinia`、`SCSS`、微信云开发 / CloudBase、`miniprogram-ci`、Node `18.x`。

## 快速上手

```bash
npm install
npm.cmd run typecheck
npx.cmd jest --runInBand
npm.cmd run env:list
```

本地发布配置可从 `config/release-environments.local.example.json` 复制，再写入真实环境值。发布脚本会优先读取本地 override。

## 发布速查

| 场景 | 命令 / 文档 |
| --- | --- |
| 工程验证 | `npm.cmd run build:cloudfunctions:ts`、`npm.cmd run typecheck`、`npx.cmd jest --runInBand` |
| 仓库安全 | `npm.cmd run check:hygiene`、`npm.cmd run check:repo-safety` |
| 环境切换 | `npm.cmd run env:list`、`npm.cmd run env:use -- -Name dev` |
| 发布检查 | `npm.cmd run release:check` |
| 受控发布 | `npm.cmd run release:guarded` |
| 云函数 | `npm.cmd run cf:deps`、`npm.cmd run cf:deploy:changed`、`npm.cmd run cf:deploy:one -- habit` |
| 小程序准备 | `npm.cmd run fix:mp-config`、`npm.cmd run prepare:wechat` |

发布前先读：[`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md)、[`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md)、[`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md)、[`docs/PROD_RELEASE_MINIMUM_CHECKLIST.md`](docs/PROD_RELEASE_MINIMUM_CHECKLIST.md)。

## 文档地图

| 文档 | 用途 |
| --- | --- |
| [`docs/PROJECT_STRUCTURE_OVERVIEW.md`](docs/PROJECT_STRUCTURE_OVERVIEW.md) | 目录、页面、状态层、服务层、发布目录 |
| [`docs/ENGINEERING_GOVERNANCE_HANDOFF.md`](docs/ENGINEERING_GOVERNANCE_HANDOFF.md) | 工程治理交接 |
| [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md) | 发布执行手册 |
| [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md) | 发布事实、记录、回滚入口和公开仓库边界 |
| [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md) | 环境命名、状态和限制 |
| [`docs/ACCEPTANCE_TEST_CHECKLIST.md`](docs/ACCEPTANCE_TEST_CHECKLIST.md) | 发版前验收 |
| [`docs/HOME_INDEX_HANDOFF.md`](docs/HOME_INDEX_HANDOFF.md) | 首页维护边界 |
| [`docs/TIMELINE_INDEX_HANDOFF.md`](docs/TIMELINE_INDEX_HANDOFF.md) | timeline 维护边界 |
| [`docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md) | 云函数 CLI 流程 |
