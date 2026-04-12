[中文](README.md) | [English](README.en.md)

# Day时序

Day时序是一个微信小程序项目，聚焦习惯追踪、仪式执行、旅程推进、灵感记录与时间线回看。当前仓库已经具备可维护、可交接、可追溯的工程化程度，适合继续日常维护、发布和小范围演进。

## 当前工程化程度

- 当前前端、云函数、发布脚本和交接文档都已纳入同一仓库维护
- 当前具备类型检查、测试入口、发布 guard、命名环境和结构化发布记录
- 当前发布链支持 release / rollback manifest 的记录与追溯
- 当前只有 `dev` 是可直接使用的 `READY` 环境
- 当前 `staging` / `prod` 仍保留为命名环境，但尚未配置为真实可发布目标

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

## 第一次接手先做什么

1. 安装依赖：`npm install`
2. 检查类型：`npm.cmd run typecheck`
3. 跑基础测试：`npx.cmd jest --runInBand`
4. 看环境状态：`npm.cmd run env:list`
5. 再按下面的文档导航进入对应专项

如果你要接手发布相关工作，建议按这个顺序读：

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
npm.cmd run check:repo-safety
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

- `env:use` 是推荐的命名环境切换入口
- `release:check` 只做 guard，不做上传
- `release:guarded` 会执行清理、质量门禁、发布 guard，并在上传成功后尝试写入结构化发布记录

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

## 发布与环境入口

当前发布与环境入口分工如下：

- 发布操作说明：[`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md)
- 发布事实、回滚锚点与公开仓库安全边界：[`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md)
- 环境命名与状态说明：[`docs/ENVIRONMENT_LAYERING.md`](docs/ENVIRONMENT_LAYERING.md)
- 结构化发布记录目录：[`releases/README.md`](releases/README.md)

当前结构化发布记录至少固定以下字段：

- 版本号
- 环境名
- `envId`
- `appid`
- `branch`
- `commit`
- 时间戳
- 回滚锚点

## 核心文档导航

| 文档 | 作用 |
| --- | --- |
| [`README.md`](README.md) | 中文总入口：项目状态、命令、导航、边界 |
| [`README.en.md`](README.en.md) | English overview and maintainer entrypoint |
| [`docs/PROJECT_STRUCTURE_OVERVIEW.md`](docs/PROJECT_STRUCTURE_OVERVIEW.md) | 仓库地图：目录、页面、状态层、服务层、发布目录 |
| [`docs/ENGINEERING_GOVERNANCE_HANDOFF.md`](docs/ENGINEERING_GOVERNANCE_HANDOFF.md) | 工程治理交接：稳定边界与后续课题 |
| [`docs/RELEASE_GUIDE.md`](docs/RELEASE_GUIDE.md) | 发布执行手册 |
| [`docs/RELEASE_HANDOFF.md`](docs/RELEASE_HANDOFF.md) | 发布链事实、记录、回滚与公开仓库安全边界 |
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
- 不要让 `cloudbaserc.json`、`utils/cloudEnv.ts`、`project.config.json` 漂移
- 不要跳过 `release:check`

### 本地私有文件

以下内容不应作为仓库事实来源：

- `project.private.config.json`
- `.wxci/private.<appid>.key`
- 可选的 `config/release-environments.local.json`
- 本地运行态目录如 `.omx/`

## 如果未来继续，最自然的下一步是什么

如果未来继续推进工程化，最自然的下一步不是页面重构，而是：

1. 给 `staging` / `prod` 补齐真实配置并完成受控启用
2. 在结构化 release record 基础上继续补环境级审批、回滚演练和发布状态流转

在这之前，不建议重新打开首页、timeline 或云函数的大范围治理议题。
