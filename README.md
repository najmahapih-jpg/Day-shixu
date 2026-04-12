# Day时序

微信小程序习惯追踪与成长工具。当前仓库已经从“能跑、能用”推进到“可维护、可交接、可追溯”的阶段，主线工作不再是页面大拆或云函数大改，而是把发布与交接层补到工程化可接手状态。

## 当前阶段

- 云函数 TypeScript 化：阶段性收官
- 首页治理线：阶段性收官
- timeline 治理线：阶段性收官
- 发布链正规化第一刀：已完成
- 环境分层第二刀：已完成
- 结构化发布记录 / 回滚记录第一刀：已完成
- `staging` / `prod`：仍然保留为命名环境，但状态是 `UNCONFIGURED`

这意味着：

- 当前仓库已经可维护
- 现阶段最重要的是守住边界、保持入口清晰、让发布过程可追溯
- 现在不应该顺手把范围再扩大到页面结构重建、路由重组、store 契约重写或云函数新一轮治理

## 项目是什么

产品形态是微信小程序，围绕“每日习惯、仪式执行、旅程推进、灵感记录、时间线回看”展开。仓库同时包含前端页面、Pinia 状态层、服务封装、云函数、发布脚本和交接文档。

## 技术栈

| 维度 | 说明 |
| --- | --- |
| 前端框架 | `uni-app` + `Vue 3 Composition API` |
| 语言 | `TypeScript` + `JavaScript` |
| 样式 | `SCSS` |
| 状态管理 | `Pinia` |
| 云端 | 微信云开发 / CloudBase |
| 目标端 | 微信小程序（`mp-weixin`） |
| 发布上传 | `miniprogram-ci` |
| Node 版本 | `18.x` |

## 第一次接手时先做什么

1. 安装依赖：`npm install`
2. 先确认工程状态：`npm run typecheck`
3. 跑基础测试：`npx.cmd jest --runInBand`
4. 看当前环境状态：`npm run env:list`
5. 再按下面的文档导航进入对应专项

如果你要做发布相关工作，不要直接从脚本猜流程，先读：

1. [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md)
2. [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md)
3. [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md)
4. [`releases/README.md`](releases/README.md)

## 常用命令

### 工程验证

```bash
npm.cmd run build:cloudfunctions:ts
npm.cmd run typecheck
npx.cmd jest --runInBand
powershell -ExecutionPolicy Bypass -File ./scripts/preflight-check.ps1
powershell -ExecutionPolicy Bypass -File ./scripts/check-hygiene.ps1
```

### 环境与发布

```bash
npm.cmd run env:list
npm.cmd run env:use -- -Name dev
npm.cmd run release:check
npm.cmd run release:record:dry -- --Version 1.0.0 --Desc "dry run"
npm.cmd run release:guarded
```

说明：

- `env:use` 是唯一推荐的命名环境切换入口
- `release:check` 只做 guard，不做上传
- `release:guarded` 会走清理、质量门禁、发布 guard，并在上传成功后尝试写入结构化发布记录

### 云函数

```bash
npm.cmd run cf:deps
npm.cmd run cf:sync:shared
npm.cmd run cf:deploy:all
npm.cmd run cf:deploy:one -- habit
npm.cmd run cf:deploy:changed
```

### 小程序构建准备

```bash
npm.cmd run fix:mp-config
npm.cmd run prepare:devtools
npm.cmd run prepare:wechat
```

## 发布 / 环境入口

当前发布链的正式入口分工如下：

- 发布操作说明：[`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md)
- 发布边界与 guard 说明：[`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md)
- 环境命名与状态说明：[`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md)
- 结构化发布记录目录：[`releases/README.md`](releases/README.md)

当前已落地的发布记录字段至少包括：

- 版本号
- 环境名
- `envId`
- `appid`
- `branch`
- `commit`
- 时间戳
- 回滚锚点（同环境上一条已记录发布）

## 核心文档导航

| 文档 | 作用 |
| --- | --- |
| [`README.md`](README.md) | 正式总入口：项目状态、常用命令、文档导航、稳定边界 |
| [`docs/PROJECT_STRUCTURE_OVERVIEW.md`](docs/PROJECT_STRUCTURE_OVERVIEW.md) | 仓库地图：目录、页面、状态层、服务层、发布目录 |
| [`docs/ENGINEERING_GOVERNANCE_HANDOFF.md`](docs/ENGINEERING_GOVERNANCE_HANDOFF.md) | 工程治理交接：哪些治理线已收官、哪些边界不要随意打破 |
| [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md) | 发布执行手册 |
| [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md) | 发布链 handoff：来源、guard、记录、回滚入口 |
| [`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md) | 环境命名、状态与限制 |
| [`docs/ACCEPTANCE_TEST_CHECKLIST.md`](docs/ACCEPTANCE_TEST_CHECKLIST.md) | 发布前验收清单 |
| [`docs/HOME_INDEX_HANDOFF.md`](docs/HOME_INDEX_HANDOFF.md) | 首页维护边界 |
| [`docs/TIMELINE_INDEX_HANDOFF.md`](docs/TIMELINE_INDEX_HANDOFF.md) | timeline 维护边界 |
| [`docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md`](docs/CLOUDFUNCTIONS_CLI_WORKFLOW.md) | 云函数 CLI 工作流 |

## 当前稳定边界

### 业务与结构

- 不改业务语义
- 不改路由结构
- 不改 store 契约
- 不顺手启动新一轮页面拆分或云函数治理

### 发布与环境

- `dev` 是当前唯一可直接使用的 `READY` 环境
- `staging` / `prod` 只是保留命名，不代表已经可发布
- 不要手工让 `cloudbaserc.json`、`utils/cloudEnv.ts`、`project.config.json` 漂移
- 不要跳过 `release:check`

### 本地私有文件

以下内容不应作为仓库事实来源：

- `project.private.config.json`
- `.wxci/private.<appid>.key`
- 可选的 `config/release-environments.local.json`
- 本地运行态目录如 `.omx/`

## 当前最自然的下一轮工程课题

如果继续推进工程化，最自然的下一刀不是页面重构，而是：

1. 给 `staging` / `prod` 补齐真实配置并完成受控启用
2. 在结构化 release record 基础上继续补“环境级审批 / 回滚演练 / 发布状态流转”

在这之前，不建议重新打开首页、timeline 或云函数的大范围治理议题。
